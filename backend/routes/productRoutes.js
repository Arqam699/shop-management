const express = require('express');
const router = express.Router();
const { 
  getProducts, getProductById, createProduct, updateProduct, deleteProduct, getStockMovements 
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getProducts)
  .post(protect, createProduct);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.get('/:id/movements', protect, getStockMovements);

module.exports = router;