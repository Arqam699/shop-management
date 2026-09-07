const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');


// ============================================================
// HELPER: CHECK DELETION MODE
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
// GENERATE SALE ID
// SaaS: Sale ID generated separately for each shop
// ============================================================
const generateSaleID = async (shopId) => {
  try {
    const lastSale = await Sale.findOne({
      shopId,
      saleId: /^SALE-\d+$/,
    }).sort({ saleId: -1 });

    if (!lastSale || !lastSale.saleId) {
      return 'SALE-0001';
    }

    const lastIdNum = parseInt(
      lastSale.saleId.split('-')[1],
      10
    );

    return `SALE-${String(
      lastIdNum + 1
    ).padStart(4, '0')}`;

  } catch (err) {
    return `SALE-${Date.now()
      .toString()
      .slice(-4)}`;
  }
};


// ============================================================
// GENERATE INSTALLMENT PLAN ID
// SaaS: Plan ID generated separately for each shop
// ============================================================
const generatePlanID = async (shopId) => {
  try {
    const plans = await InstallmentPlan.find(
      {
        shopId,
      },
      'planId'
    );

    let maxNum = 0;

    plans.forEach((p) => {
      if (p.planId) {
        const num = parseInt(
          p.planId.replace(/[^0-9]/g, ''),
          10
        );

        if (
          !isNaN(num) &&
          num > maxNum
        ) {
          maxNum = num;
        }
      }
    });

    return String(
      maxNum + 1
    ).padStart(2, '0');

  } catch (err) {
    return '01';
  }
};


// ============================================================
// GET SALES
// @route GET /api/sales
// @access Private
// ============================================================
const getSales = async (req, res) => {
  try {
    const sales = await Sale.find({
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
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: sales,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// GET SALE BY ID
// @route GET /api/sales/:id
// @access Private
// ============================================================
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      shopId: req.shopId,
    })
      .populate('customer')
      .populate('product');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found',
      });
    }

    const plan =
      await InstallmentPlan.findOne({
        sale: sale._id,
        shopId: req.shopId,
      });

    let installments = [];

    if (plan) {
      installments =
        await Installment.find({
          installmentPlan: plan._id,
          shopId: req.shopId,
        }).sort({
          installmentNumber: 1,
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...sale.toObject(),
        installmentPlan: plan,
        installments,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load details',
      error: error.message,
    });
  }
};


