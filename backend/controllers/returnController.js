const mongoose = require('mongoose');
const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Settings = require('../models/Settings');


// ============================================================
// GENERATE RETURN ID
// SaaS: Generate return ID separately for each shop
// Shop A: RET-0001, RET-0002...
// Shop B: RET-0001, RET-0002...
// ============================================================
const generateReturnID = async (shopId) => {
  try {
    const lastReturn = await Return.findOne({
      shopId,
      returnId: /^RET-\d+$/,
    }).sort({ returnId: -1 });

    if (!lastReturn || !lastReturn.returnId) {
      return 'RET-0001';
    }

    const lastIdNum = parseInt(
      lastReturn.returnId.split('-')[1],
      10
    );

    return `RET-${String(lastIdNum + 1).padStart(4, '0')}`;
  } catch (err) {
    return `RET-${Date.now().toString().slice(-4)}`;
  }
};


// ============================================================
// CHECK DELETION MODE
// SaaS: Current shop only
// ============================================================
const checkDeletionMode = async (shopId) => {
  const settings = await Settings.findOne({
    shopId,
  });

  if (!settings || !settings.allowGlobalDeletion) {
    return {
      allowed: false,
      message:
        'Deletion Mode is disabled. Enable it from Settings first.',
    };
  }

  // Check 30-minute expiry
  if (
    settings.deletionModeExpiresAt &&
    new Date() > settings.deletionModeExpiresAt
  ) {
    settings.allowGlobalDeletion = false;
    settings.deletionModeExpiresAt = null;

    await settings.save();

    return {
      allowed: false,
      message:
        'Deletion Mode has expired. Enable it again from Settings.',
    };
  }

  return {
    allowed: true,
  };
};


// ============================================================
// GET ALL RETURNS
// @route GET /api/returns
// @access Private
// ============================================================
const getReturns = async (req, res) => {
  try {
    const filter = {
      shopId: req.shopId,
    };
    const requestedCustomer = String(req.query.customer || '').trim();
    if (requestedCustomer && mongoose.Types.ObjectId.isValid(requestedCustomer)) {
      filter.customer = requestedCustomer;
    }

    const returnsList = await Return.find(filter)
      .populate(
        'customer',
        'fullName mobileNumber customerId'
      )
      .populate(
        'product',
        'name brand model sku'
      )
      .populate(
        'sale',
        'saleId finalTotal'
      )
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: returnsList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch returns history',
    });
  }
};


