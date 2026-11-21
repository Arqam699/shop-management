const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Customer = require('../models/Customer');
const Installment = require('../models/Installment');
const Expense = require('../models/Expense');


// ============================================================
// HELPER: CALCULATE DATE BOUNDARIES
// ============================================================
const getDateRanges = () => {
  // Store dates as UTC instants, but calculate the calendar boundaries in
  // Pakistan Standard Time (UTC+05:00) regardless of the server's timezone.
  const nowInPakistan = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const year = nowInPakistan.getUTCFullYear();
  const month = nowInPakistan.getUTCMonth();
  const day = nowInPakistan.getUTCDate();
  const pakistanMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - 5 * 60 * 60 * 1000);
  const today = pakistanMidnight(year, month, day);
  const tomorrow = pakistanMidnight(year, month, day + 1);
  const startOfWeek = pakistanMidnight(year, month, day - nowInPakistan.getUTCDay());
  const startOfMonth = pakistanMidnight(year, month, 1);

  return {
    today,
    tomorrow,
    endOfToday: new Date(tomorrow.getTime() - 1),
    startOfWeek,
    startOfMonth,
  };
};


// ============================================================
// GET DASHBOARD STATS
//
// @desc    Get complete real-time KPIs, active financing,
//          expenses, profit and inventory intelligence
//
// @route   GET /api/reports/dashboard
// @access  Private
// ============================================================
const getDashboardStats = async (
  req,
  res
) => {
  try {

    const {
      today,
      tomorrow,
      endOfToday,
      startOfWeek,
      startOfMonth,
    } = getDateRanges();


    // ========================================================
    // CURRENT SHOP
    // ========================================================

    const shopId =
      req.shopId;


    // ========================================================
    // 1. INVENTORY KPIs
    // ========================================================

    const [
      products,
      totalCustomers,
    ] = await Promise.all([
      Product.find({
        shopId,
      })
        .select(
          '_id name model quantity purchasePrice salePrice sellingPrice minStockLevel status'
        )
        .lean(),

      Customer.countDocuments({
        shopId,
      }),
    ]);

    const totalProducts = products.length;
    const lowStockCount = products.reduce(
      (count, product) => count + (product.status === 'Low Stock' ? 1 : 0),
      0
    );
    const outOfStockCount = products.reduce(
      (count, product) => count + (product.status === 'Out of Stock' ? 1 : 0),
      0
    );


    const totalStockQuantity =
      products.reduce(
        (
          sum,
          product
        ) =>
          sum +
          Number(
            product.quantity || 0
          ),
        0
      );


    const inventoryCostValue =
      products.reduce(
        (
          sum,
          product
        ) =>
          sum +
          (
            Number(
              product.purchasePrice || 0
            ) *
            Number(
              product.quantity || 0
            )
          ),
        0
      );


    // ========================================================
    // 2. RAW LISTS
    // ========================================================

    const [
      salesList,
      allFinancingPlans,
      allPaymentsList,
      expensesList,
    ] = await Promise.all([

      // ------------------------------------------------------
      // SALES
      // ------------------------------------------------------
      Sale.find({
        shopId,
        book: null,
      })
        .populate('customer', 'fullName mobileNumber cnic fatherName address city')
        .populate('product', 'name brand category model serialNumber imei chassisNumber engineNumber purchasePrice')
        .sort({
          createdAt: 1,
        })
        .lean(),


      // ------------------------------------------------------
      // INSTALLMENT PLANS
      // ------------------------------------------------------
      InstallmentPlan.find({
        shopId,
      })
        .populate('customer', 'fullName mobileNumber mobile cnic')
        .populate('product', 'name model')
        .populate('sale', 'saleId book')
        .sort({
          createdAt: 1,
        })
        .lean(),


      // ------------------------------------------------------
      // PAYMENTS
      // ------------------------------------------------------
      Payment.find({
        shopId,
        isArchived: {
          $ne: true,
        },
      })
        .populate('customer', 'fullName mobileNumber')
        .populate('sale', 'saleId book')
        .populate('installmentPlan', 'planId')
        .populate('installment', 'installmentNumber')
        .sort({
          createdAt: 1,
        })
        .lean(),


      // ------------------------------------------------------
      // EXPENSES
      // ------------------------------------------------------
      Expense.find({
        shopId,
      })
        .sort({
          createdAt: 1,
        })
        .lean(),


    ]);

    // A sale assigned to a book belongs to Book Wise Audit, not the live
    // dashboard. Keep its invoice, payments, and customer history untouched.
    const auditPlanIds = allFinancingPlans
      .filter((plan) => Boolean(plan.sale?.book))
      .map((plan) => plan._id);
    const activeFinancingList = allFinancingPlans.filter((plan) => !plan.sale?.book);
    const paymentsList = allPaymentsList.filter((payment) => !payment.sale?.book);


    // ========================================================
    // 3. INVENTORY INTELLIGENCE
    //
    // Uses the existing products + sales data.
    //
    // 30 day movement is used to identify:
    //
    // Fast Moving
    // Slow / No Sales
    // Stock At Risk
    // ========================================================

    const inventoryIntelligenceMap =
      new Map();


    // --------------------------------------------------------
    // CREATE PRODUCT MAP
    // --------------------------------------------------------

    for (
      const product of products
    ) {

      const productId =
        product._id?.toString();

      if (
        !productId
      ) {
        continue;
      }


      inventoryIntelligenceMap.set(
        productId,
        {
          productId,

          name:
            product.name ||
            'Unnamed Product',

          model:
            product.model ||
            'N/A',

          stock:
            Number(
              product.quantity || 0
            ),

          purchasePrice:
            Number(
              product.purchasePrice || 0
            ),

          sellingPrice:
            Number(
              product.sellingPrice || product.salePrice || 0
            ),

          minStockLevel: Number(product.minStockLevel || 0),

          soldQuantity:
            0,

          soldQuantity30Days:
            0,

          soldQuantity7Days: 0,

          soldQuantityPrevious30Days: 0,

          salesCount:
            0,

          salesCount30Days:
            0,

          revenue30Days:
            0,
        }
      );
    }


    // --------------------------------------------------------
    // 30 DAYS DATE
    // --------------------------------------------------------

    const inventory30DaysStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inventory7DaysStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inventoryPrevious30DaysStart = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);


    // --------------------------------------------------------
    // CALCULATE PRODUCT MOVEMENT
    // --------------------------------------------------------

    for (
      const sale of salesList
    ) {

      const productId =
        sale.product?._id?.toString() ||
        sale.product?.toString();


      if (
        !productId
      ) {
        continue;
      }


      const productData =
        inventoryIntelligenceMap.get(
          productId
        );


      if (
        !productData
      ) {
        continue;
      }


      const quantitySold =
        Number(
          sale.quantity || 0
        );


      if (
        quantitySold <= 0
      ) {
        continue;
      }


      productData.soldQuantity +=
        quantitySold;


      productData.salesCount +=
        1;


      const saleDate =
        new Date(
          sale.saleDate ||
          sale.createdAt
        );


      if (
        !Number.isNaN(
          saleDate.getTime()
        ) &&
        saleDate >=
          inventory30DaysStart
      ) {

        productData.soldQuantity30Days +=
          quantitySold;

        productData.salesCount30Days +=
          1;

        productData.revenue30Days +=
          Number(
            sale.finalTotal || sale.subtotal || 0
          );

        if (saleDate >= inventory7DaysStart) {
          productData.soldQuantity7Days += quantitySold;
        }
      } else if (
        !Number.isNaN(saleDate.getTime()) &&
        saleDate >= inventoryPrevious30DaysStart
      ) {
        productData.soldQuantityPrevious30Days += quantitySold;
      }
    }


    // --------------------------------------------------------
    // BUILD PRODUCT INTELLIGENCE
    // --------------------------------------------------------

    const intelligenceProducts =
      Array.from(
        inventoryIntelligenceMap.values()
      ).map(
        product => {

          const stock =
            Number(
              product.stock || 0
            );


          const sold30 =
            Number(
              product.soldQuantity30Days ||
              0
            );


          const stockValue =
            stock *
            Number(
              product.purchasePrice || 0
            );


          // --------------------------------------------------
          // Average daily sales
          // --------------------------------------------------

          const averageDailySales =
            sold30 / 30;

          const averageDailySales7Days =
            Number(product.soldQuantity7Days || 0) / 7;
          const previousDailySales =
            Number(product.soldQuantityPrevious30Days || 0) / 30;
          const salesTrendPercent = previousDailySales > 0
            ? Math.round(((averageDailySales7Days - previousDailySales) / previousDailySales) * 100)
            : (averageDailySales7Days > 0 ? null : 0);
          const minStockLevel = Number(product.minStockLevel || 0);
          const reorderTarget = Math.max(minStockLevel, Math.ceil(averageDailySales * 30));
          const suggestedReorderQuantity = Math.max(0, reorderTarget - stock);


          // --------------------------------------------------
          // Estimated stock coverage
          //
          // How many days current stock can survive
          // based on last 30 days movement.
          // --------------------------------------------------

          let stockCoverageDays =
            null;


          if (
            averageDailySales > 0
          ) {

            stockCoverageDays =
              Math.round(
                stock /
                averageDailySales
              );
          }


          // --------------------------------------------------
          // STATUS
          // --------------------------------------------------

          let movementStatus =
            'No Sales';


          if (
            sold30 >= 10
          ) {

            movementStatus =
              'Fast Moving';

          } else if (
            sold30 >= 3
          ) {

            movementStatus =
              'Moving';

          } else if (
            sold30 > 0
          ) {

            movementStatus =
              'Slow Moving';
          }


          // --------------------------------------------------
          // STOCK RISK
          //
          // Risk when:
          //
          // 1. Product is already out of stock
          // 2. Stock is low
          // 3. Product is selling quickly and has
          //    limited coverage
          // 4. Product has stock but no sales for 30 days
          // --------------------------------------------------

          let stockRisk =
            'Normal';


          if (
            stock <= 0
          ) {

            stockRisk =
              'Out of Stock';

          } else if (
            stock <= minStockLevel &&
            sold30 > 0
          ) {

            stockRisk =
              'Critical';

          } else if (
            stockCoverageDays !== null &&
            stockCoverageDays <= 14
          ) {

            stockRisk =
              'High';

          } else if (
            stock > 0 &&
            sold30 === 0
          ) {

            stockRisk =
              'Dead Stock';

          } else if (
            stockCoverageDays !== null &&
            stockCoverageDays <= 30
          ) {

            stockRisk =
              'Medium';
          }


          return {

            ...product,

            stock,

            soldQuantity:
              Number(
                product.soldQuantity || 0
              ),

            soldQuantity30Days:
              sold30,

            soldQuantity7Days: Number(product.soldQuantity7Days || 0),
            soldQuantityPrevious30Days: Number(product.soldQuantityPrevious30Days || 0),
            salesTrendPercent,
            minStockLevel,
            suggestedReorderQuantity,
            deadStockValue: sold30 === 0 && stock > 0 ? stockValue : 0,

            salesCount:
              Number(
                product.salesCount || 0
              ),

            salesCount30Days:
              Number(
                product.salesCount30Days || 0
              ),

            revenue30Days:
              Number(
                product.revenue30Days || 0
              ),

            stockValue,

            averageDailySales:

              Number(
                averageDailySales.toFixed(
                  2
                )
              ),

            stockCoverageDays,

            movementStatus,

            stockRisk,
          };
        }
      );


    // ========================================================
    // FAST MOVING PRODUCTS
    //
    // Top 5 products according to 30-day quantity sold.
    // ========================================================

    const fastMovingProducts =
      intelligenceProducts
        .filter(
          product =>
            product.soldQuantity30Days > 0
        )
        .sort(
          (
            a,
            b
          ) =>
            b.soldQuantity30Days -
            a.soldQuantity30Days
        )
        .slice(
          0,
          5
        );


    // ========================================================
    // SLOW MOVING / NO SALES
    //
    // Products currently in stock but with very low/no
    // movement during the last 30 days.
    // ========================================================

    const slowMovingProducts =
      intelligenceProducts
        .filter(
          product =>
            product.stock > 0 &&
            product.soldQuantity30Days <= 2
        )
        .sort(
          (
            a,
            b
          ) => {

            if (
              a.soldQuantity30Days !==
              b.soldQuantity30Days
            ) {

              return (
                a.soldQuantity30Days -
                b.soldQuantity30Days
              );
            }

            return (
              b.stock -
              a.stock
            );
          }
        )
        .slice(
          0,
          5
        );


    // ========================================================
    // STOCK AT RISK
    // ========================================================

    const stockAtRiskProducts =
      intelligenceProducts
        .filter(
          product =>
            product.stock <= product.minStockLevel
        )
        .sort(
          (
            a,
            b
          ) => a.stock - b.stock
        )
        .slice(
          0,
          10
        );

    const reorderProducts = intelligenceProducts
      .filter(product => product.suggestedReorderQuantity > 0 && product.soldQuantity30Days > 0)
      .sort((a, b) => (a.stockCoverageDays ?? 0) - (b.stockCoverageDays ?? 0))
      .slice(0, 10);


    // ========================================================
    // INVENTORY INTELLIGENCE SUMMARY
    // ========================================================

    const fastMovingCount =
      intelligenceProducts.filter(
        product =>
          product.soldQuantity30Days >=
          10
      ).length;


    const slowMovingCount =
      intelligenceProducts.filter(
        product =>
          product.stock > 0 &&
          product.soldQuantity30Days <= 2
      ).length;


    const stockAtRiskCount =
      intelligenceProducts.filter(
        product =>
          product.stock <= product.minStockLevel
      ).length;


    const noSalesCount =
      intelligenceProducts.filter(
        product =>
          product.stock > 0 &&
          product.soldQuantity30Days === 0
      ).length;


    const totalInventoryRetailValue =
      intelligenceProducts.reduce(
        (
          sum,
          product
        ) =>
          sum +
          (
            product.stock *
            Number(
              product.sellingPrice || 0
            )
          ),
        0
      );


    const totalInventoryCostValue =
      intelligenceProducts.reduce(
        (
          sum,
          product
        ) =>
          sum +
          Number(
            product.stockValue || 0
          ),
        0
      );

    const deadStockValue = intelligenceProducts.reduce(
      (sum, product) => sum + Number(product.deadStockValue || 0), 0
    );


    const inventoryIntelligence = {

      analysisPeriodDays:
        30,

      totalInventoryRetailValue,

      totalInventoryCostValue,

      deadStockValue,

      fastMovingCount,

      slowMovingCount,

      stockAtRiskCount,

      noSalesCount,

      fastMovingProducts,

      slowMovingProducts,

      stockAtRiskProducts,

      reorderProducts,
    };


    // ========================================================
    // 4. URGENT DUE / OVERDUE INSTALLMENTS
    // ========================================================

    const urgentInstallments =
      await Installment.find({

        shopId,
        installmentPlan: { $nin: auditPlanIds },

        status: {
          $in: [
            'Pending',
            'Overdue',
            'Partially Paid',
          ],
        },

        dueDate: {
          $lte:
            endOfToday,
        },

      })
        .populate({
          path:
            'installmentPlan',

          populate: [
            {
              path:
                'customer',
              select:
                'fullName mobileNumber',
            },

            {
              path:
                'product',
              select:
                'name',
            },
          ],
        })
        .sort({
          dueDate: 1,
        })
        .limit(5)
        .lean();


    // ========================================================
    // 5. SALES PERIOD CALCULATIONS
    // ========================================================

    const [
      activePlans,
      overduePlans,
    ] = await Promise.all([
      // ------------------------------------------------------
      // ACTIVE PLANS
      // ------------------------------------------------------
      InstallmentPlan.countDocuments({
        shopId,
        status: 'Active',
        _id: { $nin: auditPlanIds },
      }),


      // ------------------------------------------------------
      // OVERDUE PLANS
      // ------------------------------------------------------
      InstallmentPlan.countDocuments({
        shopId,
        status: 'Overdue',
        _id: { $nin: auditPlanIds },
      }),


    ]);


    // ========================================================
    // 6. TOTAL SALES
    // ========================================================

    const totalSalesVal =
      salesList.reduce(
        (
          sum,
          sale
        ) =>
          sum +
          (
            sale.finalTotal ||
            0
          ),
        0
      );


    // ========================================================
    // TODAY SALES
    // ========================================================

    let todaySalesVal = 0;
    let weekSalesVal = 0;
    let monthSalesVal = 0;
    let todayCollectedPayments = 0;

    for (const sale of salesList) {
      const saleDate = new Date(sale.saleDate);
      const amount = Number(sale.finalTotal || 0);
      if (saleDate >= today && saleDate < tomorrow) todaySalesVal += amount;
      if (saleDate >= startOfWeek && saleDate < tomorrow) weekSalesVal += amount;
      if (saleDate >= startOfMonth && saleDate < tomorrow) monthSalesVal += amount;
    }

    for (const payment of paymentsList) {
      const paymentDate = new Date(payment.paymentDate);
      if (paymentDate >= today && paymentDate < tomorrow) {
        todayCollectedPayments += Number(payment.amount || 0);
      }
    }


    // ========================================================
    // WEEK SALES
    // ========================================================

    // ========================================================
    // 7. INSTALLMENT PLAN COUNTS
    // ========================================================

    const totalOutstandingAmount =
      activeFinancingList.reduce(
        (
          sum,
          plan
        ) =>
          sum +
          (
            plan.remainingBalance ||
            0
          ),
        0
      );


    // ========================================================
    // TODAY'S COLLECTED PAYMENTS
    // ========================================================

    // ========================================================
    // 8. PROFIT CALCULATOR
    // ========================================================

    let totalRevenue =
      0;

    let totalCostOfSold =
      0;


    for (
      const sale of salesList
    ) {

      // ------------------------------------------------------
      // Revenue
      // ------------------------------------------------------

      // Cash sales use finalTotal. For installment sales, totalWithMarkup is
      // the signed customer agreement amount and already includes markup once.
      // Falling back to finalTotal + markupAmount preserves older documents.
      const baseSaleAmount = Number(sale.finalTotal || 0);
      const markupAmount = Number(sale.markupAmount || 0);
      const installmentAgreementAmount = Number(sale.totalWithMarkup || 0);

      totalRevenue += sale.paymentType === 'Installment'
        ? (installmentAgreementAmount > 0
          ? installmentAgreementAmount
          : baseSaleAmount + markupAmount)
        : baseSaleAmount;


      // ------------------------------------------------------
      // Cost of sold products
      // ------------------------------------------------------

      if (
        sale.product
      ) {

        totalCostOfSold +=
          (
            sale.quantity ||
            0
          ) *
          (
            sale.product.purchasePrice ||
            0
          );
      }
    }


    // --------------------------------------------------------
    // Gross Profit
    // --------------------------------------------------------

    const grossProfit = totalRevenue - totalCostOfSold;


    // ========================================================
    // TOTAL EXPENSES
    // ========================================================

    const totalExpensesValue =
      expensesList.reduce(
        (
          sum,
          expense
        ) =>
          sum +
          (
            expense.amount ||
            0
          ),
        0
      );


    // --------------------------------------------------------
    // NET PROFIT
    // --------------------------------------------------------

    const netProfitValue =
      grossProfit -
      totalExpensesValue;


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      data: {

        // ====================================================
        // INVENTORY
        // ====================================================

        inventory: {

          totalProducts,

          totalStockQuantity,

          lowStockCount,

          outOfStockCount,

          inventoryCostValue,

          // ----------------------------------------------
          // INVENTORY INTELLIGENCE
          // ----------------------------------------------

          intelligence:
            inventoryIntelligence,
        },


        // ====================================================
        // CUSTOMERS
        // ====================================================

        customers: {

          totalCustomers,
        },


        // ====================================================
        // SALES
        // ====================================================

        sales: {

          todaySalesVal,

          weekSalesVal,

          monthSalesVal,

          totalSalesVal,

          salesList,
        },


        // ====================================================
        // INSTALLMENTS
        // ====================================================

        installments: {

          activePlans,

          overduePlans,

          totalOutstandingAmount,

          todayCollectedPayments,

          activeFinancingList,

          paymentsList,

          urgentInstallments,
        },


        // ====================================================
        // EXPENSES
        // ====================================================

        expenses: {

          totalExpensesValue,

          expensesList,
        },


        // ====================================================
        // PROFIT
        // ====================================================

        profit: {

          totalRevenue:
            totalRevenue,

          totalCost:
            totalCostOfSold,

          grossProfit,

          totalExpenses:
            totalExpensesValue,

          netProfit:
            netProfitValue,
        },
      },
    });

  } catch (error) {

    console.error(
      'Dashboard Stats Error:',
      error
    );

    return res.status(500).json({

      success: false,

      message:
        'Failed to compile dashboard metrics',

      error:
        error.message,
    });
  }
};


