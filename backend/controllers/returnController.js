const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');

const generateReturnID = async () => {
  try {
    const lastReturn = await Return.findOne({ returnId: /^RET-\d+$/ }).sort({ returnId: -1 });
    if (!lastReturn || !lastReturn.returnId) return 'RET-0001';
    const lastIdNum = parseInt(lastReturn.returnId.split('-')[1], 10);
    return `RET-${String(lastIdNum + 1).padStart(4, '0')}`;
  } catch (err) {
    return `RET-${Date.now().toString().slice(-4)}`;
  }
};

// @desc    Get all returns history (Sorted Oldest to Newest - Line-Wise)
const getReturns = async (req, res) => {
  try {
    const returnsList = await Return.find()
      .populate('customer', 'fullName mobileNumber customerId')
      .populate('product', 'name brand model sku')
      .populate('sale', 'saleId finalTotal')
      .sort({ createdAt: 1 }); // Sorted ascending 1

    return res.status(200).json({ success: true, data: returnsList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch returns history', error: error.message });
  }
};

const createReturn = async (req, res) => {
  try {
    const { saleId, returnedQty, refundAmount, reason } = req.body;

    const rQty = Number(returnedQty);
    const refund = Number(refundAmount || 0);

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Original sale invoice not found.' });
    }

    if (rQty > sale.quantity) {
      return res.status(400).json({ success: false, message: `Returned quantity cannot exceed sold quantity (${sale.quantity} units).` });
    }

    const productDoc = await Product.findById(sale.product);
    if (productDoc) {
      const origQty = productDoc.quantity;
      productDoc.quantity += rQty;
      await productDoc.save();

      const returnMovement = new StockMovement({
        product: productDoc._id,
        type: 'Return',
        quantity: rQty,
        previousQuantity: origQty,
        newQuantity: productDoc.quantity,
        reason: `Product returned by customer. Return Code: RET (linked to: ${sale.saleId})`,
        reference: sale.saleId
      });
      await returnMovement.save();
    }

    const returnId = await generateReturnID();
    const returnLog = new Return({
      returnId,
      sale: sale._id,
      customer: sale.customer,
      product: sale.product,
      quantity: rQty,
      refundAmount: refund,
      reason
    });
    await returnLog.save();

    if (sale.paymentType === 'Installment') {
      const plan = await InstallmentPlan.findOne({ sale: sale._id });
      if (plan) {
        plan.remainingBalance = Math.max(0, plan.remainingBalance - refund);
        
        if (plan.remainingBalance === 0) {
          plan.status = 'Completed';
        }
        await plan.save();

        const unpaidInstallments = await Installment.find({
          installmentPlan: plan._id,
          status: { $ne: 'Paid' }
        }).sort({ installmentNumber: 1 });

        if (unpaidInstallments.length > 0) {
          const newInstallmentBase = Math.floor(plan.remainingBalance / unpaidInstallments.length);
          const roundingDiff = plan.remainingBalance - (newInstallmentBase * unpaidInstallments.length);

          for (let i = 0; i < unpaidInstallments.length; i++) {
            const isLast = (i === unpaidInstallments.length - 1);
            const instDoc = unpaidInstallments[i];
            
            instDoc.amount = isLast ? (newInstallmentBase + roundingDiff) : newInstallmentBase;
            instDoc.remainingAmount = instDoc.amount - instDoc.paidAmount;
            
            if (instDoc.remainingAmount <= 0) {
              instDoc.status = 'Paid';
            }
            await instDoc.save();
          }
        }

        sale.remainingBalance = plan.remainingBalance;
      }
    }

    sale.quantity = Math.max(0, sale.quantity - rQty);
    sale.subtotal = sale.quantity * sale.unitPrice;
    sale.finalTotal = Math.max(0, sale.subtotal - sale.discount);
    
    await sale.save({ validateBeforeSave: false });

    return res.status(201).json({ success: true, message: 'Return processed successfully!', data: returnLog });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReturn = async (req, res) => {
  try {
    const returnId = req.params.id;
    const deletedReturn = await Return.findByIdAndDelete(returnId);
    
    if (!deletedReturn) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    return res.status(200).json({ success: true, message: 'Return record removed successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove return record: ' + error.message });
  }
};

module.exports = { getReturns, createReturn, deleteReturn };