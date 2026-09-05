const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true }, // Auto-generated e.g. CUST-0001
    fullName: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    alternateMobileNumber: { type: String, trim: true },
    cnic: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    }, 
    address: { type: String, required: true, trim: true },
    city: { type: String, default: 'Sangla Hill', trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },

    // DEDICATED ZAMANATDAR #1 (ZAMANTI 1)
    guarantor1: {
      name: { type: String, trim: true, default: '' },
      fatherName: { type: String, trim: true, default: '' },
      mobileNumber: { type: String, trim: true, default: '' },
      cnic: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' }, // e.g. Brother, Friend, Uncle
      address: { type: String, trim: true, default: '' }
    },

    // DEDICATED ZAMANATDAR #2 (ZAMANTI 2)
    guarantor2: {
      name: { type: String, trim: true, default: '' },
      fatherName: { type: String, trim: true, default: '' },
      mobileNumber: { type: String, trim: true, default: '' },
      cnic: { type: String, trim: true, default: '' },
      relation: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);