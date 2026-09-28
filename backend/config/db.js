const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // ------------------------------------------------------
      // CONNECTION POOLING + TIMEOUTS
      //
      // Reuses connections instead of opening a new one per
      // request and fails fast when Atlas is unreachable
      // instead of hanging the API.
      // ------------------------------------------------------
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;