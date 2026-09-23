const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');

// ========================================================
// CLEAR AUTH COOKIE
// ========================================================

const clearAuthCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === 'production',

    sameSite:
      process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',

    expires: new Date(0),

    maxAge: 0,
  });
};

// ========================================================
// PROTECT
// ========================================================

const protect = async (req, res, next) => {
  const token = req.cookies?.token;

  // ======================================================
  // NO TOKEN
  // ======================================================

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message:
        'Not authorized, no token provided',
    });
  }

  try {
    // ====================================================
    // VERIFY JWT
    // ====================================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ====================================================
    // FIND ADMIN
    // ====================================================

    req.admin = await Admin.findById(
      decoded.userId
    ).select('-password');

    if (!req.admin) {
      clearAuthCookie(res);

      return res.status(401).json({
        success: false,
        code: 'ADMIN_NOT_FOUND',
        message:
          'Admin session expired or record deleted',
      });
    }

    // ====================================================
    // SHOP ID
    // ====================================================

    req.shopId =
      req.admin.shopId ||
      decoded.shopId;

    if (!req.shopId) {
      clearAuthCookie(res);

      return res.status(403).json({
        success: false,
        code: 'SHOP_NOT_ASSIGNED',
        message:
          'Shop is not assigned to this account',
      });
    }

    // ====================================================
    // FIND SHOP
    // ====================================================

    const shop =
      await Shop.findById(req.shopId);

    if (!shop) {
      clearAuthCookie(res);

      return res.status(403).json({
        success: false,
        code: 'SHOP_NOT_FOUND',
        message:
          'Shop account was not found',
      });
    }

    // ====================================================
    // SUSPENDED
    //
    // IMPORTANT:
    // Check this BEFORE authVersion so frontend gets
    // exact suspension information.
    // ====================================================

    if (
      shop.subscriptionStatus ===
      'Suspended'
    ) {
      clearAuthCookie(res);

      return res.status(403).json({
        success: false,

        code: 'ACCOUNT_SUSPENDED',

        accountSuspended: true,

        message:
          'Your shop account has been suspended. Please contact the administrator.',

        suspensionReason:
          shop.suspensionReason ||
          'No suspension reason was provided.',
      });
    }

    // ====================================================
    // SUBSCRIPTION EXPIRED BY DATE
    // ====================================================

    if (
      shop.subscriptionExpiresAt &&
      new Date() >=
        new Date(
          shop.subscriptionExpiresAt
        )
    ) {
      if (
        shop.subscriptionStatus !==
        'Expired'
      ) {
        shop.subscriptionStatus =
          'Expired';

        await shop.save();
      }

      clearAuthCookie(res);

      return res.status(403).json({
        success: false,

        code:
          'SUBSCRIPTION_EXPIRED',

        message:
          'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }

    // ====================================================
    // ALREADY EXPIRED
    // ====================================================

    if (
      shop.subscriptionStatus ===
      'Expired'
    ) {
      clearAuthCookie(res);

      return res.status(403).json({
        success: false,

        code:
          'SUBSCRIPTION_EXPIRED',

        message:
          'Your subscription has expired. Please contact the administrator to renew your access.',
      });
    }

    // ====================================================
    // AUTH VERSION CHECK
    //
    // Old JWT = old version
    // Shop = new version
    //
    // Therefore old session is rejected.
    // ====================================================

    const tokenAuthVersion =
      Number(decoded.authVersion) || 0;

    const currentAuthVersion =
      Number(shop.authVersion) || 0;

    if (
      tokenAuthVersion !==
      currentAuthVersion
    ) {
      clearAuthCookie(res);

      return res.status(401).json({
        success: false,

        code: 'SESSION_REVOKED',

        message:
          'Your session has been revoked. Please log in again.',
      });
    }

    // ====================================================
    // ATTACH SHOP
    // ====================================================

    req.shop = shop;

    next();
  } catch (error) {
    console.error(
      'Authentication Middleware Error:',
      error
    );

    clearAuthCookie(res);

    // ====================================================
    // TOKEN EXPIRED
    // ====================================================

    if (
      error.name ===
      'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,

        code: 'TOKEN_EXPIRED',

        message:
          'Your session has expired. Please log in again.',
      });
    }

    // ====================================================
    // INVALID TOKEN
    // ====================================================

    return res.status(401).json({
      success: false,

      code: 'INVALID_TOKEN',

      message:
        'Not authorized, invalid token',
    });
  }
};

module.exports = {
  protect,
};