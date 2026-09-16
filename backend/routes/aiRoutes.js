
const express = require('express');

const {
  handleAiChat,
  getAiHistory,
} = require('../controllers/aiController');

const {
  protect,
} = require('../middleware/authMiddleware');

const router = express.Router();

// ========================================================
// AI CHAT
// ========================================================

router.post(
  '/chat',
  protect,
  handleAiChat
);

// ========================================================
// TODAY'S AI CHAT HISTORY
// ========================================================

router.get(
  '/history',
  protect,
  getAiHistory
);

module.exports = router;
