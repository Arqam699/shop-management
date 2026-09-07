const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Admin = require('../models/Admin');

const linkExpensesToShop = async () => {
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

    const expensesWithoutShop = await Expense.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null }
      ]
    });

    console.log(
      `Expenses without shopId: ${expensesWithoutShop.length}`
    );

    if (expensesWithoutShop.length === 0) {
      console.log('All expenses are already linked to a Shop.');
      process.exit(0);
    }

    const result = await Expense.updateMany(
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
      `Expenses successfully linked: ${result.modifiedCount}`
    );

    console.log('Expense migration completed successfully.');

    process.exit(0);

  } catch (error) {
    console.error('Expense migration error:', error);
    process.exit(1);
  }
};

require('dotenv').config();

linkExpensesToShop();
