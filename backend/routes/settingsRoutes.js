const express = require('express');

const router = express.Router();

const {
  getSettings,
  updateSettings,
  enableDeletionMode,
  disableDeletionMode,
} = require('../controllers/settingsController');

const { protect } = require('../middleware/authMiddleware');


// Normal settings
router.get('/', protect, getSettings);

router.put('/', protect, updateSettings);


// Deletion Mode
router.post(
  '/deletion-mode/enable',
  protect,
  enableDeletionMode
);

router.post(
  '/deletion-mode/disable',
  protect,
  disableDeletionMode
);


module.exports = router;