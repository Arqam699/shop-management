const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');

const generateSaleID = async () => {
  try {
    const lastSale = await Sale.findOne({ saleId: /^SALE-\d+$/ }).sort({ saleId: -1 });
    if (!lastSale || !lastSale.saleId) return 'SALE-0001';
    const lastIdNum = parseInt(lastSale.saleId.split('-')[1], 10);
    return `SALE-${String(lastIdNum + 1).padStart(4, '0')}`;
  } catch (err) {
    return `SALE-${Date.now().toString().slice(-4)}`;
  }
};

// Simple Plan ID Generator ('01', '02', '03' ... '10', '11'...)
const generatePlanID = async () => {
  try {
    const plans = await InstallmentPlan.find({}, 'planId');
    let maxNum = 0;
    plans.forEach(p => {
      if (p.planId) {
        const num = parseInt(p.planId.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return String(maxNum + 1).padStart(2, '0'); // e.g. 01, 02, 03...
  } catch (err) {
    return '01';
  }
};

const getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('customer', 'fullName mobileNumber customerId')
      .populate('product', 'name brand model sku')
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer').populate('product');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale record not found' });

    const plan = await InstallmentPlan.findOne({ sale: sale._id });
    let installments = [];
    if (plan) {
      installments = await Installment.find({ installmentPlan: plan._id }).sort({ installmentNumber: 1 });
    }

    return res.status(200).json({ 
      success: true, 
      data: {
        ...sale.toObject(),
        installmentPlan: plan,
        installments
      } 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load details', error: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    const { 
      customer, product, quantity, unitPrice, discount, paymentType, downPayment, installmentDuration, manualInvoiceNumber 
    } = req.body;

    const qty = Number(quantity);
    const uPrice = Number(unitPrice);
    const disc = Number(discount || 0);
    const dPayment = Number(downPayment || 0);
    const duration = Number(installmentDuration || 0);

    const calculatedSubtotal = qty * uPrice;
    const calculatedFinalTotal = calculatedSubtotal - disc;
    const initialRemaining = calculatedFinalTotal - dPayment;

    if (calculatedFinalTotal < 0) {
      return res.status(400).json({ success: false, message: 'Discount cannot be greater than subtotal.' });
    }

    let saleId = manualInvoiceNumber ? manualInvoiceNumber.trim().toUpperCase() : await generateSaleID();

    const existingSale = await Sale.findOne({ saleId });
    if (existingSale) {
      return res.status(400).json({ success: false, message: `Invoice / Bill Number "${saleId}" already exists. Please use a unique bill number.` });
    }

    const prodDoc = await Product.findById(product);
    if (!prodDoc) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (prodDoc.quantity < qty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available.' });
    }

    const previousQty = prodDoc.quantity;
    prodDoc.quantity -= qty;
    await prodDoc.save();

    let markupPercent = 0;
    if (paymentType === 'Installment') {
      if (duration === 3) markupPercent = 0.15;
      else if (duration === 6) markupPercent = 0.25;
      else if (duration === 12) markupPercent = 0.50;
      else {
        if (duration <= 3) markupPercent = 0.15;
        else if (duration <= 6) markupPercent = 0.25;
        else markupPercent = 0.50;
      }
    }

    const markupAmount = Math.round(initialRemaining * markupPercent);
    const totalFinancedAmount = initialRemaining + markupAmount;

    const sale = new Sale({
      saleId,
      customer,
      product,
      quantity: qty,
      unitPrice: uPrice,
      discount: disc,
      subtotal: calculatedSubtotal,
      finalTotal: calculatedFinalTotal,
      paymentType,
      downPayment: paymentType === 'Installment' ? dPayment : 0,
      remainingBalance: paymentType === 'Installment' ? totalFinancedAmount : 0,
      installmentDuration: paymentType === 'Installment' ? duration : 0
    });
    await sale.save();

    const stockMovement = new StockMovement({
      product: prodDoc._id,
      type: 'Sale',
      quantity: qty,
      previousQuantity: previousQty,
      newQuantity: prodDoc.quantity,
      reason: `Sold to customer (${saleId})`,
      reference: saleId
    });
    await stockMovement.save();

    if (paymentType === 'Installment') {
      const planId = await generatePlanID(); // '01', '02', '03'...
      const firstDueDate = new Date();
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);

      const plan = new InstallmentPlan({
        planId,
        sale: sale._id,
        customer,
        product,
        totalAmount: calculatedFinalTotal + markupAmount,
        downPayment: dPayment,
        remainingBalance: totalFinancedAmount,
        duration,
        firstDueDate
      });
      await plan.save();

      const baseAmount = Math.floor(totalFinancedAmount / duration);
      const roundingDiff = totalFinancedAmount - (baseAmount * duration);
      let currentDueDate = new Date(firstDueDate);

      const installmentsArray = [];
      for (let i = 1; i <= duration; i++) {
        const isLast = (i === duration);
        const installmentAmount = isLast ? (baseAmount + roundingDiff) : baseAmount;

        installmentsArray.push({
          installmentPlan: plan._id,
          installmentNumber: i,
          amount: installmentAmount,
          originalAmount: installmentAmount, 
          paidAmount: 0,
          remainingAmount: installmentAmount,
          dueDate: new Date(currentDueDate),
          status: 'Pending'
        });
        currentDueDate.setMonth(currentDueDate.getMonth() + 1);
      }
      await Installment.insertMany(installmentsArray);
    }

    return res.status(201).json({ success: true, message: 'Sale completed successfully!', data: sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    const { product, quantity, unitPrice, discount, paymentType, downPayment, installmentDuration } = req.body;

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale record not found' });
    }

    const qty = Number(quantity);
    const uPrice = Number(unitPrice);
    const disc = Number(discount || 0);
    const dPayment = Number(downPayment || 0);
    const duration = Number(installmentDuration || 0);

    const origProduct = await Product.findById(sale.product);
    if (origProduct) {
      origProduct.quantity += sale.quantity;
      await origProduct.save();
    }

    const targetProduct = await Product.findById(product);
    if (!targetProduct || targetProduct.quantity < qty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available.' });
    }

    const prevStockQty = targetProduct.quantity;
    targetProduct.quantity -= qty;
    await targetProduct.save();

    const oldPlan = await InstallmentPlan.findOne({ sale: sale._id });
    if (oldPlan) {
      await Installment.deleteMany({ installmentPlan: oldPlan._id });
      await InstallmentPlan.findByIdAndDelete(oldPlan._id);
    }

    const calculatedSubtotal = qty * uPrice;
    const calculatedFinalTotal = calculatedSubtotal - disc;
    const initialRemaining = calculatedFinalTotal - dPayment;

    let markupPercent = 0;
    if (paymentType === 'Installment') {
      if (duration === 3) markupPercent = 0.15;
      else if (duration === 6) markupPercent = 0.25;
      else if (duration === 12) markupPercent = 0.50;
      else {
        if (duration <= 3) markupPercent = 0.15;
        else if (duration <= 6) markupPercent = 0.25;
        else markupPercent = 0.50;
      }
    }

    const markupAmount = Math.round(initialRemaining * markupPercent);
    const totalFinancedAmount = initialRemaining + markupAmount;

    sale.product = product;
    sale.quantity = qty;
    sale.unitPrice = uPrice;
    sale.discount = disc;
    sale.subtotal = sale.quantity * uPrice;
    sale.finalTotal = calculatedFinalTotal;
    sale.paymentType = paymentType;
    sale.downPayment = paymentType === 'Installment' ? dPayment : 0;
    sale.remainingBalance = paymentType === 'Installment' ? totalFinancedAmount : 0;
    sale.installmentDuration = paymentType === 'Installment' ? duration : 0;
    await sale.save();

    await StockMovement.deleteMany({ reference: sale.saleId });
    const updatedMovement = new StockMovement({
      product: targetProduct._id,
      type: 'Sale',
      quantity: qty,
      previousQuantity: prevStockQty,
      newQuantity: targetProduct.quantity,
      reason: `Corrected/Edited Sale (${sale.saleId})`,
      reference: sale.saleId
    });
    await updatedMovement.save();

    if (paymentType === 'Installment') {
      const planId = await generatePlanID(); // '01', '02', '03'...
      const firstDueDate = new Date();
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);

      const plan = new InstallmentPlan({
        planId,
        sale: sale._id,
        customer: sale.customer,
        product,
        totalAmount: calculatedFinalTotal + markupAmount,
        downPayment: dPayment,
        remainingBalance: totalFinancedAmount,
        duration,
        firstDueDate
      });
      await plan.save();

      const baseAmount = Math.floor(totalFinancedAmount / duration);
      const roundingDiff = totalFinancedAmount - (baseAmount * duration);
      let currentDueDate = new Date(firstDueDate);

      const installmentsArray = [];
      for (let i = 1; i <= duration; i++) {
        const isLast = (i === duration);
        const installmentAmount = isLast ? (baseAmount + roundingDiff) : baseAmount;

        installmentsArray.push({
          installmentPlan: plan._id,
          installmentNumber: i,
          amount: installmentAmount,
          originalAmount: installmentAmount, 
          paidAmount: 0,
          remainingAmount: installmentAmount,
          dueDate: new Date(currentDueDate),
          status: 'Pending'
        });
        currentDueDate.setMonth(currentDueDate.getMonth() + 1);
      }
      await Installment.insertMany(installmentsArray);
    }

    return res.status(200).json({ success: true, message: 'Sale updated and schedules synchronized!', data: sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale record not found' });
    }

    const productDoc = await Product.findById(sale.product);
    if (productDoc) {
      const origQty = productDoc.quantity;
      productDoc.quantity += sale.quantity;
      await productDoc.save();

      const restoreMovement = new StockMovement({
        product: productDoc._id,
        type: 'Return',
        quantity: sale.quantity,
        previousQuantity: origQty,
        newQuantity: productDoc.quantity,
        reason: `Dukan sale cancelled & deleted (${sale.saleId})`,
        reference: sale.saleId
      });
      await restoreMovement.save();
    }

    const oldPlan = await InstallmentPlan.findOne({ sale: sale._id });
    if (oldPlan) {
      await Installment.deleteMany({ installmentPlan: oldPlan._id });
      await InstallmentPlan.findByIdAndDelete(oldPlan._id);
    }

    await StockMovement.deleteMany({ reference: sale.saleId });
    await Sale.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Sale deleted and stock restored successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exchangeSaleProduct = async (req, res) => {
  try {
    const saleId = req.params.id;
    const { newProductId, newPrice } = req.body;

    const nPrice = Number(newPrice);
    if (isNaN(nPrice) || nPrice < 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid positive exchange price.' });
    }

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Original invoice not found' });
    }

    const oldProductId = sale.product;
    const oldPrice = sale.unitPrice;
    const priceDifference = (nPrice - oldPrice) * sale.quantity;

    const targetProduct = await Product.findById(newProductId);
    if (!targetProduct || targetProduct.quantity < sale.quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock in target product for exchange.' });
    }

    const oldProductDoc = await Product.findById(oldProductId);
    if (oldProductDoc) {
      const origQty = oldProductDoc.quantity;
      oldProductDoc.quantity += sale.quantity;
      await oldProductDoc.save();

      const returnMovement = new StockMovement({
        product: oldProductId,
        type: 'Return',
        quantity: sale.quantity,
        previousQuantity: origQty,
        newQuantity: oldProductDoc.quantity,
        reason: `Exchanged and returned (linked to: ${sale.saleId})`,
        reference: sale.saleId
      });
      await returnMovement.save();
    }

    const prevTargetQty = targetProduct.quantity;
    targetProduct.quantity -= sale.quantity;
    await targetProduct.save();

    const sellMovement = new StockMovement({
      product: newProductId,
      type: 'Sale',
      quantity: sale.quantity,
      previousQuantity: prevTargetQty,
      newQuantity: targetProduct.quantity,
      reason: `Exchanged and checkout (linked to: ${sale.saleId})`,
      reference: sale.saleId
    });
    await sellMovement.save();

    sale.product = newProductId;
    sale.unitPrice = nPrice;
    sale.subtotal = sale.quantity * nPrice;
    sale.finalTotal += priceDifference;

    if (sale.paymentType === 'Installment') {
      const plan = await InstallmentPlan.findOne({ sale: sale._id });
      if (plan) {
        plan.product = newProductId;
        plan.totalAmount += priceDifference;
        plan.remainingBalance = Math.max(0, plan.remainingBalance + priceDifference);
        await plan.save();

        sale.remainingBalance = plan.remainingBalance;

        const unpaidInstallments = await Installment.find({
          installmentPlan: plan._id,
          status: { $ne: 'Paid' }
        }).sort({ installmentNumber: 1 });

        if (unpaidInstallments.length > 0) {
          const share = Math.floor(priceDifference / unpaidInstallments.length);
          const roundingDiff = priceDifference - (share * unpaidInstallments.length);

          for (let i = 0; i < unpaidInstallments.length; i++) {
            const isLast = (i === unpaidInstallments.length - 1);
            const instDoc = unpaidInstallments[i];
            const additionalAmount = isLast ? (share + roundingDiff) : share;

            instDoc.amount += additionalAmount;
            instDoc.remainingAmount = Math.max(0, instDoc.remainingAmount + additionalAmount);
            await instDoc.save();
          }
        }
      }
    }

    await sale.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: 'Product exchanged and dynamic kiston re-balanced!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSales, getSaleById, createSale, updateSale, deleteSale, exchangeSaleProduct };