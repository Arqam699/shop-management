const express = require('express');

const router = express.Router();


// =====================================================
// CONTROLLERS
// =====================================================

const {
  loginSuperAdmin,
  logoutSuperAdmin,
  createShopAdmin,
  getAllShops,
  getDashboardStats,
  suspendShop,
  activateShop,
  renewShopSubscription,
  permanentlyDeleteShop,
  resetShopAdminPassword,
} = require('../controllers/superAdminController');


// =====================================================
// MIDDLEWARE
// =====================================================

const {
  protectSuperAdmin,
} = require('../middleware/superAdminMiddleware');


// =====================================================
// SUPER ADMIN LOGIN
// =====================================================
// Public route
// Creates superAdminToken cookie
// =====================================================

router.post(
  '/login',
  loginSuperAdmin
);


// =====================================================
// SUPER ADMIN LOGOUT
// =====================================================

router.post(
  '/logout',
  protectSuperAdmin,
  logoutSuperAdmin
);


// =====================================================
// SUPER ADMIN ME
// =====================================================
// Used by frontend to verify that the Super Admin
// session/cookie is still valid.
// =====================================================

router.get(
  '/me',
  protectSuperAdmin,
  (req, res) => {
    return res.status(200).json({
      success: true,

      superAdmin: {
        id: req.superAdmin._id,
        name: req.superAdmin.name,
        email: req.superAdmin.email,
        role: req.superAdmin.role,
      },
    });
  }
);


// =====================================================
// GET ALL SHOPS
// =====================================================

router.get(
  '/shops',
  protectSuperAdmin,
  getAllShops
);


// =====================================================
// GET DASHBOARD STATS
// =====================================================

router.get(
  '/dashboard',
  protectSuperAdmin,
  getDashboardStats
);


// =====================================================
// CREATE SHOP
// =====================================================

router.post(
  '/shops',
  protectSuperAdmin,
  createShopAdmin
);


// =====================================================
// SUSPEND SHOP
// =====================================================

router.patch(
  '/shops/:shopId/suspend',
  protectSuperAdmin,
  suspendShop
);


// =====================================================
// ACTIVATE SHOP
// =====================================================

router.patch(
  '/shops/:shopId/activate',
  protectSuperAdmin,
  activateShop
);


// =====================================================
// RENEW SUBSCRIPTION
// =====================================================

router.patch(
  '/shops/:shopId/subscription',
  protectSuperAdmin,
  renewShopSubscription
);


// =====================================================
// RESET SHOP ADMIN PASSWORD
// =====================================================

router.patch(
  '/shops/:shopId/password',
  protectSuperAdmin,
  resetShopAdminPassword
);


// =====================================================
// PERMANENTLY DELETE SHOP
// =====================================================
// Requires:
// 1. Valid Super Admin cookie
// 2. Super Admin password
// 3. Exact shop-name confirmation
// =====================================================

router.delete(
  '/shops/:shopId',
  protectSuperAdmin,
  permanentlyDeleteShop
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;