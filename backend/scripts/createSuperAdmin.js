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

    const initialPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (
      typeof initialPassword !== 'string' ||
      initialPassword.length < 12 ||
      Buffer.byteLength(initialPassword, 'utf8') > 72
    ) {
      throw new Error(
        'SUPER_ADMIN_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes'
      );
    }

    const superAdmin = await SuperAdmin.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: initialPassword,
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
