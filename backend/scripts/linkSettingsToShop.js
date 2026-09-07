const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Settings = require('../models/Settings');

dotenv.config();

const linkSettingsToShop = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const admin = await Admin.findOne();

    if (!admin) {
      console.log('Admin not found');
      process.exit(1);
    }

    if (!admin.shopId) {
      console.log('Admin is not linked to a Shop');
      process.exit(1);
    }

    const shopId = admin.shopId;

    console.log('Shop ID:', shopId);

    const shop = await Shop.findById(shopId);

    if (!shop) {
      console.log('Shop not found');
      process.exit(1);
    }

    console.log('Shop found:', shop.shopName);

    const settingsWithoutShop =
      await Settings.find({
        shopId: { $exists: false }
      });

    console.log(
      'Settings without shopId:',
      settingsWithoutShop.length
    );

    if (settingsWithoutShop.length === 0) {
      console.log(
        'All settings are already linked to a Shop.'
      );

      process.exit(0);
    }

    await Settings.updateMany(
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
      'All Settings successfully linked to Shop.'
    );

    process.exit(0);

  } catch (error) {
    console.error(
      'Migration Error:',
      error
    );

    process.exit(1);
  }
};

linkSettingsToShop();