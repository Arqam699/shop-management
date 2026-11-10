const crypto = require('crypto');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Settings = require('../models/Settings');

const createDemoShop = async (req, res) => {
  const { shopName, ownerName, email, phone = '', website = '' } = req.body || {};

  // Honeypot for simple signup bots. Return a generic success without creating data.
  if (typeof website === 'string' && website.trim()) {
    return res.status(201).json({ success: true });
  }

  if (
    typeof shopName !== 'string' ||
    typeof ownerName !== 'string' ||
    typeof email !== 'string'
  ) {
    return res.status(400).json({ success: false, message: 'Please enter your shop name, your name, and a valid email address.' });
  }

  const cleanShopName = shopName.trim();
  const cleanOwnerName = ownerName.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    cleanShopName.length < 2 || cleanShopName.length > 100 ||
    cleanOwnerName.length < 2 || cleanOwnerName.length > 100 ||
    cleanEmail.length > 254 || !validEmail.test(cleanEmail) ||
    cleanPhone.length > 30
  ) {
    return res.status(400).json({ success: false, message: 'Please check the shop name, your name, email, and phone number.' });
  }

  const temporaryPassword = crypto.randomBytes(18).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let session;

  try {
    const existingAdmin = await Admin.exists({ email: cleanEmail });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account already uses this email. Please sign in or contact support for help.',
      });
    }

    session = await mongoose.startSession();
    let createdShop;
    await session.withTransaction(async () => {
      const [shop] = await Shop.create([{
        shopName: cleanShopName,
        ownerName: cleanOwnerName,
        email: cleanEmail,
        phone: cleanPhone,
        monthlyCharge: 0,
        subscriptionPlan: 'Free Trial',
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: expiresAt,
        subscriptionHistory: [],
        mustChangePassword: true,
        authorizedDevices: [],
        authVersion: 0,
      }], { session });

      await Admin.create([{
        email: cleanEmail,
        shopId: shop._id,
        password: temporaryPassword,
        failedLoginAttempts: 0,
      }], { session });

      await Settings.create([{
        shopId: shop._id,
        shopName: cleanShopName,
        shopEmail: cleanEmail,
        shopPhone: cleanPhone,
      }], { session });

      createdShop = shop;
    });

    return res.status(201).json({
      success: true,
      message: 'Your 7-day demo is ready. Sign in with these details and choose your own password.',
      data: {
        shopName: createdShop.shopName,
        email: cleanEmail,
        temporaryPassword,
        expiresAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account already uses this email. Please sign in or contact support for help.',
      });
    }

    console.error('Create Demo Shop Error:', error);
    return res.status(500).json({ success: false, message: 'We could not create your demo right now. Please try again shortly.' });
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = { createDemoShop };
