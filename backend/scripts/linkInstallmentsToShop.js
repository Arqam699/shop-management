const mongoose = require('mongoose');
const Installment = require('../models/Installment');
const Admin = require('../models/Admin');

const linkInstallmentsToShop = async () => {
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

    const installmentsWithoutShop = await Installment.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Installments without shopId: ${installmentsWithoutShop.length}`
    );

    if (installmentsWithoutShop.length === 0) {
      console.log(
        'All installments are already linked to a Shop.'
      );
      process.exit(0);
    }

    const result = await Installment.updateMany(
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
      `Installments successfully linked: ${result.modifiedCount}`
    );

    console.log(
      'Installment migration completed successfully.'
    );

    process.exit(0);

  } catch (error) {
    console.error(
      'Installment migration error:',
      error
    );

    process.exit(1);
  }
};

require('dotenv').config();

linkInstallmentsToShop();