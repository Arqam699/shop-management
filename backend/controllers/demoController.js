const crypto = require('crypto');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');

const validateEmail = (email) => typeof email === 'string' && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const sendDemoEmailOtp = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return res.status(503).json({ success: false, message: 'Email verification is not configured yet.' });
  try {
    if (await Admin.exists({ email })) return res.status(409).json({ success: false, code: 'EMAIL_ALREADY_REGISTERED', message: 'An account already uses this email. Please sign in or contact support.' });
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = crypto.createHash('sha256').update(`${email}:${otp}:${process.env.JWT_SECRET}`).digest('hex');
    const otpCollection = mongoose.connection.collection('demo_email_otps');
    await otpCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await otpCollection.updateOne({ email }, { $set: { email, codeHash, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } }, { upsert: true });
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: 'Your demo verification code', text: `Your verification code is ${otp}. It expires in 10 minutes.` }),
    });
    if (!response.ok) { console.error('Resend email error:', response.status); return res.status(502).json({ success: false, message: 'Could not send the verification email. Please try again.' }); }
    return res.json({ success: true, message: 'Verification code sent.' });
  } catch (error) {
    console.error('Demo OTP send error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not send the verification email.' });
  }
};

const verifyDemoEmailOtp = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  if (!validateEmail(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Enter the six-digit code sent to your email.' });
  const otpHash = crypto.createHash('sha256').update(`${email}:${otp}:${process.env.JWT_SECRET}`).digest('hex');
  const otpCollection = mongoose.connection.collection('demo_email_otps');
  const record = await otpCollection.findOne({ email });
  if (!record || record.expiresAt < new Date() || record.attempts >= 5 || record.codeHash !== otpHash) {
    if (record) await otpCollection.updateOne({ email }, { $inc: { attempts: 1 } });
    return res.status(400).json({ success: false, message: 'That code is invalid or expired. Request a new code and try again.' });
  }
  await otpCollection.deleteOne({ email });
  const verificationToken = jwt.sign({ purpose: 'demo-email', email }, process.env.JWT_SECRET, { expiresIn: '15m' });
  return res.json({ success: true, verificationToken });
};


const createDemoShop = async (req, res) => {
  const { shopName, ownerName, email, phone, website = '', verificationToken } = req.body || {};

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
  try {
    const verified = jwt.verify(String(verificationToken || ''), process.env.JWT_SECRET);
    if (verified.purpose !== 'demo-email' || verified.email !== cleanEmail) throw new Error('Email mismatch');
  } catch {
    return res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before creating a demo account.' });
  }
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = cleanPhone.replace(/\D/g, '');
  const validPhone = /^[+0-9][0-9\s().-]*$/.test(cleanPhone) && phoneDigits.length >= 7 && phoneDigits.length <= 15;

  if (
    cleanShopName.length < 2 || cleanShopName.length > 100 ||
    cleanOwnerName.length < 2 || cleanOwnerName.length > 100 ||
    cleanEmail.length > 254 || !validEmail.test(cleanEmail) ||
    cleanPhone.length > 30 || !validPhone
  ) {
    return res.status(400).json({ success: false, message: 'Please check the shop name, your name, email, and enter a valid phone number with 7 to 15 digits.' });
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
        isDemoAccount: true,
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

module.exports = { createDemoShop, sendDemoEmailOtp, verifyDemoEmailOtp };
