const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Customer = require('../models/Customer');
const Return = require('../models/Return');
const Installment = require('../models/Installment');
const Expense = require('../models/Expense');


// ============================================================
// HELPER: CALCULATE DATE BOUNDARIES
// ============================================================
const getDateRanges = () => {
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const startOfWeek =
    new Date(today);

  startOfWeek.setDate(
    today.getDate() -
    today.getDay()
  );

  const startOfMonth =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  return {
    today,
    startOfWeek,
    startOfMonth,
  };
};


// ============================================================
// GET DASHBOARD STATS
//
// @desc    Get complete real-time KPIs, active financing,
//          expenses and profit for current shop dashboard
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
      startOfWeek,
      startOfMonth,
    } = getDateRanges();


    // ========================================================
    // CURRENT SHOP
    // ========================================================
    //
    // IMPORTANT SaaS SECURITY:
    // shopId comes from authenticated middleware.
    // Never take shopId from req.query or req.body.
    //
    const shopId =
      req.shopId;


    // ========================================================
    // 1. INVENTORY KPIs
    // ========================================================

    // These queries do not depend on each other. Running them together
    // removes several database round-trip waits from the dashboard load.
    const [
      totalProducts,
      lowStockCount,
      outOfStockCount,
      products,
      totalCustomers,
    ] = await Promise.all([
      Product.countDocuments({ shopId }),
      Product.countDocuments({ shopId, status: 'Low Stock' }),
      Product.countDocuments({ shopId, status: 'Out of Stock' }),
      Product.find({ shopId }).select('quantity purchasePrice').lean(),
      Customer.countDocuments({ shopId }),
    ]);


    const totalStockQuantity =
      products.reduce(
        (
          sum,
          product
        ) =>
          sum +
          (
            product.quantity ||
            0
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
            (product.purchasePrice || 0) *
            (product.quantity || 0)
          ),
        0
      );


    // ========================================================
    // 2. CUSTOMERS KPIs
    // ========================================================

    // ========================================================
    // 3. RAW LISTS
    // ========================================================

    // --------------------------------------------------------
    // SALES
    // --------------------------------------------------------
    const [
      salesList,
      activeFinancingList,
      paymentsList,
      expensesList,
      returns,
    ] = await Promise.all([
      Sale.find({ shopId })
        .populate('customer')
        .populate('product')
        .sort({ createdAt: 1 })
        .lean(),
      InstallmentPlan.find({ shopId })
        .populate('customer')
        .populate('product')
        .sort({ createdAt: 1 })
        .lean(),
      Payment.find({ shopId, isArchived: { $ne: true } })
        .populate('customer')
        .populate('sale')
        .populate('installmentPlan')
        .populate('installment')
        .sort({ createdAt: 1 })
        .lean(),
      Expense.find({ shopId }).sort({ createdAt: 1 }).lean(),
      Return.find({ shopId }).select('refundAmount').lean(),
    ]);


    // ========================================================
    // 4. URGENT DUE / OVERDUE INSTALLMENTS
    // ========================================================

    const endOfToday =
      new Date();

    endOfToday.setHours(
      23,
      59,
      59,
      999
    );


    const urgentInstallments =
      await Installment.find({
        shopId,

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
            },
            {
              path:
                'product',
            },
          ],
        })
        .sort({
          dueDate: 1,
        })
        .limit(5);


    // ========================================================
    // 5. SALES PERIOD CALCULATIONS
    // ========================================================

    const [
      todaySalesList,
      weekSalesList,
      monthSalesList,
      activePlans,
      overduePlans,
      todayPayments,
    ] = await Promise.all([
      Sale.find({ shopId, saleDate: { $gte: today } })
        .select('finalTotal')
        .lean(),
      Sale.find({ shopId, saleDate: { $gte: startOfWeek } })
        .select('finalTotal')
        .lean(),
      Sale.find({ shopId, saleDate: { $gte: startOfMonth } })
        .select('finalTotal')
        .lean(),
      InstallmentPlan.countDocuments({ shopId, status: 'Active' }),
      InstallmentPlan.countDocuments({ shopId, status: 'Overdue' }),
      Payment.find({ shopId, paymentDate: { $gte: today } })
        .select('amount')
        .lean(),
    ]);


    // --------------------------------------------------------
    // TOTAL SALES
    // --------------------------------------------------------
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


    // --------------------------------------------------------
    // TODAY SALES
    // --------------------------------------------------------
    const todaySalesVal =
      todaySalesList.reduce(
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


    // --------------------------------------------------------
    // WEEK SALES
    // --------------------------------------------------------
    const weekSalesVal =
      weekSalesList.reduce(
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


    // --------------------------------------------------------
    // MONTH SALES
    // --------------------------------------------------------
    const monthSalesVal =
      monthSalesList.reduce(
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
    // INSTALLMENT PLAN COUNTS
    // ========================================================

    // --------------------------------------------------------
    // TOTAL OUTSTANDING
    // --------------------------------------------------------
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

    const todayCollectedPayments =
      todayPayments.reduce(
        (
          sum,
          payment
        ) =>
          sum +
          (
            payment.amount ||
            0
          ),
        0
      );


    // ========================================================
    // 6. PROFIT CALCULATOR
    //
    // Revenue
    //   ↓
    // Refunds
    //   ↓
    // Adjusted Revenue
    //   ↓
    // Cost of Goods Sold
    //   ↓
    // Gross Profit
    //   ↓
    // Expenses
    //   ↓
    // Net Profit
    // ========================================================

    let totalRevenue = 0;

    let totalCostOfSold = 0;


    for (
      const sale of salesList
    ) {

      // ------------------------------------------------------
      // Revenue
      // ------------------------------------------------------
      totalRevenue +=
        sale.finalTotal ||
        0;


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


    // ========================================================
    // RETURNS
    // ========================================================

    const totalRefunded =
      returns.reduce(
        (
          sum,
          returnRecord
        ) =>
          sum +
          (
            returnRecord.refundAmount ||
            0
          ),
        0
      );


    // --------------------------------------------------------
    // Revenue after refunds
    // --------------------------------------------------------
    const finalAdjustedRevenue =
      totalRevenue -
      totalRefunded;


    // --------------------------------------------------------
    // Gross Profit
    // --------------------------------------------------------
    const grossProfit =
      finalAdjustedRevenue -
      totalCostOfSold;


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
            finalAdjustedRevenue,

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
// GET MONTHLY INDEX RECORD
//
// @desc    Get all unpaid/partially-paid installments due
//          in a selected month for the current shop
//
// @route   GET /api/reports/index-record?month=2026-09
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


    // ========================================================
    // MONTH
    // ========================================================
    //
    // Expected:
    // ?month=2026-09
    //
    const month =
      String(
        req.query.month || ''
      ).trim();


    // --------------------------------------------------------
    // Validate month format
    // --------------------------------------------------------
    if (
      !/^\d{4}-\d{2}$/.test(
        month
      )
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Invalid month. Expected format YYYY-MM.',
      });
    }


    const [
      yearString,
      monthString,
    ] =
      month.split('-');


    const year =
      Number(
        yearString
      );

    const monthNumber =
      Number(
        monthString
      );


    // --------------------------------------------------------
    // Validate actual month
    // --------------------------------------------------------
    if (
      monthNumber < 1 ||
      monthNumber > 12
    ) {

      return res.status(400).json({
        success: false,

        message:
          'Invalid month.',
      });
    }


    // ========================================================
    // MONTH DATE RANGE
    // ========================================================
    //
    // Using UTC boundaries makes the query independent from
    // the server's timezone.
    //
    const startDate =
      new Date(
        Date.UTC(
          year,
          monthNumber - 1,
          1,
          0,
          0,
          0,
          0
        )
      );


    const endDate =
      new Date(
        Date.UTC(
          year,
          monthNumber,
          1,
          0,
          0,
          0,
          0
        )
      );


    // ========================================================
    // GET INSTALLMENTS FOR SELECTED MONTH
    // ========================================================
    //
    // We intentionally use the Installment collection here.
    //
    // InstallmentPlan does NOT contain the actual due-date
    // records. Installment does.
    //
    const installments =
      await Installment.find({

        shopId,

        dueDate: {
          $gte:
            startDate,

          $lt:
            endDate,
        },

        // ----------------------------------------------------
        // Index Record is for installments still requiring
        // collection.
        //
        // Paid / Settled installments are not shown.
        // ----------------------------------------------------
        status: {
          $nin: [
            'Paid',
            'Settled',
          ],
        },
      })
        .populate({
          path:
            'installmentPlan',

          populate: [
            {
              path:
                'customer',
            },
            {
              path:
                'product',
            },
            {
              path: 'sale',
              populate: [
                { path: 'customer' },
                { path: 'product' },
              ],
            },
          ],
        })
        .sort({
          dueDate: 1,
          installmentNumber: 1,
        });


    // ========================================================
    // NO RECORDS
    // ========================================================
    if (
      installments.length === 0
    ) {

      return res.status(200).json({

        success: true,

        data: {

          month,

          totalRecords: 0,

          totalInstallmentAmount: 0,

          rows: [],
        },
      });
    }


    // ========================================================
    // GET ALL INSTALLMENTS FOR THESE PLANS
    //
    // Needed for calculating:
    //
    // Previous Paid Amount
    //
    // Example:
    //
    // Installment 1:
    // previous paid = down payment (if applicable)
    //
    // Installment 2:
    // previous paid = down payment + installment 1 paid
    //
    // Installment 3:
    // previous paid = down payment + installment 1 + 2
    // ========================================================

    const planIds = [
      ...new Set(
        installments
          .map(
            installment =>
              installment.installmentPlan?._id
                ?.toString()
          )
          .filter(Boolean)
      ),
    ];


    const allPlanInstallments =
      await Installment.find({

        shopId,

        installmentPlan: {
          $in:
            planIds,
        },
      })
        .sort({
          installmentNumber: 1,
        });


    // ========================================================
    // GROUP INSTALLMENTS BY PLAN
    // ========================================================

    const installmentsByPlan =
      new Map();


    for (
      const installment
      of allPlanInstallments
    ) {

      const planId =
        installment.installmentPlan
          ?.toString();


      if (
        !planId
      ) {
        continue;
      }


      if (
        !installmentsByPlan.has(
          planId
        )
      ) {

        installmentsByPlan.set(
          planId,
          []
        );
      }


      installmentsByPlan
        .get(planId)
        .push(
          installment
        );
    }


    // ========================================================
    // BUILD INDEX RECORD ROWS
    // ========================================================

    const rows =
      installments.map(
        installment => {

          const plan =
            installment.installmentPlan;


          const customer =
            plan?.customer ||
            plan?.sale?.customer;


          const product =
            plan?.product ||
            plan?.sale?.product;


          const planId =
            plan?._id
              ?.toString();


          const planInstallments =
            installmentsByPlan.get(
              planId
            ) || [];


          // ==================================================
          // PREVIOUS PAID AMOUNT
          // ==================================================
          //
          // Only payments against installments BEFORE the
          // current installment are counted.
          //
          let previousPaidAmount =
            0;


          for (
            const previousInstallment
            of planInstallments
          ) {

            if (
              previousInstallment.installmentNumber <
              installment.installmentNumber
            ) {

              previousPaidAmount +=
                Number(
                  previousInstallment.paidAmount ||
                  0
                );
            }
          }


          // ==================================================
          // DOWN PAYMENT
          // ==================================================
          //
          // If down payment is NOT treated as first
          // installment, it is still an amount already paid
          // before the scheduled installments.
          //
          // Therefore it belongs in Previous Paid Amount.
          //
          if (
            plan &&
            !plan.treatDownPaymentAsFirstInstallment
          ) {

            previousPaidAmount +=
              Number(
                plan.downPayment ||
                0
              );
          }


          // ==================================================
          // TOTAL INSTALLMENTS
          // ==================================================
          //
          // duration = actual scheduled installments.
          //
          // Fallback to invoiceSnapshot.duration for older
          // records where needed.
          //
          const totalInstallments =
            Number(
              plan?.selectedDuration ||
              plan?.duration ||
              plan?.invoiceSnapshot?.selectedDuration ||
              plan?.invoiceSnapshot?.duration ||
              0
            );


          // Count only installments that have been completely paid.
          // The selected duration never changes; this is only the progress
          // value shown as, for example, 2 / 11.
          const paidInstallments =
            planInstallments.filter(
              planInstallment => {
                const amount =
                  Number(
                    planInstallment.amount ||
                    planInstallment.originalAmount ||
                    0
                  );

                const paidAmount =
                  Number(
                    planInstallment.paidAmount ||
                    0
                  );

                return (
                  planInstallment.status === 'Paid' ||
                  planInstallment.status === 'Settled' ||
                  (amount > 0 && paidAmount >= amount)
                );
              }
            ).length;


          // ==================================================
          // CUSTOMER FIELDS
          // ==================================================

          const customerName =
            customer?.fullName ||
            customer?.name ||
            'N/A';


          const mobileNumber =
            customer?.mobileNumber ||
            customer?.mobile ||
            customer?.phone ||
            customer?.phoneNumber ||
            customer?.contactNumber ||
            plan?.sale?.customer?.mobileNumber ||
            plan?.sale?.customer?.mobile ||
            plan?.sale?.customer?.phone ||
            'N/A';


          const cnic =
            customer?.cnic ||
            customer?.CNIC ||
            customer?.cnicNumber ||
            customer?.nationalId ||
            plan?.sale?.customer?.cnic ||
            plan?.sale?.customer?.CNIC ||
            'N/A';


          // ==================================================
          // PRODUCT FIELDS
          // ==================================================

          const productName =
            product?.name ||
            product?.productName ||
            plan?.invoiceSnapshot?.productName ||
            'N/A';


          const model =
            product?.model ||
            product?.productModel ||
            product?.modelNumber ||
            plan?.invoiceSnapshot?.model ||
            'N/A';


          // ==================================================
          // INSTALLMENT PRICE
          // ==================================================

          const installmentPrice =
            Number(
              installment.amount ||
              installment.originalAmount ||
              0
            );


          // ==================================================
          // RETURN ROW
          // ==================================================

          return {

            id:
              installment._id?.toString(),

            customerName,

            mobile:
              mobileNumber,

            mobileNumber,

            cnic,

            productName,

            model,

            installmentPrice,

            previousPaidAmount,

            paidInstallments,

            installmentNumber:
              Number(
                installment.installmentNumber ||
                0
              ),

            totalInstallments,

            installmentLabel:
              `${Number(
                installment.installmentNumber ||
                0
              )} / ${totalInstallments}`,

            dueDate:
              installment.dueDate,

            paidAmount:
              Number(
                installment.paidAmount ||
                0
              ),

            remainingAmount:
              Number(
                installment.remainingAmount ||
                0
              ),

            status:
              installment.status,
          };
        }
      );


    // ========================================================
    // TOTAL INSTALLMENT VALUE
    // ========================================================

    const totalInstallmentAmount =
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          (
            Number(
              row.installmentPrice ||
              0
            )
          ),
        0
      );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      data: {

        month,

        totalRecords:
          rows.length,

        totalInstallmentAmount,

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
        'Failed to load monthly index record',

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
