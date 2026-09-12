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

    // Security: three incorrect passwords suspend the linked shop until the
    // Super Admin activates it again.
    failedLoginAttempts: {
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
