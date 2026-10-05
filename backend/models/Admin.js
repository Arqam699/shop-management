const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null,
    },

    password: {
      type: String,
      required: true,
      minlength: [12, 'Admin password must be at least 12 characters long'],
    },

    // Deletion Mode
    deletionMode: {
      type: Boolean,
      default: false,
    },

    deletionModeExpiresAt: {
      type: Date,
      default: null,
    },

    // Failed login counter for monitoring. It must never suspend a shop,
    // since public login attempts could otherwise be used for denial of service.
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Increment to revoke every existing session for this admin account.
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Compare password
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
