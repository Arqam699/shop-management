const express = require('express');
const router = express.Router();
const { loginAdmin, logoutAdmin, getAdminProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginAdmin);
router.post('/logout', protect, logoutAdmin);
router.get('/me', protect, getAdminProfile);

module.exports = router;