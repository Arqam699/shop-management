
const express = require('express');

const {
  handleAiChat,
  getAiHistory,
  getAiUsage,
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

// ========================================================
// TODAY'S SMART (LLM) USAGE
// ========================================================

router.get(
  '/usage',
  protect,
  getAiUsage
);

module.exports = router;
