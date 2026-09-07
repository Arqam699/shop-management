
const Expense = require('../models/Expense');
const Settings = require('../models/Settings');


// ============================================================
// DELETION MODE CHECK
// ============================================================
const checkDeletionMode = async (shopId) => {
  const settings = await Settings.findOne({
    shopId,
  });

  // Deletion Mode OFF
  if (!settings || !settings.allowGlobalDeletion) {
    return {
      allowed: false,
      message:
        'Deletion Mode is disabled. Enable it from Settings first.',
    };
  }

  // Deletion Mode expired
  if (
    settings.deletionModeExpiresAt &&
    new Date() > settings.deletionModeExpiresAt
  ) {
    settings.allowGlobalDeletion = false;
    settings.deletionModeExpiresAt = null;

    await settings.save();

    return {
      allowed: false,
      message:
        'Deletion Mode has expired. Enable it again from Settings.',
    };
  }

  return {
    allowed: true,
  };
};


// ============================================================
// ROBUST EXPENSE VOUCHER ID GENERATOR
// IMPORTANT:
// Expense IDs are generated separately for each shop.
//
// Shop A:
// EXP-0001
// EXP-0002
//
// Shop B:
// EXP-0001
// EXP-0002
// ============================================================
const generateExpenseID = async (shopId) => {
  try {
    const lastExpense = await Expense.findOne({
      shopId,
      expenseId: /^EXP-\d+$/,
    }).sort({
      expenseId: -1,
    });


    if (
      !lastExpense ||
      !lastExpense.expenseId
    ) {
      return 'EXP-0001';
    }


    const lastIdNum = parseInt(
      lastExpense.expenseId.split('-')[1],
      10
    );


    if (isNaN(lastIdNum)) {
      return 'EXP-0001';
    }


    return `EXP-${String(
      lastIdNum + 1
    ).padStart(4, '0')}`;

  } catch (err) {

    return `EXP-${Date.now()
      .toString()
      .slice(-4)}`;
  }
};


// ============================================================
// GET ALL EXPENSES
// @route   GET /api/expenses
// @access  Private
// ============================================================
const getExpenses = async (req, res) => {
  try {

    // IMPORTANT:
    // Only get expenses belonging to logged-in shop
    const expenses =
      await Expense.find({
        shopId: req.shopId,
      }).sort({
        createdAt: 1,
      });


    return res.status(200).json({
      success: true,
      data: expenses,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Failed to load expenses',
      error: error.message,
    });

  }
};


// ============================================================
// CREATE EXPENSE
// @route   POST /api/expenses
// @access  Private
// ============================================================
const createExpense = async (req, res) => {
  try {

    const {
      title,
      category,
      amount,
      notes,
      expenseDate,
    } = req.body;


    const amt = Number(amount);


    if (
      isNaN(amt) ||
      amt <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid positive expense amount.',
      });
    }


    // IMPORTANT:
    // Generate expense ID only from current shop
    const expenseId =
      await generateExpenseID(
        req.shopId
      );


    const expense =
      new Expense({

        // IMPORTANT:
        // Never trust shopId from frontend
        shopId: req.shopId,

        expenseId,

        title,

        category,

        amount: amt,

        notes,

        expenseDate:
          expenseDate
            ? new Date(expenseDate)
            : new Date(),
      });


    await expense.save();


    return res.status(201).json({
      success: true,
      message:
        'Expense logged successfully!',
      data: expense,
    });

  } catch (error) {

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Log expense failed',
    });

  }
};


// ============================================================
// DELETE / VOID EXPENSE
// @route   DELETE /api/expenses/:id
// @access  Private
// ============================================================
const deleteExpense = async (req, res) => {
  try {

    // --------------------------------------------------------
    // CHECK DELETION MODE
    // IMPORTANT:
    // Only use current shop's Settings
    // --------------------------------------------------------
    const deletionCheck =
      await checkDeletionMode(
        req.shopId
      );


    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message:
          deletionCheck.message,
      });
    }


    // --------------------------------------------------------
    // DELETE EXPENSE
    // IMPORTANT:
    // Only delete expense belonging to current shop
    // --------------------------------------------------------
    const expense =
      await Expense.findOneAndDelete({
        _id: req.params.id,
        shopId: req.shopId,
      });


    if (!expense) {
      return res.status(404).json({
        success: false,
        message:
          'Expense record not found',
      });
    }


    return res.status(200).json({
      success: true,
      message:
        'Expense record removed successfully!',
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
};
