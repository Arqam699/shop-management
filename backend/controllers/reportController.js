
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

    const totalProducts =
      await Product.countDocuments({
        shopId,
      });


    const lowStockCount =
      await Product.countDocuments({
        shopId,
        status:
          'Low Stock',
      });


    const outOfStockCount =
      await Product.countDocuments({
        shopId,
        status:
          'Out of Stock',
      });


    // --------------------------------------------------------
    // Get products for stock calculations
    // --------------------------------------------------------
    const products =
      await Product.find({
        shopId,
      });


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

    const totalCustomers =
      await Customer.countDocuments({
        shopId,
      });


    // ========================================================
    // 3. RAW LISTS
    // ========================================================

    // --------------------------------------------------------
    // SALES
    // --------------------------------------------------------
    const salesList =
      await Sale.find({
        shopId,
      })
        .populate('customer')
        .populate('product')
        .sort({
          createdAt: 1,
        });


    // --------------------------------------------------------
    // ACTIVE FINANCING / INSTALLMENT PLANS
    // --------------------------------------------------------
    const activeFinancingList =
      await InstallmentPlan.find({
        shopId,
      })
        .populate('customer')
        .populate('product')
        .sort({
          createdAt: 1,
        });


    // --------------------------------------------------------
    // PAYMENTS
    // --------------------------------------------------------
    const paymentsList =
      await Payment.find({
        shopId,
        isArchived: {
          $ne: true,
        },
      })
        .populate('customer')
        .populate('sale')
        .populate('installmentPlan')
        .populate('installment')
        .sort({
          createdAt: 1,
        });


    // --------------------------------------------------------
    // EXPENSES
    // --------------------------------------------------------
    const expensesList =
      await Expense.find({
        shopId,
      }).sort({
        createdAt: 1,
      });


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

    const todaySalesList =
      await Sale.find({
        shopId,

        saleDate: {
          $gte:
            today,
        },
      });


    const weekSalesList =
      await Sale.find({
        shopId,

        saleDate: {
          $gte:
            startOfWeek,
        },
      });


    const monthSalesList =
      await Sale.find({
        shopId,

        saleDate: {
          $gte:
            startOfMonth,
        },
      });


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

    const activePlans =
      await InstallmentPlan.countDocuments({
        shopId,

        status:
          'Active',
      });


    const overduePlans =
      await InstallmentPlan.countDocuments({
        shopId,

        status:
          'Overdue',
      });


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

    const todayPayments =
      await Payment.find({
        shopId,

        paymentDate: {
          $gte:
            today,
        },
      });


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

    const returns =
      await Return.find({
        shopId,
      });


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
// EXPORTS
// ============================================================
module.exports = {
  getDashboardStats,
};
