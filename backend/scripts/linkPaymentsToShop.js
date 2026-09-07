const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Payment = require('../models/Payment');

const linkPaymentsToShop = async () => {
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

    // Find payments without shopId
    const paymentsWithoutShop = await Payment.countDocuments({
      shopId: { $exists: false }
    });

    console.log(
      'Payments without shopId:',
      paymentsWithoutShop
    );

    if (paymentsWithoutShop === 0) {
      console.log(
        'All payments are already linked to a Shop.'
      );

      process.exit(0);
    }

    // Link all existing payments to current shop
    const result = await Payment.updateMany(
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
      'Payments linked successfully:',
      result.modifiedCount
    );

    console.log('Payment migration completed successfully');

    process.exit(0);

  } catch (error) {
    console.error(
      'Payment migration error:',
      error
    );

    process.exit(1);
  }
};

linkPaymentsToShop();