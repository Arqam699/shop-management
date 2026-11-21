const express = require('express');

const router = express.Router();

const {
  getInstallmentPlans,
  getInstallmentPlanById,
  payInstallment,
  getDueInstallments,
  reviseInstallmentPlan,
  applyInstallmentBalanceDiscount,
} = require('../controllers/installmentController');

const { protect } = require('../middleware/authMiddleware');

// ======================================================
// GET ALL INSTALLMENT PLANS
// ======================================================
router.get('/', protect, getInstallmentPlans);

// ======================================================
// GET DUE INSTALLMENTS
// Overdue + Due Today
// IMPORTANT:
// Must come BEFORE /:id
// ======================================================
router.get('/due', protect, getDueInstallments);

// ======================================================
// GET SINGLE INSTALLMENT PLAN
// ======================================================
router.get('/:id', protect, getInstallmentPlanById);
router.put('/:id/revise', protect, reviseInstallmentPlan);
router.post('/:id/discount', protect, applyInstallmentBalanceDiscount);

// ======================================================
// PAY INSTALLMENT
// ======================================================
router.post('/:id/pay', protect, payInstallment);

module.exports = router;
