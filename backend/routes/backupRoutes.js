const express = require('express');

const router = express.Router();

const {
  downloadBackup,
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
// COMPLETE BACKUP
// ============================================================

router.get(
  '/download',
  protect,
  downloadBackup
);

module.exports = router;
