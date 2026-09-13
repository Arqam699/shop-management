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

    // Per-shop amount agreed with the owner for one month of software access.
    monthlyCharge: {
      type: Number,
      min: 0,
      default: 0,
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

    // Filled whenever access is suspended so Super Admin can explain the
    // precise reason to the shop owner.
    suspensionReason: {
      type: String,
      trim: true,
      default: '',
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },

    subscriptionHistory: {
      type: [subscriptionHistorySchema],
      default: [],
    },

    // At most two browser/device identities are permitted for one shop.
    // This list is cleared only when Super Admin reactivates a suspended shop.
    authorizedDevices: {
      type: [
        {
          deviceId: { type: String, required: true },
          firstSeenAt: { type: Date, default: Date.now },
          lastSeenAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Recent successful admin logins. Kept bounded so this security audit
    // trail cannot grow without limit.
    loginIpHistory: {
      type: [
        {
          ip: { type: String, required: true },
          adminEmail: { type: String, default: '' },
          loggedInAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    lastLoginIp: {
      type: String,
      default: '',
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Shop', shopSchema);
