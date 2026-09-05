const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true }, // e.g. PAY-0001
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    installmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallmentPlan', required: true },
    installment: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment', required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'], default: 'Cash' },
    paymentDate: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    // New dynamic carry-forward audit trackers
    originalInstallmentAmount: { type: Number, default: 0 },
    carryForwardAmount: { type: Number, default: 0 },
    notes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);