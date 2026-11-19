const express = require('express');
const { getNote, saveNote } = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getNote).put(protect, saveNote);

module.exports = router;
