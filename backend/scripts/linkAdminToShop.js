const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const linkAdminToShop = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('MongoDB connected');

    const admin = await Admin.findOne({
      email: 'admin@shop.com',
    });

    if (!admin) {
      console.log('Admin not found: admin@shop.com');
      process.exit(1);
    }

    if (admin.shopId) {
  console.log('Admin already linked to a Shop');
  console.log('Shop ID:', admin.shopId.toString());

  const existingShop = await Shop.findById(admin.shopId);

  if (existingShop) {
    console.log('Shop FOUND:');
    console.log('Shop Name:', existingShop.shopName);
    console.log('Shop Email:', existingShop.email);
  } else {
    console.log('Shop NOT FOUND for this shopId');
  }

  process.exit(0);
}

    const shop = await Shop.create({
      shopName: 'My Electronics Shop',
      ownerName: 'Admin',
      email: 'admin@shop.com',
      phone: '',
      subscriptionPlan: 'Basic',
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: null,
    });

    admin.shopId = shop._id;

    await admin.save();

    console.log('--------------------------------');
    console.log('Shop created successfully');
    console.log('Shop ID:', shop._id.toString());
    console.log('Admin linked successfully');
    console.log('Admin:', admin.email);
    console.log('--------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Migration Error:', error);
    process.exit(1);
  }
};

linkAdminToShop();