
const express = require('express');

const router = express.Router();

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getFingerprintTemplates
} = require('../controllers/customerController');

const { protect } = require('../middleware/authMiddleware');


// =====================================================
// CUSTOMER ROUTES
// =====================================================

// Get all customers
// Create new customer
router.route('/')
  .get(
    protect,
    getCustomers
  )
  .post(
    protect,
    createCustomer
  );


// =====================================================
// FINGERPRINT TEMPLATES
// =====================================================

// Get fingerprint templates for the
// currently logged-in shop.
//
// IMPORTANT:
// This route MUST be before /:id
router.post(
  '/fingerprint/templates',

  // Temporary debugging middleware
  (req, res, next) => {
    console.log('');
    console.log('========================================');
    console.log('🔥 FINGERPRINT TEMPLATE ROUTE HIT');
    console.log('========================================');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('========================================');
    console.log('');

    next();
  },

  // Authentication
  protect,

  // Controller
  getFingerprintTemplates
);


// =====================================================
// CUSTOMER BY ID
// =====================================================

// Get customer by MongoDB ID
router.get(
  '/:id',
  protect,
  getCustomerById
);


// Update customer
router.put(
  '/:id',
  protect,
  updateCustomer
);


// Delete customer
router.delete(
  '/:id',
  protect,
  deleteCustomer
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;
