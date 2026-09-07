const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    // ============================================================
    // SAAS SHOP LINK
    // ============================================================
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    expenseId: { type: String }, // e.g. EXP-0001

    title: { type: String, required: true, trim: true },

    category: {
      type: String,
      required: true,
      enum: [
        'Rent',
        'Electricity Bill',
        'Salaries',
        'Tea & Entertainment',
        'Stationery',
        'Repair & Maintenance',
        'Other'
      ],
      default: 'Other'
    },

    amount: { type: Number, required: true, min: 0 },

    notes: { type: String, trim: true },

    expenseDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

expenseSchema.index({ shopId: 1, expenseId: 1 }, { unique: true });

module.exports = mongoose.model('Expense', expenseSchema);