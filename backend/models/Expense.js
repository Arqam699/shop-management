const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseId: { type: String, unique: true }, // e.g. EXP-0001
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Rent', 'Electricity Bill', 'Salaries', 'Tea & Entertainment', 'Stationery', 'Repair & Maintenance', 'Other'],
      default: 'Other'
    },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    expenseDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);