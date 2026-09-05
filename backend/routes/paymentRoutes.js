const express = require('express');
const router = express.Router();
// Humne archivePayment ko imports se bilkul remove kar diya hai
const { getPayments, getPaymentById, deletePayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getPayments);
router.get('/:id', protect, getPaymentById);
router.delete('/:id', protect, deletePayment); // Yeh direct permanent delete trigger karega

module.exports = router;