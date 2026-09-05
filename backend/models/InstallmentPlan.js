const mongoose = require('mongoose');

const installmentPlanSchema = new mongoose.Schema(
  {
    planId: { type: String, unique: true }, // e.g. PLAN-0001
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    totalAmount: { type: Number, required: true },
    downPayment: { type: Number, required: true },
    remainingBalance: { type: Number, required: true },
    duration: { type: Number, required: true }, // 3, 6, 12 months
    status: { 
      type: String, 
      enum: ['Active', 'Completed', 'Overdue'], 
      default: 'Active' 
    },
    firstDueDate: { type: Date, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InstallmentPlan', installmentPlanSchema);