// ============================================================
// GET OVERALL INSTALLMENT INDEX RECORD
//
// @desc    Get one register row for each active installment plan
// @route   GET /api/reports/index-record
// @access  Private
// ============================================================
const getIndexRecord = async (
  req,
  res
) => {
  try {

    // ========================================================
    // CURRENT SHOP
    // ========================================================

    const shopId =
      req.shopId;


    const plans = await InstallmentPlan.find({
      shopId,
      status: { $in: ['Active', 'Overdue'] },
      remainingBalance: { $gt: 0 },
    }).populate([
      { path: 'customer' },
      { path: 'product' },
      { path: 'sale', populate: [{ path: 'customer' }, { path: 'product' }] },
    ]).sort({ createdAt: 1, _id: 1 });

    const planIds = plans.map((plan) => plan._id);
    const allInstallments = planIds.length
      ? (await Installment.find({ shopId, installmentPlan: { $in: planIds } })
        .sort({ installmentNumber: 1, dueDate: 1 }))
        .filter((item) => {
          const plan = plans.find((row) => String(row._id) === String(item.installmentPlan));
          return plan && Number(item.revisionNumber || 0) === Number(plan.revisionNumber || 0) && item.isArchived !== true;
        })
      : [];
    const byPlan = new Map();
    allInstallments.forEach((item) => {
      const id = item.installmentPlan?.toString();
      if (!id) return;
      if (!byPlan.has(id)) byPlan.set(id, []);
      byPlan.get(id).push(item);
    });

    const rows = plans.map((plan, index) => {
      const scheduled = byPlan.get(plan._id.toString()) || [];
      const unpaid = scheduled.filter((item) =>
        !['Paid', 'Settled'].includes(item.status) &&
        Number(item.remainingAmount ?? item.amount ?? 0) > 0
      );
      const next = unpaid[0] || null;
      const endOfCurrentMonth = new Date();
      endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1, 0);
      endOfCurrentMonth.setHours(23, 59, 59, 999);
      const dueOrPartPaid = unpaid.filter((item) =>
        Number(item.paidAmount || 0) > 0 ||
        (item.dueDate && new Date(item.dueDate) <= endOfCurrentMonth)
      );
      const installmentBreakdown = (dueOrPartPaid.length ? dueOrPartPaid : next ? [next] : []).map((item) => ({
        installmentNumber: Number(item.installmentNumber),
        amount: Number(item.amount || item.originalAmount || 0),
        remainingAmount: Number(item.remainingAmount ?? Math.max(0, Number(item.amount || item.originalAmount || 0) - Number(item.paidAmount || 0))),
      }));
      const totalInstallments = Number(
        plan.selectedDuration || plan.invoiceSnapshot?.selectedDuration ||
        scheduled.length || plan.duration || 0
      );
      const customer = plan.customer || plan.sale?.customer || {};
      const sale = plan.sale || {};
      const totalRemaining = Number(plan.remainingBalance || 0);
      const nextAmount = Number(next?.amount || next?.originalAmount || 0);
      const nextRemaining = Number(next?.remainingAmount ?? Math.max(0, nextAmount - Number(next?.paidAmount || 0)));

      return {
        id: plan._id.toString(),
        serialNumber: index + 1,
        purchaseDate: sale.saleDate || sale.createdAt || plan.createdAt || plan.firstDueDate,
        customerName: customer.fullName || customer.name || 'N/A',
        referredBy: String(customer.referredBy || '').trim(),
        invoiceNumber: sale.saleId || sale.invoiceNumber || sale.invoiceNo || 'N/A',
        totalAmount: Number(plan.totalAmount || sale.totalAmount || sale.grandTotal || 0),
        totalRemainingAmount: totalRemaining,
        installmentAmount: nextAmount,
        installmentRemainingAmount: nextRemaining,
        installmentBreakdown,
        installmentPlan: `${totalInstallments}M / ${(dueOrPartPaid.length ? dueOrPartPaid : next ? [next] : []).map((item) => item.installmentNumber).join(', ') || '—'}`,
        installmentNumber: next?.installmentNumber || null,
        receivedAmount: '',
        remainingAmount: totalRemaining,
        receiverSign: '',
        installmentReceivedDate: '',
        mobile: customer.mobileNumber || customer.mobile || customer.phone || customer.phoneNumber || '',
        remarks: '',
        nextDueDate: next?.dueDate || null,
        productName: plan.product?.name || sale.product?.name || plan.invoiceSnapshot?.productName || '',
      };
    });

    rows.sort((a, b) =>
      String(a.invoiceNumber || '').localeCompare(
        String(b.invoiceNumber || ''),
        undefined,
        { numeric: true, sensitivity: 'base' }
      )
    );
    rows.forEach((row, index) => {
      row.serialNumber = index + 1;
    });

    const totalRemainingAmount = rows.reduce((sum, row) => sum + row.totalRemainingAmount, 0);
    const references = [...new Set(rows.map((row) => row.referredBy).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      data: {

        totalRecords:
          rows.length,

        totalRemainingAmount,

        references,

        rows,
      },
    });

  } catch (error) {

    console.error(
      'Index Record Error:',
      error
    );

    return res.status(500).json({

      success: false,

      message:
        'Failed to load overall index record',

      error:
        error.message,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {

  getDashboardStats,

  getIndexRecord,
};
