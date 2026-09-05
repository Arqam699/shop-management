const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    installmentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallmentPlan', required: true },
    installmentNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    originalAmount: { type: Number, default: 0 }, // Stores the original allocated amount before carry-forward
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue'], 
      default: 'Pending' 
    },
    paidDate: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Installment', installmentSchema);