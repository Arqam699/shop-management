const express = require('express');
const router = express.Router();
const { 
  getYearlyAudits, createYearlyAudit, getYearlyAuditById, addPurchasedProduct, addSoldProduct, deleteAuditItem, deleteYearlyAudit 
} = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getYearlyAudits)
  .post(protect, createYearlyAudit);

router.route('/:id')
  .get(protect, getYearlyAuditById)
  .delete(protect, deleteYearlyAudit);

router.post('/:id/purchase', protect, addPurchasedProduct);
router.post('/:id/sale', protect, addSoldProduct);
router.delete('/:id/item/:itemId', protect, deleteAuditItem);

module.exports = router;