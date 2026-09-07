const mongoose = require('mongoose');

const yearlyAuditSchema = new mongoose.Schema(
  {
    // SaaS: Yearly audit belongs to a specific shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    year: {
      type: Number,
      required: true,
    },

    // Manual inventory purchases logs
    purchasedProducts: [
      {
        name: { type: String, required: true },
        brand: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        purchasePrice: { type: Number, required: true } // Buying cost price
      }
    ],

    // Manual sales checkouts logs
    soldProducts: [
      {
        name: { type: String, required: true },
        brand: { type: String, required: true },
        paymentType: {
          type: String,
          enum: ['Cash', 'Installment'],
          default: 'Cash'
        },
        purchasePrice: {
          type: Number,
          required: true
        }, // Buying price (cost)
        salePrice: {
          type: Number,
          required: true
        }, // Selling price
        receivedAmount: {
          type: Number,
          required: true
        }, // Actual received cash so far
        planDuration: {
          type: Number,
          default: 0
        }, // 3, 6, 12 months
        downPayment: {
          type: Number,
          default: 0
        },
        profit: {
          type: Number,
          default: 0
        } // Calculated profit
      }
    ],

    totalInventoryCost: {
      type: Number,
      default: 0
    },

    totalSalesRevenue: {
      type: Number,
      default: 0
    },

    totalYearlyProfit: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// ------------------------------------------------------------
// SaaS: One audit per year PER SHOP
// Shop A → 2026
// Shop B → 2026
// Both are allowed
// ------------------------------------------------------------
yearlyAuditSchema.index(
  { shopId: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'YearlyAudit',
  yearlyAuditSchema
);