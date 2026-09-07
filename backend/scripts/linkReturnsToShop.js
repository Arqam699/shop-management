const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Return = require('../models/Return');

const linkReturnsToShop = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Find existing admin
    const admin = await Admin.findOne();

    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    console.log('Admin found');

    // Get shop from admin
    const shopId = admin.shopId;

    if (!shopId) {
      console.log('Admin is not linked to a Shop');
      process.exit(1);
    }

    console.log('Shop ID:', shopId);

    // Verify shop exists
    const shop = await Shop.findById(shopId);

    if (!shop) {
      console.log('Shop not found');
      process.exit(1);
    }

    console.log('Shop found:', shop.shopName);

    // Find returns without shopId
    const returnsWithoutShop = await Return.countDocuments({
      shopId: { $exists: false }
    });

    console.log(
      'Returns without shopId:',
      returnsWithoutShop
    );

    if (returnsWithoutShop === 0) {
      console.log(
        'All returns are already linked to a Shop.'
      );

      process.exit(0);
    }

    // Link existing returns to current shop
    const result = await Return.updateMany(
      {
        shopId: { $exists: false }
      },
      {
        $set: {
          shopId: shopId
        }
      }
    );

    console.log(
      'Returns linked successfully:',
      result.modifiedCount
    );

    console.log('Return migration completed successfully');

    process.exit(0);

  } catch (error) {
    console.error(
      'Return migration error:',
      error
    );

    process.exit(1);
  }
};

linkReturnsToShop();