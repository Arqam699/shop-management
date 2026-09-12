const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    installmentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentPlan',
      required: true,
      index: true,
    },

    installmentNumber: {
      type: Number,
      required: true,
    },

    // Original scheduled amount.
    // Payment hone ke baad ye value change NAHI hogi.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Same as original scheduled amount.
    originalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Actual amount paid against this installment.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // amount - paidAmount
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'Pending',
        'Partially Paid',
        'Paid',
        'Overdue',
        'Settled'
      ],
      default: 'Pending',
    },

    paidDate: {
      type: Date,
    },

    // Used when the whole plan is settled by a payment
    // that covers future scheduled installments.
    settledDate: {
      type: Date,
    },

    // Indicates that this installment was closed because
    // another payment settled the remaining plan balance.
    isSettledByPlanPayment: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

installmentSchema.index({
  shopId: 1,
  installmentPlan: 1,
  installmentNumber: 1,
});

module.exports = mongoose.model('Installment', installmentSchema);