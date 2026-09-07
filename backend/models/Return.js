const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    // SaaS: Return belongs to a specific shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    returnId: { type: String }, // e.g. RET-0001

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    returnDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

returnSchema.index({ shopId: 1, returnId: 1 }, { unique: true });

module.exports = mongoose.model('Return', returnSchema);