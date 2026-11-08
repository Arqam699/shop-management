const express = require('express');
const { getBooks, createBook } = require('../controllers/bookController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getBooks).post(protect, createBook);

module.exports = router;
