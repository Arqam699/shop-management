const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    returnId: { type: String, unique: true }, // e.g. RET-0001
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    refundAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    returnDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);