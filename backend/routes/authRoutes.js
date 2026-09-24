const express = require('express');

const router = express.Router();

const {
  loginAdmin,
  changeAdminPassword,
  logoutAdmin,
  getAdminProfile,
} = require('../controllers/authController');

const {
  protect,
} = require('../middleware/authMiddleware');

// ========================================================
// LOGIN
// ========================================================

router.post(
  '/login',
  loginAdmin
);

// ========================================================
// CHANGE PASSWORD
//
// Used when:
// 1. New shop admin logs in for first time
// 2. Super Admin resets admin password
// ========================================================

router.patch(
  '/change-password',
  protect,
  changeAdminPassword
);

// ========================================================
// LOGOUT
// ========================================================

router.post(
  '/logout',
  protect,
  logoutAdmin
);

// ========================================================
// CURRENT ADMIN
// ========================================================

router.get(
  '/me',
  protect,
  getAdminProfile
);

module.exports = router;