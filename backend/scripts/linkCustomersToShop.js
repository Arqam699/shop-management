const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');

const linkCustomersToShop = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    // Find existing admin
    const admin = await Admin.findOne({
      email: 'admin@shop.com'
    });

    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    if (!admin.shopId) {
      console.log('Admin does not have a shopId');
      process.exit(1);
    }

    console.log('Admin found');
    console.log('Shop ID:', admin.shopId.toString());

    // Find customers that don't have a shopId
    const customersWithoutShop = await Customer.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Customers without shopId: ${customersWithoutShop.length}`
    );

    if (customersWithoutShop.length === 0) {
      console.log('All customers are already linked to a Shop.');
      process.exit(0);
    }

    // Link all existing customers to current shop
    const result = await Customer.updateMany(
      {
        $or: [
          { shopId: { $exists: false } },
          { shopId: null }
        ]
      },
      {
        $set: {
          shopId: admin.shopId
        }
      }
    );

    console.log(
      `Customers successfully linked: ${result.modifiedCount}`
    );

    console.log('Customer migration completed successfully.');

    process.exit(0);

  } catch (error) {
    console.error('Customer migration error:', error);
    process.exit(1);
  }
};

require('dotenv').config();

linkCustomersToShop();