const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Customer = require('../models/Customer');
const Return = require('../models/Return');
const Installment = require('../models/Installment');
const Expense = require('../models/Expense'); // Add Expense Model reference

// Helper to calculate date boundaries
const getDateRanges = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return { today, startOfWeek, startOfMonth };
};

// @desc    Get complete real-time KPIs, active financing, and expenses for dukan dashboard
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const { today, startOfWeek, startOfMonth } = getDateRanges();

    // 1. Inventory KPIs
    const totalProducts = await Product.countDocuments();
    const lowStockCount = await Product.countDocuments({ status: 'Low Stock' });
    const outOfStockCount = await Product.countDocuments({ status: 'Out of Stock' });

    const products = await Product.find();
    const totalStockQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const inventoryCostValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);

    // 2. Customers KPIs
    const totalCustomers = await Customer.countDocuments();

    // 3. Raw Lists Populated
    const salesList = await Sale.find().populate('customer').populate('product').sort({ createdAt: 1 });
    const activeFinancingList = await InstallmentPlan.find().populate('customer').populate('product').sort({ createdAt: 1 });
    const paymentsList = await Payment.find({ isArchived: { $ne: true } }).populate('customer').populate('sale').populate('installmentPlan').populate('installment').sort({ createdAt: 1 });
    
    // NEW: Fetch all dynamic expenses raw list (Oldest to Newest - Line-wise)
    const expensesList = await Expense.find().sort({ createdAt: 1 });

    // 4. Fetch urgent due or overdue installments
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const urgentInstallments = await Installment.find({
      status: { $in: ['Pending', 'Overdue', 'Partially Paid'] },
      dueDate: { $lte: endOfToday }
    })
    .populate({
      path: 'installmentPlan',
      populate: [
        { path: 'customer' },
        { path: 'product' }
      ]
    })
    .sort({ dueDate: 1 })
    .limit(5);

    // 5. Raw calculations (Presets metrics)
    const todaySalesList = await Sale.find({ saleDate: { $gte: today } });
    const weekSalesList = await Sale.find({ saleDate: { $gte: startOfWeek } });
    const monthSalesList = await Sale.find({ saleDate: { $gte: startOfMonth } });

    const totalSalesVal = salesList.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
    const todaySalesVal = todaySalesList.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
    const weekSalesVal = weekSalesList.reduce((sum, s) => sum + (s.finalTotal || 0), 0);
    const monthSalesVal = monthSalesList.reduce((sum, s) => sum + (s.finalTotal || 0), 0);

    const activePlans = await InstallmentPlan.countDocuments({ status: 'Active' });
    const overduePlans = await InstallmentPlan.countDocuments({ status: 'Overdue' });
    const totalOutstandingAmount = activeFinancingList.reduce((sum, p) => sum + (p.remainingBalance || 0), 0);

    const todayPayments = await Payment.find({ paymentDate: { $gte: today } });
    const todayCollectedPayments = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 6. PROFIT CALCULATOR (With Expenses integration)
    let totalRevenue = 0;
    let totalCostOfSold = 0;

    for (const sale of salesList) {
      totalRevenue += sale.finalTotal || 0;
      if (sale.product) {
        totalCostOfSold += (sale.quantity || 0) * (sale.product.purchasePrice || 0);
      }
    }

    const returns = await Return.find();
    const totalRefunded = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const finalAdjustedRevenue = totalRevenue - totalRefunded;
    const grossProfit = finalAdjustedRevenue - totalCostOfSold;

    // Total expenses sum
    const totalExpensesValue = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfitValue = grossProfit - totalExpensesValue; // Khaalis dynamic net income

    return res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalProducts,
          totalStockQuantity,
          lowStockCount,
          outOfStockCount,
          inventoryCostValue
        },
        customers: {
          totalCustomers
        },
        sales: {
          todaySalesVal,
          weekSalesVal,
          monthSalesVal,
          totalSalesVal,
          salesList 
        },
        installments: {
          activePlans,
          overduePlans,
          totalOutstandingAmount,
          todayCollectedPayments,
          activeFinancingList,
          paymentsList,
          urgentInstallments 
        },
        expenses: {
          totalExpensesValue,
          expensesList // Return raw list for date filtration
        },
        profit: {
          totalRevenue: finalAdjustedRevenue,
          totalCost: totalCostOfSold,
          grossProfit,
          totalExpenses: totalExpensesValue,
          netProfit: netProfitValue // Final Net Profit
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to compile dashboard metrics', error: error.message });
  }
};

module.exports = { getDashboardStats };