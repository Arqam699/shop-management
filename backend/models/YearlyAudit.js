const mongoose = require('mongoose');

const yearlyAuditSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true }, // e.g. 2022, 2023
    
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
        paymentType: { type: String, enum: ['Cash', 'Installment'], default: 'Cash' },
        purchasePrice: { type: Number, required: true }, // Buying price (cost)
        salePrice: { type: Number, required: true },     // Selling price
        receivedAmount: { type: Number, required: true }, // Actual received cash so far
        planDuration: { type: Number, default: 0 },      // 3, 6, 12 months
        downPayment: { type: Number, default: 0 },
        profit: { type: Number, default: 0 }             // Calculated profit
      }
    ],

    totalInventoryCost: { type: Number, default: 0 },
    totalSalesRevenue: { type: Number, default: 0 },
    totalYearlyProfit: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('YearlyAudit', yearlyAuditSchema);