const express = require('express');

const router = express.Router();

const {
  getSales,
  getSaleById,
  updateSaleBook,
  createSale,
  updateSale,
  deleteSale
} = require('../controllers/saleController');

const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.put('/:id/book', protect, updateSaleBook);

router.route('/:id')
  .get(protect, getSaleById)
  .put(protect, updateSale)
  .delete(protect, deleteSale);

module.exports = router;
