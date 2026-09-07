const Payment = require('../models/Payment');
const Settings = require('../models/Settings');


// ============================================================
// DELETION MODE CHECK
// SaaS: Check deletion mode for current shop only
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
// GET PAYMENTS
// @desc Get active payments history
// @route GET /api/payments
// @access Private
// ============================================================
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      shopId: req.shopId,
    })
      .populate('customer')
      .populate('sale')
      .populate({
        path: 'installmentPlan',
        populate: [
          { path: 'product' },
          { path: 'sale' },
        ],
      })
      .populate('installment')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load payments history',
      error: error.message,
    });
  }
};


// ============================================================
// GET PAYMENT BY ID
// @route GET /api/payments/:id
// @access Private
// ============================================================
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      shopId: req.shopId,
    })
      .populate('customer')
      .populate('sale')
      .populate('installmentPlan')
      .populate('installment');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message,
    });
  }
};


// ============================================================
// DELETE PAYMENT
// @route DELETE /api/payments/:id
// @access Private
// ============================================================
const deletePayment = async (req, res) => {
  try {
    // --------------------------------------------------------
    // CHECK DELETION MODE
    // SaaS: Current shop only
    // --------------------------------------------------------
    const deletionCheck = await checkDeletionMode(
      req.shopId
    );

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message,
      });
    }

    // --------------------------------------------------------
    // DELETE PAYMENT
    // SaaS: Current shop only
    // --------------------------------------------------------
    const payment = await Payment.findOneAndDelete({
      _id: req.params.id,
      shopId: req.shopId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment record removed successfully!',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to remove payment: ' +
        error.message,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getPayments,
  getPaymentById,
  deletePayment,
};