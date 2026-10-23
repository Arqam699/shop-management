const express = require('express');

const router = express.Router();

const {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale
} = require('../controllers/saleController');

const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/:id')
  .get(protect, getSaleById)
  .put(protect, updateSale)
  .delete(protect, deleteSale);

module.exports = router;
