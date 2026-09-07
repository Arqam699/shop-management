const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // SaaS: payment belongs to a specific shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    paymentId: { type: String }, // e.g. PAY-0001

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true
    },

    installmentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentPlan',
      required: true
    },

    installment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installment',
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'],
      default: 'Cash'
    },

    paymentDate: {
      type: Date,
      default: Date.now
    },

    isArchived: {
      type: Boolean,
      default: false
    },

    // New dynamic carry-forward audit trackers
    originalInstallmentAmount: {
      type: Number,
      default: 0
    },

    carryForwardAmount: {
      type: Number,
      default: 0
    },

    notes: {
      type: String
    }
  },
  { timestamps: true }
);

paymentSchema.index({ shopId: 1, paymentId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);