const express = require('express');
const router = express.Router();
const { loginAdmin, logoutAdmin, getAdminProfile, verifyPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.post('/logout', protect, logoutAdmin);
router.get('/me', protect, getAdminProfile);
router.post('/verify-password', protect, verifyPassword); // Password verification endpoint

module.exports = router;