const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['Free Trial', 'Complete'],
      required: true,
    },

    durationMonths: {
      type: Number,
      required: true,
      min: 0,
    },

    renewedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    previousExpiryDate: {
      type: Date,
      default: null,
    },

    newExpiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    _id: true,
  }
);

const shopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    subscriptionPlan: {
      type: String,
      enum: ['Free Trial', 'Complete', 'Basic'],
      default: 'Free Trial',
    },

    subscriptionStatus: {
      type: String,
      enum: ['Active', 'Expired', 'Suspended'],
      default: 'Active',
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },

    subscriptionHistory: {
      type: [subscriptionHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Shop', shopSchema);