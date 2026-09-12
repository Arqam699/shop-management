const express = require('express');

const router = express.Router();

const {
  getDashboardStats,
  getIndexRecord,
} = require('../controllers/reportController');

const {
  protect,
} = require('../middleware/authMiddleware');


// ============================================================
// DASHBOARD
// ============================================================

router.get(
  '/dashboard',
  protect,
  getDashboardStats
);


// ============================================================
// MONTHLY INDEX RECORD
// ============================================================

router.get(
  '/index-record',
  protect,
  getIndexRecord
);


module.exports = router;