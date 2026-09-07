const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    // SaaS: Stock movement belongs to a specific shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    type: {
      type: String,
      enum: [
        'Stock Added',
        'Sale',
        'Return',
        'Adjustment'
      ],
      required: true
    },

    quantity: {
      type: Number,
      required: true
    },

    previousQuantity: {
      type: Number,
      required: true
    },

    newQuantity: {
      type: Number,
      required: true
    },

    reason: {
      type: String,
      trim: true
    },

    reference: {
      type: String,
      trim: true
    }, // e.g., Invoice Number or Adjustment Code

    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'StockMovement',
  stockMovementSchema
);