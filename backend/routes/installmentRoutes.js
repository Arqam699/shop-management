const express = require('express');
const router = express.Router();
const { getInstallmentPlans, getInstallmentPlanById, payInstallment } = require('../controllers/installmentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getInstallmentPlans);
router.get('/:id', protect, getInstallmentPlanById);
router.post('/installment/:id/pay', protect, payInstallment);

module.exports = router;