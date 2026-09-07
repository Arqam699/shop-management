
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const SuperAdmin = require('../models/SuperAdmin');


// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================

dotenv.config();


// =====================================================
// RESET SUPER ADMIN PASSWORD
// =====================================================

const resetSuperAdminPassword = async () => {
  try {

    // ---------------------------------------------------
    // CONNECT TO MONGODB
    // ---------------------------------------------------

    await connectDB();


    // ---------------------------------------------------
    // GET SUPER ADMIN CREDENTIALS FROM .ENV
    // ---------------------------------------------------

    const email = (
      process.env.SUPER_ADMIN_EMAIL ||
      'superadmin@shop.com'
    )
      .trim()
      .toLowerCase();


    const password =
      process.env.SUPER_ADMIN_PASSWORD;


    // ---------------------------------------------------
    // VALIDATE PASSWORD
    // ---------------------------------------------------

    if (!password) {

      throw new Error(
        'SUPER_ADMIN_PASSWORD is missing from .env'
      );
    }


    if (password.length < 6) {

      throw new Error(
        'SUPER_ADMIN_PASSWORD must be at least 6 characters'
      );
    }


    // ---------------------------------------------------
    // FIND SUPER ADMIN
    // ---------------------------------------------------

    const superAdmin =
      await SuperAdmin.findOne({
        email: email,
      });


    // ---------------------------------------------------
    // SUPER ADMIN NOT FOUND
    // ---------------------------------------------------

    if (!superAdmin) {

      console.log(
        '--------------------------------------------------'
      );

      console.log(
        `Super Admin not found for email: ${email}`
      );

      console.log(
        'Please make sure the Super Admin account exists in the database.'
      );

      console.log(
        '--------------------------------------------------'
      );

      process.exitCode = 1;

      return;
    }


    // ---------------------------------------------------
    // UPDATE PASSWORD
    // ---------------------------------------------------
    //
    // SuperAdmin.js contains a pre-save bcrypt hook.
    //
    // Therefore we assign the plain password here.
    //
    // When save() runs, SuperAdmin.js automatically
    // hashes the password before storing it in MongoDB.
    // ---------------------------------------------------

    superAdmin.password =
      password;


    await superAdmin.save();


    // ---------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------

    console.log(
      '=================================================='
    );

    console.log(
      'SUPER ADMIN PASSWORD RESET SUCCESSFUL'
    );

    console.log(
      '=================================================='
    );

    console.log(
      `Email: ${email}`
    );

    console.log(
      'Password updated from SUPER_ADMIN_PASSWORD in .env'
    );

    console.log(
      'The password is stored in MongoDB as a bcrypt hash.'
    );

    console.log(
      '=================================================='
    );

  } catch (error) {

    // ---------------------------------------------------
    // ERROR
    // ---------------------------------------------------

    console.error(
      '=================================================='
    );

    console.error(
      'SUPER ADMIN PASSWORD RESET ERROR'
    );

    console.error(
      '=================================================='
    );

    console.error(
      error.message
    );

    console.error(
      '=================================================='
    );

    process.exitCode = 1;

  } finally {

    // ---------------------------------------------------
    // CLOSE DATABASE CONNECTION
    // ---------------------------------------------------

    try {

      await mongoose.connection.close();

      console.log(
        'MongoDB connection closed.'
      );

    } catch (closeError) {

      console.error(
        'Error while closing MongoDB connection:',
        closeError.message
      );
    }
  }
};


// =====================================================
// RUN
// =====================================================

resetSuperAdminPassword();
