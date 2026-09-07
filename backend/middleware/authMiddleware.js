const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const Shop = require('../models/Shop');

const protect = async (req, res, next) => {

  let token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {

    // =====================================================
    // VERIFY JWT
    // =====================================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );


    // =====================================================
    // FIND ADMIN
    // =====================================================

    req.admin = await Admin.findById(
      decoded.userId
    ).select('-password');

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin session expired or record deleted'
      });
    }


    // =====================================================
    // GET SHOP ID FROM AUTHENTICATED ADMIN
    // =====================================================

    req.shopId = req.admin.shopId;

    if (!req.shopId) {
      return res.status(403).json({
        success: false,
        message: 'Shop is not assigned to this account'
      });
    }


    // =====================================================
    // FIND SHOP
    // =====================================================

    const shop = await Shop.findById(req.shopId);

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: 'Shop account not found'
      });
    }


    // =====================================================
    // CHECK SUSPENDED SHOP
    // =====================================================

    if (shop.subscriptionStatus === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your shop account has been suspended. Please contact the administrator.'
      });
    }


    // =====================================================
    // CHECK SUBSCRIPTION EXPIRY
    // =====================================================

    if (
      shop.subscriptionExpiresAt &&
      new Date() >= new Date(shop.subscriptionExpiresAt)
    ) {

      // Automatically mark subscription as expired
      if (shop.subscriptionStatus !== 'Expired') {

        shop.subscriptionStatus = 'Expired';

        await shop.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please contact the administrator to renew your access.'
      });
    }


    // =====================================================
    // CHECK ALREADY EXPIRED STATUS
    // =====================================================

    if (shop.subscriptionStatus === 'Expired') {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please contact the administrator to renew your access.'
      });
    }


    // =====================================================
    // MAKE SHOP AVAILABLE TO CONTROLLERS
    // =====================================================

    req.shop = shop;


    // =====================================================
    // CONTINUE
    // =====================================================

    next();

  } catch (error) {

    console.error('Authentication Middleware Error:', error);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid token'
    });

  }
};

module.exports = { protect };