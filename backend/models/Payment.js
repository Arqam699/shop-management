const mongoose = require('mongoose');

const paymentAllocationSchema = new mongoose.Schema(
  {
    installment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installment',
      required: true,
    },

    installmentNumber: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    previousRemaining: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingAfterPayment: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    paymentId: {
      type: String,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },

    installmentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentPlan',
      required: false,
    },

    planRevision: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
      Kept for backwards compatibility.
      This points to the first installment affected
      by this payment.
    */
    installment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installment',
      required: false,
    },

    cashSalePayment: {
      type: Boolean,
      default: false,
      index: true,
    },

    cashRemainingBalanceAfterPayment: {
      type: Number,
      default: null,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      trim: true,
      default: 'Cash',
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    /*
      New structure.
      Example:
      payment = 25000

      allocations:
      installment #3 = 10000
      installment #4 = 10000
      installment #5 = 5000
    */
    allocations: {
      type: [paymentAllocationSchema],
      default: [],
    },

    /*
      Kept for old payment records / compatibility.
    */
    originalInstallmentAmount: {
      type: Number,
      default: 0,
    },

    /*
      Actual amount that moved to future installments.
    */
    carryForwardAmount: {
      type: Number,
      default: 0,
    },

    // Extra payment applied to the plan balance without changing installments.
    balanceReductionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payment collected after the selected installment was already paid;
    // the whole amount reduces plan balance without touching an installment.
    balanceReductionOnly: {
      type: Boolean,
      default: false,
    },

    // Receipt-time snapshot: limits the current month's payable to the
    // amount actually owed on the plan and records the post-payment balance.
    planPayableAmountAtPayment: {
      type: Number,
      default: null,
      min: 0,
    },

    planRemainingBalanceAfterPayment: {
      type: Number,
      default: null,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({
  shopId: 1,
  paymentId: 1,
});

paymentSchema.index({ shopId: 1, paymentDate: -1 });
paymentSchema.index({ shopId: 1, isArchived: 1, paymentDate: -1 });
paymentSchema.index({ shopId: 1, createdAt: -1 });
paymentSchema.index({ shopId: 1, sale: 1 });
paymentSchema.index({ shopId: 1, customer: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
