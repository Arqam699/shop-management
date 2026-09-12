const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const { generateToken } = require('../utils/token');

// @desc    Admin login & get token
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({
      email: cleanEmail,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // A suspension must block new logins immediately. Existing sessions are
    // blocked by the same shop-status check in protect middleware.
    if (admin.shopId) {
      const assignedShop = await Shop.findById(admin.shopId)
        .select('subscriptionStatus subscriptionExpiresAt');

      if (assignedShop?.subscriptionStatus === 'Suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your shop account has been suspended. Please contact the administrator.',
        });
      }
    }

    // Verify password using bcrypt hash
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      const updatedAdmin = await Admin.findByIdAndUpdate(
        admin._id,
        { $inc: { failedLoginAttempts: 1 } },
        { returnDocument: 'after' }
      ).select('failedLoginAttempts shopId');

      if (updatedAdmin?.failedLoginAttempts >= 3 && updatedAdmin.shopId) {
        await Shop.updateOne(
          { _id: updatedAdmin.shopId },
          {
            $set: {
              subscriptionStatus: 'Suspended',
              suspensionReason: 'Suspended automatically after 3 incorrect password attempts.',
              suspendedAt: new Date(),
            },
          }
        );

        return res.status(403).json({
          success: false,
          message: 'Your shop account has been suspended after 3 incorrect password attempts. Please contact the Super Admin.',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // A correct password clears earlier failed attempts.
    if (admin.failedLoginAttempts > 0) {
      await Admin.updateOne(
        { _id: admin._id },
        { $set: { failedLoginAttempts: 0 } }
      );
    }


    // =====================================================
    // CHECK SHOP ASSIGNMENT
    // =====================================================

    if (!admin.shopId) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not assigned to a shop',
      });
    }


    // =====================================================
    // FIND SHOP
    // =====================================================

    const shop = await Shop.findById(admin.shopId);

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: 'Your shop account was not found',
      });
    }


    // =====================================================
    // CHECK SUSPENDED SHOP
    // =====================================================

    if (shop.subscriptionStatus === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your shop account has been suspended. Please contact the administrator.',
      });
    }


    // =====================================================
    // CHECK SUBSCRIPTION EXPIRY
    // =====================================================

    if (
      shop.subscriptionExpiresAt &&
      new Date() >= new Date(shop.subscriptionExpiresAt)
    ) {

      // Automatically update status to Expired
      if (shop.subscriptionStatus !== 'Expired') {
        shop.subscriptionStatus = 'Expired';
        await shop.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }


    // =====================================================
    // CHECK ALREADY EXPIRED STATUS
    // =====================================================

    if (shop.subscriptionStatus === 'Expired') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }

    // A browser profile receives one random ID from the frontend. Passwords
    // are verified before this check, so an outsider cannot suspend a shop by
    // sending arbitrary device IDs without knowing its password.
    const deviceId = String(req.get('X-Device-Id') || '').trim();

    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'Device identity is missing. Please refresh the application and try again.',
      });
    }

    const deviceIndex = shop.authorizedDevices.findIndex(
      (device) => device.deviceId === deviceId
    );

    // A third *different* device locks the entire shop immediately. Existing
    // sessions are blocked too by the shop-status check in auth middleware.
    if (deviceIndex === -1 && shop.authorizedDevices.length >= 2) {
      shop.subscriptionStatus = 'Suspended';
      shop.suspensionReason = 'Suspended automatically because a third device attempted to log in.';
      shop.suspendedAt = new Date();
      await shop.save();

      return res.status(403).json({
        success: false,
        message: 'Your shop account has been suspended because a third device attempted to log in. Please contact the Super Admin.',
      });
    }

    const deviceSeenAt = new Date();

    if (deviceIndex >= 0) {
      shop.authorizedDevices[deviceIndex].lastSeenAt = deviceSeenAt;
    } else {
      shop.authorizedDevices.push({
        deviceId,
        firstSeenAt: deviceSeenAt,
        lastSeenAt: deviceSeenAt,
      });
    }

    // Log successful login IP for Super Admin security review. Express uses
    // the trusted proxy setting in production, so req.ip resolves the client
    // address instead of the hosting platform's internal address.
    const clientIp = String(req.ip || '')
      .replace(/^::ffff:/, '') || 'Unknown';
    const loggedInAt = new Date();

    shop.lastLoginIp = clientIp;
    shop.lastLoginAt = loggedInAt;
    shop.loginIpHistory.push({
      ip: clientIp,
      adminEmail: admin.email,
      loggedInAt,
    });
    // Keep only the newest 50 successful-login audit entries.
    if (shop.loginIpHistory.length > 50) {
      shop.loginIpHistory = shop.loginIpHistory.slice(-50);
    }
    await shop.save();


    // =====================================================
    // GENERATE JWT
    // =====================================================

    generateToken(
      res,
      admin._id,
      admin.shopId
    );


    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        email: admin.email,
        shopId: admin.shopId,
      },
    });

  } catch (error) {

    console.error('Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


// @desc    Admin logout / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutAdmin = (req, res) => {

  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production'
      ? 'none'
      : 'lax',
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};


// @desc    Get current session status
// @route   GET /api/auth/me
// @access  Private
const getAdminProfile = async (req, res) => {
  try {

    if (!req.admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: req.admin.email,
        shopId: req.shopId,
      },
    });

  } catch (error) {

    console.error('Get Admin Profile Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


module.exports = {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
};
