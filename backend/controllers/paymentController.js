const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Settings = require('../models/Settings');


// ============================================================
// DELETION MODE CHECK
// ============================================================
const checkDeletionMode = async (shopId) => {
  const settings = await Settings.findOne({
    shopId,
  });

  if (!settings || !settings.allowGlobalDeletion) {
    return {
      allowed: false,
      message:
        'Deletion Mode is disabled. Enable it from Settings first.',
    };
  }

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
// HELPER
// Calculate installment status
// ============================================================
const calculateInstallmentStatus = (installment) => {
  const paid = Number(installment.paidAmount || 0);
  const amount = Number(
    installment.originalAmount ||
    installment.amount ||
    0
  );

  const remaining = Math.max(0, amount - paid);

  installment.remainingAmount = remaining;

  if (remaining <= 0) {
    installment.status = 'Paid';

    if (!installment.paidDate) {
      installment.paidDate = new Date();
    }
  } else if (paid > 0) {
    installment.status = 'Partially Paid';
  } else {
    const now = new Date();
    const dueDate = new Date(installment.dueDate);

    if (dueDate < now) {
      installment.status = 'Overdue';
    } else {
      installment.status = 'Pending';
    }

    installment.paidDate = undefined;
  }

  return installment;
};


// ============================================================
// GET PAYMENTS
// @route GET /api/payments
// @access Private
// ============================================================
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      shopId: req.shopId,
      isArchived: { $ne: true },
    })
      .populate('customer')
      .populate({
        path: 'sale',
        populate: {
          path: 'product',
        },
      })
      .populate({
        path: 'installmentPlan',
        populate: [
          {
            path: 'product',
          },
          {
            path: 'sale',
            populate: {
              path: 'product',
            },
          },
        ],
      })
      .populate('installment')
      .populate({
        path: 'allocations.installment',
      })
      .sort({
        paymentDate: 1,
        createdAt: 1,
      })
      .lean();

    // ----------------------------------------------------------
    // Get all installment plans used by these payments
    // ----------------------------------------------------------
    const planIds = [
      ...new Set(
        payments
          .map((payment) =>
            payment.installmentPlan?._id
              ? payment.installmentPlan._id.toString()
              : null
          )
          .filter(Boolean)
      ),
    ];

    let installments = [];

    if (planIds.length > 0) {
      installments = await Installment.find({
        shopId: req.shopId,
        installmentPlan: {
          $in: planIds,
        },
      })
        .sort({
          installmentNumber: 1,
          dueDate: 1,
        })
        .lean();
    }

    // ----------------------------------------------------------
    // Group installment history plan-wise
    // ----------------------------------------------------------
    const historyMap = new Map();

    installments.forEach((installment) => {
      const key = installment.installmentPlan.toString();

      if (!historyMap.has(key)) {
        historyMap.set(key, []);
      }

      historyMap.get(key).push(installment);
    });

    // ----------------------------------------------------------
    // Attach complete installment history to every payment
    // ----------------------------------------------------------
    const finalPayments = payments.map((payment) => {
      const planId =
        payment.installmentPlan?._id?.toString();

      return {
        ...payment,

        installmentHistory:
          historyMap.get(planId) || [],
      };
    });

    return res.status(200).json({
      success: true,
      data: finalPayments,
    });
  } catch (error) {
    console.error('GET PAYMENTS ERROR:', error);

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
      .populate({
        path: 'sale',
        populate: {
          path: 'product',
        },
      })
      .populate({
        path: 'installmentPlan',
        populate: [
          {
            path: 'product',
          },
          {
            path: 'sale',
            populate: {
              path: 'product',
            },
          },
        ],
      })
      .populate('installment')
      .populate({
        path: 'allocations.installment',
      })
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // ----------------------------------------------------------
    // Get complete installment history
    // ----------------------------------------------------------
    const installmentHistory = await Installment.find({
      shopId: req.shopId,
      installmentPlan: payment.installmentPlan?._id,
    })
      .sort({
        installmentNumber: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...payment,
        installmentHistory,
      },
    });
  } catch (error) {
    console.error('GET PAYMENT BY ID ERROR:', error);

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
//
// IMPORTANT:
// Payment delete hone par installment balances bhi reverse honge.
// ============================================================
const deletePayment = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // CHECK DELETION MODE
    // ----------------------------------------------------------
    const deletionCheck = await checkDeletionMode(
      req.shopId
    );

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message,
      });
    }

    // ----------------------------------------------------------
    // FIND PAYMENT
    // ----------------------------------------------------------
    const payment = await Payment.findOne({
      _id: req.params.id,
      shopId: req.shopId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // ----------------------------------------------------------
    // REVERSE PAYMENT ALLOCATIONS
    //
    // If payment was overpaid and distributed across multiple
    // installments, every allocation will be reversed.
    // ----------------------------------------------------------
    let allocations = [];

    if (
      Array.isArray(payment.allocations) &&
      payment.allocations.length > 0
    ) {
      allocations = payment.allocations;
    } else if (payment.installment) {
      // Backward compatibility with old payment records
      allocations = [
        {
          installment: payment.installment,
          amount: payment.amount,
        },
      ];
    }

    // ----------------------------------------------------------
    // Reverse each installment
    // ----------------------------------------------------------
    for (const allocation of allocations) {
      if (!allocation.installment) continue;

      const installment = await Installment.findOne({
        _id: allocation.installment,
        shopId: req.shopId,
      });

      if (!installment) continue;

      const amountToReverse = Number(
        allocation.amount || 0
      );

      installment.paidAmount = Math.max(
        0,
        Number(installment.paidAmount || 0) -
          amountToReverse
      );

      calculateInstallmentStatus(installment);

      await installment.save();
    }

    // ----------------------------------------------------------
    // Recalculate plan balance
    // ----------------------------------------------------------
    if (payment.installmentPlan) {
      const plan = await InstallmentPlan.findOne({
        _id: payment.installmentPlan,
        shopId: req.shopId,
      });

      if (plan) {
        const allInstallments = await Installment.find({
          shopId: req.shopId,
          installmentPlan: plan._id,
        }).lean();

        const remainingInstallmentBalance =
          allInstallments.reduce(
            (sum, installment) =>
              sum +
              Math.max(
                0,
                Number(
                  installment.remainingAmount || 0
                )
              ),
            0
          );

        plan.remainingBalance =
          Math.max(0, remainingInstallmentBalance);

        if (plan.remainingBalance <= 0) {
          plan.status = 'Completed';
        } else {
          const hasOverdue = allInstallments.some(
            (installment) =>
              installment.status === 'Overdue'
          );

          plan.status = hasOverdue
            ? 'Overdue'
            : 'Active';
        }

        await plan.save();
      }
    }

    // ----------------------------------------------------------
    // Finally delete payment
    // ----------------------------------------------------------
    await Payment.deleteOne({
      _id: payment._id,
      shopId: req.shopId,
    });

    return res.status(200).json({
      success: true,
      message:
        'Payment removed and installment balance restored successfully!',
    });
  } catch (error) {
    console.error('DELETE PAYMENT ERROR:', error);

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