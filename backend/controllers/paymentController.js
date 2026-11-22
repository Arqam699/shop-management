const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const {
  getPaginationParams,
  paginatedResponse,
} = require('../utils/pagination');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Sale = require('../models/Sale');
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
    // --------------------------------------------------------
    // OPTIONAL PAGINATION (backward compatible)
    // ?page=1&limit=20 -> { data, pagination }
    // no params       -> plain array (unchanged)
    //
    // Populate is restricted to the fields the payments UI
    // actually reads (customer name/phone, sale/plan ids,
    // product names, installment numbers/amounts).
    // --------------------------------------------------------
    const pagination =
      getPaginationParams(req);

    const paymentsFilter = {
      shopId: req.shopId,
      isArchived: { $ne: true },
    };

    const requestedCustomer = String(req.query.customer || '').trim();
    if (requestedCustomer && mongoose.Types.ObjectId.isValid(requestedCustomer)) {
      paymentsFilter.customer = requestedCustomer;
    }

    let paymentsQuery = Payment.find(paymentsFilter)
      .populate(
        'customer',
        requestedCustomer
          ? 'fullName mobileNumber cnic customerId'
          : 'fullName mobileNumber cnic +liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt'
      )
      .populate({
        path: 'sale',
        select: 'saleId paymentType finalTotal items product',
        populate: [
          { path: 'product', select: 'name model brand' },
          { path: 'items.product', select: 'name model brand' },
        ],
      })
      .populate({
        path: 'installmentPlan',
        select:
          'planId revisionNumber lastRevisionChange remainingBalance totalAmount downPayment ' +
          'treatDownPaymentAsFirstInstallment',
        populate: [
          {
            path: 'product',
            select: 'name',
          },
          {
            path: 'sale',
            select: 'saleId paymentType',
            populate: {
              path: 'product',
              select: 'name',
            },
          },
        ],
      })
      .populate(
        'installment',
        'installmentNumber amount originalAmount status dueDate'
      )
      .sort({
        paymentDate: 1,
        createdAt: 1,
      })
      .lean();

    let totalPayments = 0;

    if (pagination) {
      totalPayments =
        await Payment.countDocuments(paymentsFilter);

      paymentsQuery = paymentsQuery
        .skip(pagination.skip)
        .limit(pagination.limit);
    }

    const payments = await paymentsQuery;

    if (pagination) {
      return paginatedResponse(
        res,
        payments,
        totalPayments,
        pagination
      );
    }

    return res.status(200).json({
      success: true,
      // Detailed installment history is fetched only for the receipt opened
      // by the user via GET /payments/:id.
      data: payments,
    });
  } catch (error) {
    console.error('GET PAYMENTS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load payments history',
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
      .populate(
        'customer',
        '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt'
      )
      .populate({
        path: 'sale',
        populate: [
          { path: 'product' },
          { path: 'items.product' },
        ],
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
    const installmentHistory = payment.installmentPlan
      ? await Installment.find({
          shopId: req.shopId,
          installmentPlan: payment.installmentPlan._id,
        }).sort({ installmentNumber: 1 }).lean()
      : [];

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

    if (payment.cashSalePayment) {
      return res.status(400).json({
        success: false,
        message: 'Cash sale receipt history cannot be deleted from Payments.',
      });
    }

    const paymentPlanId = payment.installmentPlan?._id || payment.installmentPlan;
    const planForRevisionCheck = paymentPlanId
      ? await InstallmentPlan.findOne({ _id: paymentPlanId, shopId: req.shopId })
      : null;
    if (planForRevisionCheck && Number(payment.planRevision || 0) < Number(planForRevisionCheck.revisionNumber || 0)) {
      return res.status(400).json({
        success: false,
        message: 'This receipt belongs to an earlier plan revision and cannot be deleted. Preserve it for the audit trail.',
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
          revisionNumber: Number(plan.revisionNumber || 0),
          isArchived: { $ne: true },
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

        plan.balanceReduction = Math.max(
          0,
          Number(plan.balanceReduction || 0) - Number(payment.balanceReductionAmount || 0)
        );
        plan.remainingBalance = Math.max(
          0,
          remainingInstallmentBalance - Number(plan.balanceReduction || 0)
        );

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

          // Reopen any installments that were marked Paid only because the
          // plan had previously been fully settled by a balance reduction.
          for (const installment of allInstallments) {
            const installmentDoc = await Installment.findOne({
              _id: installment._id,
              shopId: req.shopId,
              revisionNumber: Number(plan.revisionNumber || 0),
              isArchived: { $ne: true },
            });
            if (!installmentDoc) continue;
            calculateInstallmentStatus(installmentDoc);
            await installmentDoc.save();
          }
        }

        await plan.save();

        const sale = await Sale.findOne({
          _id: payment.sale,
          shopId: req.shopId,
        });

        if (sale) {
          sale.remainingBalance = plan.remainingBalance;
          await sale.save();
        }
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
