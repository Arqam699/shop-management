const Expense = require('../models/Expense');

// Robust Expense Voucher ID Generator
const generateExpenseID = async () => {
  try {
    const lastExpense = await Expense.findOne({ expenseId: /^EXP-\d+$/ }).sort({ expenseId: -1 });
    if (!lastExpense || !lastExpense.expenseId) return 'EXP-0001';
    const lastIdNum = parseInt(lastExpense.expenseId.split('-')[1], 10);
    return `EXP-${String(lastIdNum + 1).padStart(4, '0')}`;
  } catch (err) {
    return `EXP-${Date.now().toString().slice(-4)}`;
  }
};

// @desc    Get all active expenses history (Sorted Oldest to Newest - Line-Wise)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: 1 }); // Chronological line-wise sorting
    return res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load expenses', error: error.message });
  }
};

// @desc    Record new daily expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  try {
    const { title, category, amount, notes, expenseDate } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid positive expense amount.' });
    }

    const expenseId = await generateExpenseID();
    const expense = new Expense({
      expenseId,
      title,
      category,
      amount: amt,
      notes,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date()
    });

    await expense.save();
    return res.status(201).json({ success: true, message: 'Expense logged successfully!', data: expense });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Log expense failed' });
  }
};

// @desc    Delete/Void expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    return res.status(200).json({ success: true, message: 'Expense record removed successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getExpenses, createExpense, deleteExpense };