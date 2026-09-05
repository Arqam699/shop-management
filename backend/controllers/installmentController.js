const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');

const generatePaymentID = async () => {
  try {
    const payments = await Payment.find({}, 'paymentId');
    let maxNum = 0;
    payments.forEach(p => {
      if (p.paymentId) {
        const num = parseInt(p.paymentId.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return String(maxNum + 1).padStart(2, '0'); // e.g. 01, 02, 03...
  } catch (err) {
    return '01';
  }
};

const updateOverdueStatus = async (planId) => {
  try {
    const today = new Date();
    await Installment.updateMany(
      {
        installmentPlan: planId,
        dueDate: { $lt: today },
        status: { $in: ['Pending', 'Partially Paid'] }
      },
      { $set: { status: 'Overdue' } }
    );

    const overdueExists = await Installment.findOne({ installmentPlan: planId, status: 'Overdue' });
    if (overdueExists) {
      await InstallmentPlan.findByIdAndUpdate(planId, { status: 'Overdue' });
    }
  } catch (error) {
    console.error('Failed to update overdue dates:', error);
  }
};

// @desc    Get all installment plans (With sale populated for invoice number)
const getInstallmentPlans = async (req, res) => {
  try {
    const plans = await InstallmentPlan.find()
      .populate('customer', 'fullName mobileNumber customerId')
      .populate('product', 'name brand model sku')
      .populate('sale', 'saleId finalTotal') // Populates Invoice Number
      .sort({ createdAt: 1 });

    for (const plan of plans) {
      await updateOverdueStatus(plan._id);
    }
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getInstallmentPlanById = async (req, res) => {
  try {
    const planId = req.params.id;
    await updateOverdueStatus(planId);

    const plan = await InstallmentPlan.findById(planId)
      .populate('customer')
      .populate('product')
      .populate('sale'); // Populates Invoice Number

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Installment Plan not found' });
    }

    const installments = await Installment.find({ installmentPlan: planId }).sort({ installmentNumber: 1 });
    return res.status(200).json({ success: true, data: { plan, installments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const payInstallment = async (req, res) => {
  try {
    const installmentId = req.params.id;
    const paymentAmount = Number(req.body.amount); 
    const paymentMethod = req.body.paymentMethod || 'Cash';

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount.' });
    }

    const installment = await Installment.findById(installmentId);
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment item not found' });
    }

    if (installment.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'This installment is already fully paid.' });
    }

    if (paymentAmount > installment.remainingAmount) {
      return res.status(400).json({ success: false, message: `Payment amount cannot exceed remaining dues (${installment.remainingAmount}).` });
    }

    const originalRemaining = installment.remainingAmount;
    const isPartial = paymentAmount < installment.remainingAmount;
    const carryForwardAmount = installment.remainingAmount - paymentAmount;

    if (!installment.originalAmount || installment.originalAmount === 0) {
      installment.originalAmount = installment.amount;
    }

    const plan = await InstallmentPlan.findById(installment.installmentPlan);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Parent installment plan not found.' });
    }

    const futureUnpaidInstallments = await Installment.find({
      installmentPlan: plan._id,
      _id: { $ne: installment._id },
      status: { $ne: 'Paid' }
    }).sort({ installmentNumber: 1 });

    if (isPartial && futureUnpaidInstallments.length === 0) {
      installment.paidAmount += paymentAmount;
      installment.remainingAmount = installment.amount - installment.paidAmount;
      installment.status = 'Partially Paid';
      await installment.save();
    } else {
      installment.amount = installment.amount - carryForwardAmount; 
      installment.paidAmount = installment.amount;
      installment.remainingAmount = 0;
      installment.status = 'Paid';
      installment.paidDate = new Date();
      await installment.save();

      if (isPartial && futureUnpaidInstallments.length > 0) {
        const distributeShare = Math.floor(carryForwardAmount / futureUnpaidInstallments.length);
        const roundingDiff = carryForwardAmount - (distributeShare * futureUnpaidInstallments.length);

        for (let i = 0; i < futureUnpaidInstallments.length; i++) {
          const isLast = (i === futureUnpaidInstallments.length - 1);
          const instDoc = futureUnpaidInstallments[i];
          const additionalAmount = isLast ? (distributeShare + roundingDiff) : distributeShare;
          
          instDoc.amount += additionalAmount;
          instDoc.remainingAmount += additionalAmount;
          await instDoc.save();
        }
      }
    }

    plan.remainingBalance = Math.max(0, plan.remainingBalance - paymentAmount);
    
    const hasUnpaid = await Installment.findOne({
      installmentPlan: plan._id,
      status: { $ne: 'Paid' }
    });

    if (!hasUnpaid) {
      plan.status = 'Completed';
    } else {
      const hasOverdue = await Installment.findOne({
        installmentPlan: plan._id,
        status: 'Overdue'
      });
      plan.status = hasOverdue ? 'Overdue' : 'Active';
    }
    await plan.save();

    await Sale.findByIdAndUpdate(plan.sale, { remainingBalance: plan.remainingBalance });

    const paymentId = await generatePaymentID(); // '01', '02'...
    const paymentLog = new Payment({
      paymentId,
      customer: plan.customer,
      sale: plan.sale,
      installmentPlan: plan._id,
      installment: installment._id,
      amount: paymentAmount,
      paymentMethod,
      originalInstallmentAmount: originalRemaining,
      carryForwardAmount: carryForwardAmount,
      notes: `Collected ${paymentAmount} (Original dues: ${originalRemaining} | Adjusted carry-forward: ${carryForwardAmount})`
    });
    await paymentLog.save();

    return res.status(200).json({ success: true, message: 'Payment recorded and schedules synchronized!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInstallmentPlans, getInstallmentPlanById, payInstallment };