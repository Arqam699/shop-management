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
  clearShopDevices,
  updateShopMonthlyCharge,
  renewShopSubscription,
  permanentlyDeleteShop,
  resetShopAdminPassword,
  getShopPasswordHistory,
  recordShopPayment,
  deleteShopPayment,
  updateShopNotes,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  updateShopDetails,
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

router.get(
  '/me',
  protectSuperAdmin,
  (req, res) => {
    return res.status(200).json({
      success: true,

      superAdmin: {
        id:
          req.superAdmin._id,

        name:
          req.superAdmin.name,

        email:
          req.superAdmin.email,

        role:
          req.superAdmin.role,
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

router.patch(
  '/shops/:shopId/authorized-devices/clear',
  protectSuperAdmin,
  clearShopDevices
);


// =====================================================
// UPDATE MONTHLY CHARGE
// =====================================================

router.patch(
  '/shops/:shopId/monthly-charge',
  protectSuperAdmin,
  updateShopMonthlyCharge
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
// GET SHOP PASSWORD HISTORY
// =====================================================

router.get(
  '/shops/:shopId/password-history',
  protectSuperAdmin,
  getShopPasswordHistory
);


// =====================================================
// RECORD SHOP PAYMENT (Monthly Collection)
// =====================================================

router.post(
  '/shops/:shopId/payments',
  protectSuperAdmin,
  recordShopPayment
);


// =====================================================
// DELETE SHOP PAYMENT
// =====================================================

router.delete(
  '/shops/:shopId/payments/:paymentId',
  protectSuperAdmin,
  deleteShopPayment
);


// =====================================================
// UPDATE SHOP NOTES (Super Admin private notes)
// =====================================================

router.patch(
  '/shops/:shopId/notes',
  protectSuperAdmin,
  updateShopNotes
);


// =====================================================
// ANNOUNCEMENTS (Broadcast notices)
// =====================================================

router.get(
  '/announcements',
  protectSuperAdmin,
  getAnnouncements
);

router.post(
  '/announcements',
  protectSuperAdmin,
  createAnnouncement
);

router.patch(
  '/announcements/:id',
  protectSuperAdmin,
  updateAnnouncement
);

router.delete(
  '/announcements/:id',
  protectSuperAdmin,
  deleteAnnouncement
);


// =====================================================
// UPDATE SHOP DETAILS
// =====================================================

router.patch(
  '/shops/:shopId/details',
  protectSuperAdmin,
  updateShopDetails
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
