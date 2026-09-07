const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Admin = require('../models/Admin');

const linkSalesToShop = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

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

    const salesWithoutShop = await Sale.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Sales without shopId: ${salesWithoutShop.length}`
    );

    if (salesWithoutShop.length === 0) {
      console.log(
        'All sales are already linked to a Shop.'
      );
      process.exit(0);
    }

    const result = await Sale.updateMany(
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
      `Sales successfully linked: ${result.modifiedCount}`
    );

    console.log(
      'Sale migration completed successfully.'
    );

    process.exit(0);

  } catch (error) {
    console.error(
      'Sale migration error:',
      error
    );

    process.exit(1);
  }
};

require('dotenv').config();

linkSalesToShop();