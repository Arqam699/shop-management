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
    const returnsList = await Return.find({
      shopId: req.shopId,
    })
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
      error: error.message,
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
      returnedQty,
      refundAmount,
      reason,
    } = req.body;

    const rQty = Number(returnedQty);
    const refund = Number(refundAmount || 0);

    // --------------------------------------------------------
    // Validate quantity
    // --------------------------------------------------------
    if (isNaN(rQty) || rQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Returned quantity must be a valid positive number.',
      });
    }

    if (isNaN(refund) || refund < 0) {
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

    if (rQty > sale.quantity) {
      return res.status(400).json({
        success: false,
        message:
          `Returned quantity cannot exceed sold quantity (${sale.quantity} units).`,
      });
    }

    // --------------------------------------------------------
    // SaaS: Product must belong to current shop
    // --------------------------------------------------------
    const productDoc = await Product.findOne({
      _id: sale.product,
      shopId: req.shopId,
    });

    if (productDoc) {
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

    const returnLog = new Return({
      shopId: req.shopId,
      returnId,
      sale: sale._id,
      customer: sale.customer,
      product: sale.product,
      quantity: rQty,
      refundAmount: refund,
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
      const plan = await InstallmentPlan.findOne({
        sale: sale._id,
        shopId: req.shopId,
      });

      if (plan) {
        plan.remainingBalance = Math.max(
          0,
          plan.remainingBalance - refund
        );

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
          const newInstallmentBase = Math.floor(
            plan.remainingBalance /
              unpaidInstallments.length
          );

          const roundingDiff =
            plan.remainingBalance -
            newInstallmentBase *
              unpaidInstallments.length;

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

            instDoc.amount = isLast
              ? newInstallmentBase + roundingDiff
              : newInstallmentBase;

            instDoc.remainingAmount =
              instDoc.amount -
              instDoc.paidAmount;

            if (instDoc.remainingAmount <= 0) {
              instDoc.status = 'Paid';
            }

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
    sale.quantity = Math.max(
      0,
      sale.quantity - rQty
    );

    sale.subtotal =
      sale.quantity *
      sale.unitPrice;

    sale.finalTotal = Math.max(
      0,
      sale.subtotal -
      sale.discount
    );

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
    const deletedReturn =
      await Return.findOneAndDelete({
        _id: req.params.id,
        shopId: req.shopId,
      });

    if (!deletedReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return record not found',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Return record removed successfully!',
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