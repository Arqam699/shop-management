const mongoose = require('mongoose');
const InstallmentPlan = require('../models/InstallmentPlan');
const Admin = require('../models/Admin');

const linkInstallmentPlansToShop = async () => {
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

    const plansWithoutShop = await InstallmentPlan.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Installment Plans without shopId: ${plansWithoutShop.length}`
    );

    if (plansWithoutShop.length === 0) {
      console.log(
        'All installment plans are already linked to a Shop.'
      );
      process.exit(0);
    }

    const result = await InstallmentPlan.updateMany(
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
      `Installment Plans successfully linked: ${result.modifiedCount}`
    );

    console.log(
      'Installment Plan migration completed successfully.'
    );

    process.exit(0);

  } catch (error) {
    console.error(
      'Installment Plan migration error:',
      error
    );

    process.exit(1);
  }
};

require('dotenv').config();

linkInstallmentPlansToShop();