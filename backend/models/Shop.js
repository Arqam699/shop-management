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

    // ====================================================
    // MAXIMUM 2 AUTHORIZED DEVICES
    // ====================================================

    authorizedDevices: {
      type: [
        {
          deviceId: {
            type: String,
            required: true,
          },

          firstSeenAt: {
            type: Date,
            default: Date.now,
          },

          lastSeenAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // ====================================================
    // SESSION REVOCATION VERSION
    //
    // Every login JWT contains this value.
    //
    // When shop is suspended/activated:
    // authVersion is incremented.
    //
    // All old JWTs then become invalid.
    // ====================================================

    authVersion: {
      type: Number,
      default: 0,
    },

    // ====================================================
    // LOGIN IP HISTORY
    // ====================================================

    loginIpHistory: {
      type: [
        {
          ip: {
            type: String,
            required: true,
          },

          adminEmail: {
            type: String,
            default: '',
          },

          loggedInAt: {
            type: Date,
            default: Date.now,
          },
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

module.exports =
  mongoose.model('Shop', shopSchema);