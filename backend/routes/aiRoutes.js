const express = require('express');

const {
  handleAiChat,
} = require('../controllers/aiController');

const {
  protect,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/chat',
  protect,
  handleAiChat
);

module.exports = router;