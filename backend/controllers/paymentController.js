const Payment = require('../models/Payment');

// @desc    Get active payments history (Sorted Oldest to Newest - Line-Wise)
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('customer')
      .populate('sale')
      .populate({
        path: 'installmentPlan',
        populate: [
          { path: 'product' },
          { path: 'sale' }
        ]
      })
      .populate('installment')
      .sort({ createdAt: 1 }); // Sorted ascending 1

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load payments history', error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customer')
      .populate('sale')
      .populate('installmentPlan')
      .populate('installment');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }
    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payment details', error: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const payment = await Payment.findByIdAndDelete(paymentId);
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    return res.status(200).json({ success: true, message: 'Payment record removed successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove payment: ' + error.message });
  }
};

module.exports = { getPayments, getPaymentById, deletePayment };