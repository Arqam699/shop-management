const express = require('express');

const router = express.Router();

const {
  downloadBackup,
  downloadDailyBackup,
  getBackupInfo,
} = require('../controllers/backupController');

const { protect } = require('../middleware/authMiddleware');

// ============================================================
// BACKUP INFO
// ============================================================

router.get(
  '/info',
  protect,
  getBackupInfo
);

// ============================================================
// DAILY BACKUP
// ============================================================

router.post(
  '/daily',
  protect,
  downloadDailyBackup
);

// ============================================================
// COMPLETE BACKUP
// ============================================================

router.get(
  '/download',
  protect,
  downloadBackup
);

module.exports = router;