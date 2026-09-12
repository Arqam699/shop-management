const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    customerId: {
      type: String,
    },

    // ==========================================
    // CUSTOMER BASIC INFORMATION
    // ==========================================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    alternateMobileNumber: {
      type: String,
      trim: true,
    },

    cnic: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      default: 'Sangla Hill',
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    // ==========================================
    // CUSTOMER FINGERPRINT
    // ==========================================
    fingerprintFmd: {
      type: String,
      default: null,
    },

    fingerprintImage: {
      type: String,
      default: null,
    },

    fingerprintCapturedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // CUSTOMER LIVE CAMERA PHOTO
    // ==========================================
    liveImage: {
      type: String,
      default: null,
    },

    liveImageCapturedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // GUARANTOR #1
    // ==========================================
    guarantor1: {
      name: {
        type: String,
        trim: true,
        default: '',
      },

      fatherName: {
        type: String,
        trim: true,
        default: '',
      },

      mobileNumber: {
        type: String,
        trim: true,
        default: '',
      },

      cnic: {
        type: String,
        trim: true,
        default: '',
      },

      relation: {
        type: String,
        trim: true,
        default: '',
      },

      address: {
        type: String,
        trim: true,
        default: '',
      },

      // ==========================================
      // GUARANTOR 1 FINGERPRINT
      // ==========================================
      fingerprintFmd: {
        type: String,
        default: null,
      },

      fingerprintImage: {
        type: String,
        default: null,
      },

      fingerprintCapturedAt: {
        type: Date,
        default: null,
      },

      // ==========================================
      // GUARANTOR 1 LIVE CAMERA PHOTO
      // ==========================================
      liveImage: {
        type: String,
        default: null,
      },

      liveImageCapturedAt: {
        type: Date,
        default: null,
      },
    },

    // ==========================================
    // GUARANTOR #2
    // ==========================================
    guarantor2: {
      name: {
        type: String,
        trim: true,
        default: '',
      },

      fatherName: {
        type: String,
        trim: true,
        default: '',
      },

      mobileNumber: {
        type: String,
        trim: true,
        default: '',
      },

      cnic: {
        type: String,
        trim: true,
        default: '',
      },

      relation: {
        type: String,
        trim: true,
        default: '',
      },

      address: {
        type: String,
        trim: true,
        default: '',
      },

      // ==========================================
      // GUARANTOR 2 FINGERPRINT
      // ==========================================
      fingerprintFmd: {
        type: String,
        default: null,
      },

      fingerprintImage: {
        type: String,
        default: null,
      },

      fingerprintCapturedAt: {
        type: Date,
        default: null,
      },

      // ==========================================
      // GUARANTOR 2 LIVE CAMERA PHOTO
      // ==========================================
      liveImage: {
        type: String,
        default: null,
      },

      liveImageCapturedAt: {
        type: Date,
        default: null,
      },
    },
  },

  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

customerSchema.index(
  { shopId: 1, customerId: 1 },
  { unique: true }
);

customerSchema.index(
  { shopId: 1, cnic: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'Customer',
  customerSchema
);