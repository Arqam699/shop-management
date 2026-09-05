const express = require('express');
const router = express.Router();
const { getSales, getSaleById, createSale, updateSale, deleteSale, exchangeSaleProduct } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/:id')
  .get(protect, getSaleById)
  .put(protect, updateSale)
  .delete(protect, deleteSale);

router.post('/:id/exchange', protect, exchangeSaleProduct); // Product Swap Exchange Route

module.exports = router;