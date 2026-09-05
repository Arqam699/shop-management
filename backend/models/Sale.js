const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    saleId: { type: String, unique: true }, // e.g. SALE-0001
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true },
    finalTotal: { type: Number, required: true },
    paymentType: { 
      type: String, 
      enum: ['Cash', 'Installment'], 
      default: 'Cash' 
    },
    downPayment: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, default: 0, min: 0 },
    installmentDuration: { type: Number, default: 0 }, // Months (e.g. 3, 6, 12)
    saleDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);