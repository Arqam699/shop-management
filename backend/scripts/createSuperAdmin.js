const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SuperAdmin = require('../models/SuperAdmin');

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const existingSuperAdmin = await SuperAdmin.findOne({
      email: process.env.SUPER_ADMIN_EMAIL,
    });

    if (existingSuperAdmin) {
      console.log('Super Admin already exists');
      console.log('Email:', existingSuperAdmin.email);

      await mongoose.connection.close();
      return;
    }

    const superAdmin = await SuperAdmin.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    });

    console.log('Super Admin created successfully');
    console.log('Name:', superAdmin.name);
    console.log('Email:', superAdmin.email);
    console.log('Role:', superAdmin.role);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');

  } catch (error) {
    console.error('Error creating Super Admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();