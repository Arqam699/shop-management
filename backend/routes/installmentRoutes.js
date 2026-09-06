const express = require('express');

const router = express.Router();

const {
  getInstallmentPlans,
  getInstallmentPlanById,
  payInstallment,
  getDueInstallments
} = require('../controllers/installmentController');

const { protect } = require('../middleware/authMiddleware');


// ======================================================
// GET ALL INSTALLMENT PLANS
// ======================================================
router.get('/', protect, getInstallmentPlans);


// ======================================================
// GET DUE INSTALLMENTS
// Overdue + Due Today
// ======================================================
// IMPORTANT:
// This route must come BEFORE /:id
router.get('/due', protect, getDueInstallments);


// ======================================================
// GET SINGLE INSTALLMENT PLAN
// ======================================================
router.get('/:id', protect, getInstallmentPlanById);


// ======================================================
// PAY INSTALLMENT
// ======================================================
router.post('/:id/pay', protect, payInstallment);


module.exports = router;