const crypto = require('crypto');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Settings = require('../models/Settings');

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
let verificationIndexesPromise;

const getVerificationCollection = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connection.asPromise();
  }

  const collection = mongoose.connection.collection('demo_email_verifications');
  if (!verificationIndexesPromise) {
    verificationIndexesPromise = Promise.all([
      collection.createIndex({ email: 1 }, { unique: true }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error) => {
      verificationIndexesPromise = null;
      throw error;
    });
  }
  await verificationIndexesPromise;
  return collection;
};

const makeCodeHash = (email, code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET || '')
  .update(`${email}:${code}`)
  .digest('hex');

const sendVerificationEmail = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !process.env.JWT_SECRET) {
    return { configured: false };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your shop demo verification code`,
      text: `Your email verification code is ${code}. It expires in 10 minutes. If you did not request a shop demo, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a"><h2>Verify your email</h2><p>Use this code to create your 7-day shop demo:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center">${code}</p><p>This code expires in 10 minutes. If you did not request a demo, ignore this email.</p></div>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Demo verification email delivery failed:', response.status, detail.slice(0, 500));
    return { sent: false };
  }
  return { sent: true };
};

const requestDemoEmailVerification = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 254 || !validEmail.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address to receive your verification code.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, code: 'EMAIL_VERIFICATION_UNAVAILABLE', message: 'Email verification is not configured yet. Please contact support.' });
  }

  try {
    if (await Admin.exists({ email })) {
      return res.status(409).json({ success: false, code: 'EMAIL_ALREADY_REGISTERED', message: 'An account already uses this email. Please sign in or contact support for help.' });
    }

    const collection = await getVerificationCollection();
    const now = new Date();
    const existing = await collection.findOne({ email });
    if (existing?.sentAt && now.getTime() - new Date(existing.sentAt).getTime() < 60_000) {
      return res.status(429).json({ success: false, code: 'VERIFICATION_COOLDOWN', message: 'Please wait a minute before requesting another code.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = makeCodeHash(email, code);
    await collection.updateOne(
      { email },
      { $set: { codeHash, expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS), sentAt: now, attempts: 0 } },
      { upsert: true }
    );

    const delivery = await sendVerificationEmail(email, code);
    if (!delivery.sent) {
      await collection.deleteOne({ email, codeHash });
      return res.status(502).json({ success: false, message: 'We could not send the verification email. Check the address or try again later.' });
    }

    return res.status(200).json({ success: true, message: 'Verification code sent. Check your inbox and spam folder.' });
  } catch (error) {
    console.error('Request Demo Email Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Could not send a verification code right now. Please try again shortly.' });
  }
};

const createDemoShop = async (req, res) => {
  const { shopName, ownerName, email, phone = '', website = '', verificationCode = '' } = req.body || {};

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
    cleanPhone.length > 30 || !/^\d{6}$/.test(String(verificationCode))
  ) {
    return res.status(400).json({ success: false, message: 'Please check your details and enter the 6-digit email verification code.' });
  }

  const temporaryPassword = crypto.randomBytes(18).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let session;

  try {
    const verificationCollection = await getVerificationCollection();
    const providedCodeHash = makeCodeHash(cleanEmail, String(verificationCode));
    const consumedVerification = await verificationCollection.deleteOne({
      email: cleanEmail,
      codeHash: providedCodeHash,
      expiresAt: { $gt: now },
      attempts: { $lt: 5 },
    });
    if (!consumedVerification.deletedCount) {
      const pending = await verificationCollection.findOne({ email: cleanEmail, expiresAt: { $gt: now } });
      if (pending && pending.attempts < 4) {
        await verificationCollection.updateOne({ _id: pending._id }, { $inc: { attempts: 1 } });
      } else if (pending) {
        await verificationCollection.deleteOne({ _id: pending._id });
      }
      return res.status(400).json({ success: false, code: 'INVALID_VERIFICATION_CODE', message: 'That code is incorrect or expired. Request a new code and try again.' });
    }

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

module.exports = { createDemoShop, requestDemoEmailVerification };
