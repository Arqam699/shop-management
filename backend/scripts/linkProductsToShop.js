const mongoose = require('mongoose');
const Product = require('../models/Product');
const Admin = require('../models/Admin');

const linkProductsToShop = async () => {
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

    // Find products without shopId
    const productsWithoutShop = await Product.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Products without shopId: ${productsWithoutShop.length}`
    );

    if (productsWithoutShop.length === 0) {
      console.log('All products are already linked to a Shop.');
      process.exit(0);
    }

    // Link existing products to current shop
    const result = await Product.updateMany(
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
      `Products successfully linked: ${result.modifiedCount}`
    );

    console.log('Product migration completed successfully.');

    process.exit(0);

  } catch (error) {
    console.error('Product migration error:', error);
    process.exit(1);
  }
};

require('dotenv').config();

linkProductsToShop();