// ============================================================
// CREATE SALE
// @route POST /api/sales
// @access Private
// ============================================================
const createSale = async (req, res) => {
  try {
    const {
      customer,
      product,
      quantity,
      unitPrice,
      discount,
      paymentType,
      downPayment,
      installmentDuration,
      manualInvoiceNumber,
    } = req.body;

    const qty = Number(quantity);
    const uPrice = Number(unitPrice);
    const disc = Number(discount || 0);
    const dPayment = Number(
      downPayment || 0
    );
    const duration = Number(
      installmentDuration || 0
    );

    const calculatedSubtotal =
      qty * uPrice;

    const calculatedFinalTotal =
      calculatedSubtotal - disc;

    const initialRemaining =
      calculatedFinalTotal - dPayment;

    if (calculatedFinalTotal < 0) {
      return res.status(400).json({
        success: false,
        message:
          'Discount cannot be greater than subtotal.',
      });
    }

    // ========================================================
    // CUSTOMER MUST BELONG TO CURRENT SHOP
    // ========================================================
    const customerDoc =
      await Customer.findOne({
        _id: customer,
        shopId: req.shopId,
      });

    if (!customerDoc) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // ========================================================
    // SALE ID
    // SaaS: Generate per shop
    // ========================================================
    const saleId =
      manualInvoiceNumber
        ? manualInvoiceNumber
            .trim()
            .toUpperCase()
        : await generateSaleID(
            req.shopId
          );

    // ========================================================
    // IMPORTANT:
    // Duplicate invoice check must also be shop-specific
    // ========================================================
    const existingSale =
      await Sale.findOne({
        saleId,
        shopId: req.shopId,
      });

    if (existingSale) {
      return res.status(400).json({
        success: false,
        message:
          `Invoice / Bill Number "${saleId}" already exists. Please use a unique bill number.`,
      });
    }

    // ========================================================
    // PRODUCT MUST BELONG TO CURRENT SHOP
    // ========================================================
    const prodDoc =
      await Product.findOne({
        _id: product,
        shopId: req.shopId,
      });

    if (!prodDoc) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (prodDoc.quantity < qty) {
      return res.status(400).json({
        success: false,
        message:
          'Insufficient stock available.',
      });
    }

    const previousQty =
      prodDoc.quantity;

    prodDoc.quantity -= qty;

    await prodDoc.save();

    // ========================================================
    // INSTALLMENT MARKUP
    // ========================================================
    let markupPercent = 0;

    if (
      paymentType === 'Installment'
    ) {
      if (duration === 3) {
        markupPercent = 0.15;
      } else if (duration === 6) {
        markupPercent = 0.25;
      } else if (duration === 12) {
        markupPercent = 0.50;
      } else {
        if (duration <= 3) {
          markupPercent = 0.15;
        } else if (duration <= 6) {
          markupPercent = 0.25;
        } else {
          markupPercent = 0.50;
        }
      }
    }

    const markupAmount =
      Math.round(
        initialRemaining *
          markupPercent
      );

    const totalFinancedAmount =
      initialRemaining +
      markupAmount;

    // ========================================================
    // CREATE SALE
    // ========================================================
    const sale = new Sale({
      shopId: req.shopId,
      saleId,
      customer: customerDoc._id,
      product: prodDoc._id,
      quantity: qty,
      unitPrice: uPrice,
      discount: disc,
      subtotal: calculatedSubtotal,
      finalTotal:
        calculatedFinalTotal,
      paymentType,
      downPayment:
        paymentType === 'Installment'
          ? dPayment
          : 0,
      remainingBalance:
        paymentType === 'Installment'
          ? totalFinancedAmount
          : 0,
      installmentDuration:
        paymentType === 'Installment'
          ? duration
          : 0,
    });

    await sale.save();

    // ========================================================
    // STOCK MOVEMENT
    // ========================================================
    const stockMovement =
      new StockMovement({
        shopId: req.shopId,
        product: prodDoc._id,
        type: 'Sale',
        quantity: qty,
        previousQuantity:
          previousQty,
        newQuantity:
          prodDoc.quantity,
        reason:
          `Sold to customer (${saleId})`,
        reference: saleId,
      });

    await stockMovement.save();

    // ========================================================
    // CREATE INSTALLMENT PLAN
    // ========================================================
    if (
      paymentType === 'Installment'
    ) {
      const planId =
        await generatePlanID(
          req.shopId
        );

      const firstDueDate =
        new Date();

      firstDueDate.setMonth(
        firstDueDate.getMonth() + 1
      );

      const plan =
        new InstallmentPlan({
          shopId: req.shopId,
          planId,
          sale: sale._id,
          customer:
            customerDoc._id,
          product:
            prodDoc._id,
          totalAmount:
            calculatedFinalTotal +
            markupAmount,
          downPayment: dPayment,
          remainingBalance:
            totalFinancedAmount,
          duration,
          firstDueDate,
        });

      await plan.save();

      const baseAmount =
        Math.floor(
          totalFinancedAmount /
            duration
        );

      const roundingDiff =
        totalFinancedAmount -
        baseAmount * duration;

      let currentDueDate =
        new Date(firstDueDate);

      const installmentsArray = [];

      for (
        let i = 1;
        i <= duration;
        i++
      ) {
        const isLast =
          i === duration;

        const installmentAmount =
          isLast
            ? baseAmount +
              roundingDiff
            : baseAmount;

        installmentsArray.push({
          shopId: req.shopId,
          installmentPlan:
            plan._id,
          installmentNumber: i,
          amount:
            installmentAmount,
          originalAmount:
            installmentAmount,
          paidAmount: 0,
          remainingAmount:
            installmentAmount,
          dueDate:
            new Date(
              currentDueDate
            ),
          status: 'Pending',
        });

        currentDueDate.setMonth(
          currentDueDate.getMonth() + 1
        );
      }

      await Installment.insertMany(
        installmentsArray
      );
    }

    return res.status(201).json({
      success: true,
      message:
        'Sale completed successfully!',
      data: sale,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// UPDATE SALE
// @route PUT /api/sales/:id
// @access Private
// ============================================================
const updateSale = async (req, res) => {
  try {
    const saleId = req.params.id;

    const {
      product,
      quantity,
      unitPrice,
      discount,
      paymentType,
      downPayment,
      installmentDuration,
    } = req.body;

    // ========================================================
    // SALE MUST BELONG TO CURRENT SHOP
    // ========================================================
    const sale =
      await Sale.findOne({
        _id: saleId,
        shopId: req.shopId,
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          'Sale record not found',
      });
    }

    const qty = Number(quantity);
    const uPrice = Number(unitPrice);
    const disc = Number(
      discount || 0
    );
    const dPayment = Number(
      downPayment || 0
    );
    const duration = Number(
      installmentDuration || 0
    );

    // ========================================================
    // ORIGINAL PRODUCT
    // ========================================================
    const origProduct =
      await Product.findOne({
        _id: sale.product,
        shopId: req.shopId,
      });

    if (origProduct) {
      origProduct.quantity +=
        sale.quantity;

      await origProduct.save();
    }

    // ========================================================
    // TARGET PRODUCT
    // ========================================================
    const targetProduct =
      await Product.findOne({
        _id: product,
        shopId: req.shopId,
      });

    if (
      !targetProduct ||
      targetProduct.quantity < qty
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Insufficient stock available.',
      });
    }

    const prevStockQty =
      targetProduct.quantity;

    targetProduct.quantity -= qty;

    await targetProduct.save();

    // ========================================================
    // OLD INSTALLMENT PLAN
    // ========================================================
    const oldPlan =
      await InstallmentPlan.findOne({
        sale: sale._id,
        shopId: req.shopId,
      });

    if (oldPlan) {
      await Installment.deleteMany({
        installmentPlan:
          oldPlan._id,
        shopId: req.shopId,
      });

      await InstallmentPlan.findOneAndDelete({
        _id: oldPlan._id,
        shopId: req.shopId,
      });
    }

    const calculatedSubtotal =
      qty * uPrice;

    const calculatedFinalTotal =
      calculatedSubtotal - disc;

    const initialRemaining =
      calculatedFinalTotal -
      dPayment;

    if (calculatedFinalTotal < 0) {
      return res.status(400).json({
        success: false,
        message:
          'Discount cannot be greater than subtotal.',
      });
    }

    // ========================================================
    // INSTALLMENT MARKUP
    // ========================================================
    let markupPercent = 0;

    if (
      paymentType === 'Installment'
    ) {
      if (duration === 3) {
        markupPercent = 0.15;
      } else if (duration === 6) {
        markupPercent = 0.25;
      } else if (duration === 12) {
        markupPercent = 0.50;
      } else {
        if (duration <= 3) {
          markupPercent = 0.15;
        } else if (duration <= 6) {
          markupPercent = 0.25;
        } else {
          markupPercent = 0.50;
        }
      }
    }

    const markupAmount =
      Math.round(
        initialRemaining *
          markupPercent
      );

    const totalFinancedAmount =
      initialRemaining +
      markupAmount;

    // ========================================================
    // UPDATE SALE
    // ========================================================
    sale.product =
      targetProduct._id;

    sale.quantity = qty;

    sale.unitPrice = uPrice;

    sale.discount = disc;

    sale.subtotal =
      sale.quantity * uPrice;

    sale.finalTotal =
      calculatedFinalTotal;

    sale.paymentType =
      paymentType;

    sale.downPayment =
      paymentType === 'Installment'
        ? dPayment
        : 0;

    sale.remainingBalance =
      paymentType === 'Installment'
        ? totalFinancedAmount
        : 0;

    sale.installmentDuration =
      paymentType === 'Installment'
        ? duration
        : 0;

    await sale.save();

    // ========================================================
    // DELETE OLD SALE STOCK MOVEMENT
    // CURRENT SHOP ONLY
    // ========================================================
    await StockMovement.deleteMany({
      reference: sale.saleId,
      shopId: req.shopId,
    });

    // ========================================================
    // CREATE UPDATED SALE MOVEMENT
    // ========================================================
    const updatedMovement =
      new StockMovement({
        shopId: req.shopId,
        product:
          targetProduct._id,
        type: 'Sale',
        quantity: qty,
        previousQuantity:
          prevStockQty,
        newQuantity:
          targetProduct.quantity,
        reason:
          `Corrected/Edited Sale (${sale.saleId})`,
        reference:
          sale.saleId,
      });

    await updatedMovement.save();

    // ========================================================
    // CREATE NEW INSTALLMENT PLAN
    // ========================================================
    if (
      paymentType === 'Installment'
    ) {
      const planId =
        await generatePlanID(
          req.shopId
        );

      const firstDueDate =
        new Date();

      firstDueDate.setMonth(
        firstDueDate.getMonth() + 1
      );

      const plan =
        new InstallmentPlan({
          shopId: req.shopId,
          planId,
          sale: sale._id,
          customer:
            sale.customer,
          product:
            targetProduct._id,
          totalAmount:
            calculatedFinalTotal +
            markupAmount,
          downPayment: dPayment,
          remainingBalance:
            totalFinancedAmount,
          duration,
          firstDueDate,
        });

      await plan.save();

      const baseAmount =
        Math.floor(
          totalFinancedAmount /
            duration
        );

      const roundingDiff =
        totalFinancedAmount -
        baseAmount * duration;

      let currentDueDate =
        new Date(firstDueDate);

      const installmentsArray = [];

      for (
        let i = 1;
        i <= duration;
        i++
      ) {
        const isLast =
          i === duration;

        const installmentAmount =
          isLast
            ? baseAmount +
              roundingDiff
            : baseAmount;

        installmentsArray.push({
          shopId: req.shopId,
          installmentPlan:
            plan._id,
          installmentNumber: i,
          amount:
            installmentAmount,
          originalAmount:
            installmentAmount,
          paidAmount: 0,
          remainingAmount:
            installmentAmount,
          dueDate:
            new Date(
              currentDueDate
            ),
          status: 'Pending',
        });

        currentDueDate.setMonth(
          currentDueDate.getMonth() + 1
        );
      }

      await Installment.insertMany(
        installmentsArray
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Sale updated and schedules synchronized!',
      data: sale,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// DELETE SALE
// @route DELETE /api/sales/:id
// @access Private
// ============================================================
const deleteSale = async (req, res) => {
  try {
    const deletionCheck =
      await checkDeletionMode(
        req.shopId
      );

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message:
          deletionCheck.message,
      });
    }

    // ========================================================
    // SALE MUST BELONG TO CURRENT SHOP
    // ========================================================
    const sale =
      await Sale.findOne({
        _id: req.params.id,
        shopId: req.shopId,
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          'Sale record not found',
      });
    }

    // ========================================================
    // RESTORE PRODUCT STOCK
    // ========================================================
    const productDoc =
      await Product.findOne({
        _id: sale.product,
        shopId: req.shopId,
      });

    if (productDoc) {
      const origQty =
        productDoc.quantity;

      productDoc.quantity +=
        sale.quantity;

      await productDoc.save();

      const restoreMovement =
        new StockMovement({
          shopId: req.shopId,
          product:
            productDoc._id,
          type: 'Return',
          quantity:
            sale.quantity,
          previousQuantity:
            origQty,
          newQuantity:
            productDoc.quantity,
          reason:
            `Dukan sale cancelled & deleted (${sale.saleId})`,
          reference:
            sale.saleId,
        });

      await restoreMovement.save();
    }

    // ========================================================
    // DELETE INSTALLMENT PLAN
    // ========================================================
    const oldPlan =
      await InstallmentPlan.findOne({
        sale: sale._id,
        shopId: req.shopId,
      });

    if (oldPlan) {
      await Installment.deleteMany({
        installmentPlan:
          oldPlan._id,
        shopId: req.shopId,
      });

      await InstallmentPlan.findOneAndDelete({
        _id: oldPlan._id,
        shopId: req.shopId,
      });
    }

    // ========================================================
    // DELETE SALE STOCK MOVEMENTS
    // ========================================================
    await StockMovement.deleteMany({
      reference: sale.saleId,
      shopId: req.shopId,
    });

    // ========================================================
    // DELETE SALE
    // ========================================================
    await Sale.findOneAndDelete({
      _id: req.params.id,
      shopId: req.shopId,
    });

    return res.status(200).json({
      success: true,
      message:
        'Sale deleted and stock restored successfully!',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// EXCHANGE SALE PRODUCT
// @route PATCH /api/sales/:id/exchange
// @access Private
// ============================================================
const exchangeSaleProduct = async (
  req,
  res
) => {
  try {
    const saleId =
      req.params.id;

    const {
      newProductId,
      newPrice,
    } = req.body;

    const nPrice =
      Number(newPrice);

    if (
      isNaN(nPrice) ||
      nPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid positive exchange price.',
      });
    }

    // ========================================================
    // SALE MUST BELONG TO CURRENT SHOP
    // ========================================================
    const sale =
      await Sale.findOne({
        _id: saleId,
        shopId: req.shopId,
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          'Original invoice not found',
      });
    }

    const oldProductId =
      sale.product;

    const oldPrice =
      sale.unitPrice;

    const priceDifference =
      (nPrice - oldPrice) *
      sale.quantity;

    // ========================================================
    // TARGET PRODUCT
    // ========================================================
    const targetProduct =
      await Product.findOne({
        _id: newProductId,
        shopId: req.shopId,
      });

    if (
      !targetProduct ||
      targetProduct.quantity <
        sale.quantity
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Insufficient stock in target product for exchange.',
      });
    }

    // ========================================================
    // OLD PRODUCT
    // ========================================================
    const oldProductDoc =
      await Product.findOne({
        _id: oldProductId,
        shopId: req.shopId,
      });

    if (oldProductDoc) {
      const origQty =
        oldProductDoc.quantity;

      oldProductDoc.quantity +=
        sale.quantity;

      await oldProductDoc.save();

      const returnMovement =
        new StockMovement({
          shopId: req.shopId,
          product:
            oldProductId,
          type: 'Return',
          quantity:
            sale.quantity,
          previousQuantity:
            origQty,
          newQuantity:
            oldProductDoc.quantity,
          reason:
            `Exchanged and returned (linked to: ${sale.saleId})`,
          reference:
            sale.saleId,
        });

      await returnMovement.save();
    }

    // ========================================================
    // REMOVE TARGET PRODUCT FROM STOCK
    // ========================================================
    const prevTargetQty =
      targetProduct.quantity;

    targetProduct.quantity -=
      sale.quantity;

    await targetProduct.save();

    // ========================================================
    // SALE STOCK MOVEMENT
    // ========================================================
    const sellMovement =
      new StockMovement({
        shopId: req.shopId,
        product:
          newProductId,
        type: 'Sale',
        quantity:
          sale.quantity,
        previousQuantity:
          prevTargetQty,
        newQuantity:
          targetProduct.quantity,
        reason:
          `Exchanged and checkout (linked to: ${sale.saleId})`,
        reference:
          sale.saleId,
      });

    await sellMovement.save();

    // ========================================================
    // UPDATE SALE
    // ========================================================
    sale.product =
      targetProduct._id;

    sale.unitPrice =
      nPrice;

    sale.subtotal =
      sale.quantity * nPrice;

    sale.finalTotal +=
      priceDifference;

    // ========================================================
    // UPDATE INSTALLMENT PLAN
    // ========================================================
    if (
      sale.paymentType ===
      'Installment'
    ) {
      const plan =
        await InstallmentPlan.findOne({
          sale: sale._id,
          shopId: req.shopId,
        });

      if (plan) {
        plan.product =
          targetProduct._id;

        plan.totalAmount +=
          priceDifference;

        plan.remainingBalance =
          Math.max(
            0,
            plan.remainingBalance +
              priceDifference
          );

        await plan.save();

        sale.remainingBalance =
          plan.remainingBalance;

        const unpaidInstallments =
          await Installment.find({
            installmentPlan:
              plan._id,
            shopId: req.shopId,
            status: {
              $ne: 'Paid',
            },
          }).sort({
            installmentNumber: 1,
          });

        if (
          unpaidInstallments.length >
          0
        ) {
          const share =
            Math.floor(
              priceDifference /
                unpaidInstallments.length
            );

          const roundingDiff =
            priceDifference -
            share *
              unpaidInstallments.length;

          for (
            let i = 0;
            i <
            unpaidInstallments.length;
            i++
          ) {
            const isLast =
              i ===
              unpaidInstallments.length - 1;

            const instDoc =
              unpaidInstallments[i];

            const additionalAmount =
              isLast
                ? share +
                  roundingDiff
                : share;

            instDoc.amount +=
              additionalAmount;

            instDoc.remainingAmount =
              Math.max(
                0,
                instDoc.remainingAmount +
                  additionalAmount
              );

            await instDoc.save();
          }
        }
      }
    }

    await sale.save({
      validateBeforeSave: false,
    });

    return res.status(200).json({
      success: true,
      message:
        'Product exchanged and dynamic kiston re-balanced!',
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  exchangeSaleProduct,
};