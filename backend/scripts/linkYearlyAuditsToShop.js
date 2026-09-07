const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const YearlyAudit = require('../models/YearlyAudit');

const linkYearlyAuditsToShop = async () => {
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

    // Find yearly audits without shopId
    const auditsWithoutShop = await YearlyAudit.countDocuments({
      shopId: { $exists: false }
    });

    console.log(
      'Yearly Audits without shopId:',
      auditsWithoutShop
    );

    if (auditsWithoutShop === 0) {
      console.log(
        'All yearly audits are already linked to a Shop.'
      );

      process.exit(0);
    }

    // Link existing yearly audits to current shop
    const result = await YearlyAudit.updateMany(
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
      'Yearly Audits linked successfully:',
      result.modifiedCount
    );

    console.log(
      'Yearly Audit migration completed successfully'
    );

    process.exit(0);

  } catch (error) {
    console.error(
      'Yearly Audit migration error:',
      error
    );

    process.exit(1);
  }
};

linkYearlyAuditsToShop();