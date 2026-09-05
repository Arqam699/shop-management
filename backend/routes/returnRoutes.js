const express = require('express');
const router = express.Router();
const { getReturns, createReturn, deleteReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getReturns)
  .post(protect, createReturn);

router.route('/:id')
  .delete(protect, deleteReturn); // Deletion route

module.exports = router;