// ============================================================
// CREATE RETURN
// @route POST /api/returns
// @access Private
// ============================================================
const createReturn = async (req, res) => {
  try {
    const {
      saleId,
      productId,
      returnedQty,
      refundAmount,
      reason,
    } = req.body;

    const rQty = Number(returnedQty);
    const refund = Number(refundAmount || 0);

    // --------------------------------------------------------
    // Validate quantity
    // --------------------------------------------------------
    if (!Number.isFinite(rQty) || !Number.isInteger(rQty) || rQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Returned quantity must be a valid positive number.',
      });
    }

    if (!Number.isFinite(refund) || refund < 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be a valid positive number.',
      });
    }

    // --------------------------------------------------------
    // SaaS: Sale must belong to current shop
    // --------------------------------------------------------
    const sale = await Sale.findOne({
      _id: saleId,
      shopId: req.shopId,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Original sale invoice not found.',
      });
    }

    const saleItems = Array.isArray(sale.items) && sale.items.length
      ? sale.items
      : [{ product: sale.product, quantity: sale.quantity, unitPrice: sale.unitPrice, discount: sale.discount || 0, purchasePriceAtSale: sale.purchasePriceAtSale }];
    const requestedProductId = String(productId || (saleItems.length === 1 ? saleItems[0].product : '')).trim();
    if (!requestedProductId) {
      return res.status(400).json({ success: false, message: 'Select which product from this multi-product invoice is being returned.' });
    }
    const selectedItems = saleItems.filter((item) => String(item.product?._id || item.product) === requestedProductId);
    if (!selectedItems.length) {
      return res.status(400).json({ success: false, message: 'The selected product is not part of this invoice.' });
    }
    const selectedItem = {
      quantity: selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      gross: selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
      discount: selectedItems.reduce((sum, item) => sum + Number(item.discount || 0), 0),
    };
    const previousReturns = await Return.find({ shopId: req.shopId, sale: sale._id }).select('product quantity').lean();
    const returnedQtyByProduct = new Map();
    for (const row of previousReturns) {
      const key = String(row.product);
      returnedQtyByProduct.set(key, (returnedQtyByProduct.get(key) || 0) + Number(row.quantity || 0));
    }
    const previouslyReturnedQty = Number(returnedQtyByProduct.get(requestedProductId) || 0);
    const remainingItemQty = Math.max(0, Number(selectedItem.quantity || 0) - previouslyReturnedQty);
    if (rQty > remainingItemQty) {
      return res.status(400).json({
        success: false,
        message: `Returned quantity cannot exceed the remaining quantity for this product (${remainingItemQty} units).`,
      });
    }

    const returnQtyToAllocate = new Map(returnedQtyByProduct);
    const remainingQtyByItem = saleItems.map((item) => {
      const key = String(item.product?._id || item.product);
      const originalQty = Number(item.quantity || 0);
      const qtyReturnedHere = Math.min(originalQty, Number(returnQtyToAllocate.get(key) || 0));
      returnQtyToAllocate.set(key, Math.max(0, Number(returnQtyToAllocate.get(key) || 0) - qtyReturnedHere));
      return Math.max(0, originalQty - qtyReturnedHere);
    });
    const remainingGrossByItem = saleItems.map((item, index) => {
      return remainingQtyByItem[index] * Number(item.unitPrice || 0);
    });
    const remainingGrossTotal = remainingGrossByItem.reduce((sum, value) => sum + value, 0);
    const remainingItemDiscountTotal = saleItems.reduce((sum, item, index) => {
      const key = String(item.product?._id || item.product);
      const originalQty = Number(item.quantity || 0);
      const remainingQty = remainingQtyByItem[index];
      return sum + (originalQty > 0 ? Number(item.discount || 0) * remainingQty / originalQty : 0);
    }, 0);
    const overallDiscount = Math.max(0, Number(sale.discount || 0) - remainingItemDiscountTotal);
    const selectedGross = selectedItems.reduce((sum, item) => sum + remainingGrossByItem[saleItems.indexOf(item)], 0);
    const selectedRemainingItemDiscount = selectedItems.reduce((sum, item) => {
      const itemIndex = saleItems.indexOf(item);
      const originalQty = Number(item.quantity || 0);
      const remainingQty = remainingQtyByItem[itemIndex];
      return sum + (originalQty > 0 ? Number(item.discount || 0) * remainingQty / originalQty : 0);
    }, 0);
    const selectedDiscount = selectedRemainingItemDiscount + (remainingGrossTotal > 0 ? overallDiscount * selectedGross / remainingGrossTotal : 0);
    const remainingItemValue = Math.max(0, selectedGross - selectedDiscount);
    const maxRefund = remainingItemQty > 0 ? remainingItemValue * rQty / remainingItemQty : 0;
    if (refund > maxRefund + 0.005) {
      return res.status(400).json({ success: false, message: `Refund cannot exceed the remaining sale value for this returned quantity (${maxRefund.toFixed(2)}).` });
    }

    const plan = sale.paymentType === 'Installment'
      ? await InstallmentPlan.findOne({ sale: sale._id, shopId: req.shopId })
      : null;
    if (sale.paymentType === 'Installment' && !plan) {
      return res.status(409).json({ success: false, message: 'This installment sale has no active plan. The return was not recorded.' });
    }
    const outstanding = Number(plan?.remainingBalance ?? sale.remainingBalance ?? 0);
    if (refund > outstanding + 0.005) {
      return res.status(400).json({ success: false, message: `Refund/credit cannot exceed the outstanding balance (${outstanding.toFixed(2)}). Record a separate cash refund for any amount already collected.` });
    }

    // --------------------------------------------------------
    // SaaS: Product must belong to current shop
    // --------------------------------------------------------
    const productDoc = await Product.findOne({
      _id: requestedProductId,
      shopId: req.shopId,
    });

    if (!productDoc) {
      return res.status(404).json({ success: false, message: 'Returned product was not found in this shop.' });
    }

    {
      const origQty = productDoc.quantity;

      productDoc.quantity += rQty;

      await productDoc.save();

      // ------------------------------------------------------
      // SaaS: Stock movement belongs to current shop
      // ------------------------------------------------------
      const returnMovement = new StockMovement({
        shopId: req.shopId,
        product: productDoc._id,
        type: 'Return',
        quantity: rQty,
        previousQuantity: origQty,
        newQuantity: productDoc.quantity,
        reason:
          `Product returned by customer. Return Code: RET (linked to: ${sale.saleId})`,
        reference: sale.saleId,
      });

      await returnMovement.save();
    }

    // --------------------------------------------------------
    // SaaS: Return ID generated per shop
    // --------------------------------------------------------
    const returnId = await generateReturnID(
      req.shopId
    );

    const installmentSnapshot = plan
      ? await Installment.find({ shopId: req.shopId, installmentPlan: plan._id })
          .select('_id amount paidAmount remainingAmount status')
          .lean()
      : [];
    const financialSnapshot = {
      sale: {
        quantity: sale.quantity,
        subtotal: sale.subtotal,
        finalTotal: sale.finalTotal,
        discount: sale.discount,
        remainingBalance: sale.remainingBalance,
        totalWithMarkup: sale.totalWithMarkup,
        markupAmount: sale.markupAmount,
        paymentStatus: sale.paymentStatus,
      },
      plan: plan ? {
        totalAmount: plan.totalAmount,
        remainingBalance: plan.remainingBalance,
        status: plan.status,
      } : null,
      installments: installmentSnapshot,
    };

    const returnLog = new Return({
      shopId: req.shopId,
      returnId,
      sale: sale._id,
      customer: sale.customer,
      product: requestedProductId,
      quantity: rQty,
      refundAmount: refund,
      financialSnapshot,
      reason,
    });

    await returnLog.save();

    // ========================================================
    // INSTALLMENT SALE
    // ========================================================
    if (sale.paymentType === 'Installment') {

      // ------------------------------------------------------
      // SaaS: Plan must belong to current shop
      // ------------------------------------------------------
      if (plan) {
        plan.totalAmount = Math.max(0, Number(plan.totalAmount || 0) - refund);
        plan.remainingBalance = Math.max(0, Number(plan.remainingBalance || 0) - refund);

        if (plan.remainingBalance === 0) {
          plan.status = 'Completed';
        }

        await plan.save();

        // ----------------------------------------------------
        // SaaS: Installments must belong to current shop
        // ----------------------------------------------------
        const unpaidInstallments =
          await Installment.find({
            installmentPlan: plan._id,
            shopId: req.shopId,
            status: { $ne: 'Paid' },
          }).sort({
            installmentNumber: 1,
          });

        if (unpaidInstallments.length > 0) {
          const totalRemainingCents = Math.round(plan.remainingBalance * 100);
          const installmentBaseCents = Math.floor(totalRemainingCents / unpaidInstallments.length);
          const roundingDiffCents = totalRemainingCents - installmentBaseCents * unpaidInstallments.length;

          for (
            let i = 0;
            i < unpaidInstallments.length;
            i++
          ) {
            const isLast =
              i ===
              unpaidInstallments.length - 1;

            const instDoc =
              unpaidInstallments[i];

            const allocatedCents = installmentBaseCents + (isLast ? roundingDiffCents : 0);
            instDoc.remainingAmount = allocatedCents / 100;
            instDoc.amount = Number(instDoc.paidAmount || 0) + instDoc.remainingAmount;
            instDoc.status = instDoc.remainingAmount <= 0.005 ? 'Paid' : 'Unpaid';

            await instDoc.save();
          }
        }

        sale.remainingBalance =
          plan.remainingBalance;
      }
    }

    // ========================================================
    // UPDATE SALE
    // ========================================================
    sale.quantity = Math.max(0, Number(sale.quantity || 0) - rQty);
    const returnedGrossValue = selectedItem.quantity > 0 ? rQty * selectedItem.gross / selectedItem.quantity : 0;
    sale.subtotal = Math.max(0, Number(sale.subtotal || 0) - returnedGrossValue);
    sale.finalTotal = Math.max(0, Number(sale.finalTotal || 0) - refund);
    sale.discount = Math.max(0, sale.subtotal - sale.finalTotal);
    if (sale.paymentType === 'Cash') {
      sale.remainingBalance = Math.max(0, Number(sale.remainingBalance || 0) - refund);
      sale.paymentStatus = sale.remainingBalance <= 0.005 ? 'Paid' : 'Unpaid';
    } else if (plan) {
      sale.totalWithMarkup = plan.totalAmount;
      sale.remainingBalance = plan.remainingBalance;
      sale.markupAmount = Math.max(0, Number(sale.totalWithMarkup || 0) - Number(sale.finalTotal || 0));
      sale.paymentStatus = plan.remainingBalance <= 0.005 ? 'Paid' : 'Unpaid';
    }

    await sale.save({
      validateBeforeSave: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Return processed successfully!',
      data: returnLog,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// DELETE RETURN
// @route DELETE /api/returns/:id
// @access Private
// ============================================================
const deleteReturn = async (req, res) => {
  try {
    // --------------------------------------------------------
    // Deletion Mode
    // --------------------------------------------------------
    const deletionCheck =
      await checkDeletionMode(
        req.shopId
      );

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message,
      });
    }

    // --------------------------------------------------------
    // SaaS: Delete only current shop's return
    // --------------------------------------------------------
    const returnRecord = await Return.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        message: 'Return record not found',
      });
    }

    const sale = await Sale.findOne({ _id: returnRecord.sale, shopId: req.shopId });
    const product = await Product.findOne({ _id: returnRecord.product, shopId: req.shopId });
    if (!sale || !product) {
      return res.status(409).json({ success: false, message: 'The linked sale or product is missing. Return reversal was not applied.' });
    }

    const saleItems = Array.isArray(sale.items) && sale.items.length
      ? sale.items
      : [{ product: sale.product, quantity: sale.quantity, unitPrice: sale.unitPrice }];
    const saleItem = saleItems.find((item) => String(item.product?._id || item.product) === String(returnRecord.product));
    if (!saleItem) {
      return res.status(409).json({ success: false, message: 'The returned product is no longer part of the sale. Return reversal was not applied.' });
    }
    const snapshot = returnRecord.financialSnapshot;
    if (!snapshot?.sale) {
      return res.status(409).json({ success: false, message: 'This older return has no reversal snapshot. It was left unchanged to avoid corrupting balances.' });
    }

    let plan = null;
    let installmentsToRestore = [];
    if (sale.paymentType === 'Installment') {
      plan = await InstallmentPlan.findOne({ sale: sale._id, shopId: req.shopId });
      if (!plan || !snapshot.plan) {
        return res.status(409).json({ success: false, message: 'The installment plan snapshot is unavailable. Return reversal was not applied.' });
      }
      const currentInstallments = await Installment.find({ shopId: req.shopId, installmentPlan: plan._id });
      const installmentById = new Map(currentInstallments.map((item) => [String(item._id), item]));
      installmentsToRestore = (snapshot.installments || []).map((saved) => installmentById.get(String(saved._id)));
      if (installmentsToRestore.some((item) => !item)) {
        return res.status(409).json({ success: false, message: 'An installment needed for reversal is missing. Return reversal was not applied.' });
      }
    }

    Object.assign(sale, snapshot.sale);
    if (plan) {
      Object.assign(plan, snapshot.plan);
      await plan.save();
      for (let index = 0; index < installmentsToRestore.length; index += 1) {
        Object.assign(installmentsToRestore[index], snapshot.installments[index]);
        await installmentsToRestore[index].save();
      }
    }
    await sale.save({ validateBeforeSave: false });

    const previousQuantity = Number(product.quantity || 0);
    product.quantity = Math.max(0, previousQuantity - Number(returnRecord.quantity || 0));
    await product.save();
    await StockMovement.create({
      shopId: req.shopId,
      product: product._id,
      type: 'Sale',
      quantity: Number(returnRecord.quantity || 0),
      previousQuantity,
      newQuantity: product.quantity,
      reason: `Return ${returnRecord.returnId || ''} reversed`,
      reference: sale.saleId,
    });

    await Return.deleteOne({ _id: returnRecord._id, shopId: req.shopId });

    return res.status(200).json({
      success: true,
      message:
        'Return reversed: stock, sale totals, and outstanding balance were restored.',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to remove return record: ' +
        error.message,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getReturns,
  createReturn,
  deleteReturn,
};
