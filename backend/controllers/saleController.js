const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Return = require('../models/Return');
const Counter = require('../models/Counter');
const Book = require('../models/Book');
const mongoose = require('mongoose');
const {
  getPaginationParams,
  paginatedResponse,
} = require('../utils/pagination');

// ============================================================
// HELPERS
// ============================================================

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const addMonthsClamped = (value, months) => {
  const date = new Date(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + Number(months || 0));
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
};

// ============================================================
// BOOLEAN HELPER
// ============================================================

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'on'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no' ||
      normalized === 'off' ||
      normalized === ''
    ) {
      return false;
    }
  }

  return Boolean(value);
};

// ============================================================
// STOCK MOVEMENT
// ============================================================

const createSaleStockMovement = async ({
  shopId,
  product,
  quantity,
  previousQuantity,
  newQuantity,
  reference,
  reason
}) => {
  return StockMovement.create({
    shopId,
    product,
    type: 'Sale',
    quantity: Number(quantity),
    previousQuantity: Number(previousQuantity),
    newQuantity: Number(newQuantity),
    reason,
    reference: String(reference || '')
  });
};

// ============================================================
// DELETION ACCESS
// ============================================================

const checkDeletionMode = async (shopId) => {
  const settings = await Settings.findOne({
    shopId
  });

  if (!settings) {
    return false;
  }

  if (!settings.allowGlobalDeletion) {
    return false;
  }

  if (
    settings.globalDeletionExpiry &&
    new Date(settings.globalDeletionExpiry) < new Date()
  ) {
    return false;
  }

  return true;
};

// ============================================================
// SALE ID
// ============================================================

// ============================================================
// ATOMIC SEQUENCE
//
// Hands out the next sequence number for a per-shop counter
// with a single atomic findOneAndUpdate ($inc).
//
// FIRST USE ONLY: the counter is seeded from the highest ID
// already stored in the database, so previously issued IDs
// are never reused (saleId / planId have unique indexes).
// After seeding, every call is one atomic $inc — no more
// full-collection scans.
// ============================================================

const getNextSequence = async (
  key,
  seedMaxNumber
) => {
  const existing =
    await Counter.findById(key)
      .select('seq')
      .lean();

  if (!existing) {
    const seed = await seedMaxNumber();

    await Counter.findOneAndUpdate(
      { _id: key },
      { $setOnInsert: { seq: seed } },
      { upsert: true }
    );
  }

  const counter =
    await Counter.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

  return counter.seq;
};

const getMaxSaleNumber = async (shopId) => {
  const sales = await Sale.find({
    shopId
  })
    .select('saleId')
    .lean();

  let maxNumber = 0;

  for (const sale of sales) {
    if (!sale.saleId) continue;

    const match = String(sale.saleId).match(/SALE-(\d+)/i);

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        Number(match[1])
      );
    }
  }

  return maxNumber;
};

const generateSaleID = async (shopId) => {
  const seq = await getNextSequence(
    `sale_${shopId}`,
    () => getMaxSaleNumber(shopId)
  );

  return `SALE-${String(seq).padStart(4, '0')}`;
};

const generatePaymentID = async (shopId) => {
  const payments = await Payment.find({ shopId })
    .select('paymentId')
    .lean();

  const maxNumber = payments.reduce((max, payment) => {
    const match = String(payment.paymentId || '').match(/\d+/);
    return match ? Math.max(max, Number(match[0])) : max;
  }, 0);

  return String(maxNumber + 1).padStart(2, '0');
};

const generateLatestSaleID = async (shopId) => {
  const counterId = `sale_${shopId}`;
  const maxSaleNumber = await getMaxSaleNumber(shopId);

  // Imported or manually numbered invoices may be ahead of the saved counter.
  // Move the counter forward before allocating an edit's replacement invoice.
  await Counter.findOneAndUpdate(
    { _id: counterId },
    { $max: { seq: maxSaleNumber } },
    { upsert: true }
  );

  const seq = await getNextSequence(
    counterId,
    () => Promise.resolve(maxSaleNumber)
  );

  return `SALE-${String(seq).padStart(4, '0')}`;
};

// ============================================================
// PLAN ID
// ============================================================

const getMaxPlanNumber = async (shopId) => {
  const plans = await InstallmentPlan.find({
    shopId
  })
    .select('planId')
    .lean();

  let maxNumber = 0;

  for (const plan of plans) {
    if (!plan.planId) continue;

    const match = String(plan.planId).match(/\d+/);

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        Number(match[0])
      );
    }
  }

  return maxNumber;
};

const generatePlanID = async (shopId) => {
  const seq = await getNextSequence(
    `plan_${shopId}`,
    () => getMaxPlanNumber(shopId)
  );

  return String(seq).padStart(2, '0');
};

// ============================================================
// DEFAULT INSTALLMENT SCHEDULE
// ============================================================

const buildDefaultSchedule = ({
  financedAmount,
  duration,
  firstDueDate,
  startingInstallmentNumber = 1
}) => {
  const total = roundMoney(financedAmount);
  const count = Number(duration);

  if (
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return [];
  }

  const monthly = roundMoney(total / count);

  const schedule = [];

  let allocated = 0;

  const startDate = firstDueDate
    ? new Date(firstDueDate)
    : new Date();

  for (let i = 0; i < count; i++) {
    const amount =
      i === count - 1
        ? roundMoney(total - allocated)
        : monthly;

    allocated = roundMoney(
      allocated + amount
    );

    const dueDate = new Date(startDate);

    dueDate.setMonth(
      dueDate.getMonth() + i
    );

    schedule.push({
      installmentNumber:
        startingInstallmentNumber + i,

      amount,

      dueDate
    });
  }

  return schedule;
};

// ============================================================
// VALIDATE CUSTOM INSTALLMENT SCHEDULE
// ============================================================

const validateSchedule = ({
  installments,
  expectedCount,
  expectedTotal,
  startingInstallmentNumber = 1
}) => {
  if (!Array.isArray(installments)) {
    return {
      valid: false,
      message:
        'Installment schedule is required.'
    };
  }

  if (
    installments.length !==
    Number(expectedCount)
  ) {
    return {
      valid: false,
      message:
        `Installment schedule must contain exactly ${expectedCount} installments.`
    };
  }

  let total = 0;

  const normalized = [];

  for (
    let index = 0;
    index < installments.length;
    index++
  ) {
    const item = installments[index];

    const expectedNumber =
      Number(startingInstallmentNumber) + index;

    const installmentNumber = Number(
      item.installmentNumber ?? expectedNumber
    );

    const amount = roundMoney(
      Number(item.amount)
    );

    const dueDate = normalizeDate(
      item.dueDate
    );

    if (
      !Number.isInteger(installmentNumber) ||
      installmentNumber !== expectedNumber
    ) {
      return {
        valid: false,
        message:
          `Invalid installment number at row ${index + 1}. Expected ${expectedNumber}.`
      };
    }

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return {
        valid: false,
        message:
          `Invalid installment amount at row ${index + 1}.`
      };
    }

    if (!dueDate) {
      return {
        valid: false,
        message:
          `Invalid due date at row ${index + 1}.`
      };
    }

    total = roundMoney(
      total + amount
    );

    normalized.push({
      installmentNumber,
      amount,
      dueDate
    });
  }

  const difference = roundMoney(
    total - Number(expectedTotal)
  );

  if (Math.abs(difference) > 0.01) {
    return {
      valid: false,
      message:
        `Installment schedule total must be Rs. ${roundMoney(expectedTotal).toLocaleString()}, but it is Rs. ${total.toLocaleString()}.`
    };
  }

  return {
    valid: true,
    schedule: normalized
  };
};

// ============================================================
// BUILD INSTALLMENT CALCULATION
// ============================================================

const calculateInstallmentSale = ({
  finalTotal,
  downPayment,
  markupPercentage,
  selectedDuration,
  treatDownPaymentAsFirstInstallment
}) => {
  const saleTotal = roundMoney(finalTotal);
  const dPayment = roundMoney(downPayment);
  const markup = roundMoney(markupPercentage);
  const selected = Number(selectedDuration);

  const treatDownPayment =
    toBoolean(
      treatDownPaymentAsFirstInstallment
    );

  let financedAmount;
  let markupAmount;
  let remainingBeforeMarkup;
  let actualInstallmentCount;

  remainingBeforeMarkup = roundMoney(
    Math.max(0, saleTotal - dPayment)
  );

  markupAmount = roundMoney(
    remainingBeforeMarkup * (markup / 100)
  );

  financedAmount = roundMoney(
    remainingBeforeMarkup + markupAmount
  );

  actualInstallmentCount = treatDownPayment
    ? Math.max(0, selected - 1)
    : selected;

  return {
    saleTotal,
    downPayment: dPayment,
    remainingBeforeMarkup,
    markupPercentage: markup,
    markupAmount,
    totalWithMarkup: roundMoney(
      dPayment + financedAmount
    ),
    financedAmount,
    selectedDuration: selected,
    actualInstallmentCount,
    treatDownPaymentAsFirstInstallment:
      treatDownPayment
  };
};

// ============================================================
// CREATE SALE
// ============================================================

const createSale = async (req, res) => {
  try {
    const shopId = req.shopId;

    const {
      manualInvoiceNumber,
      saleDate,
      bookId,
      purchasePriceAtSale,
      stockAdjustment = 0,
      customer,
      product,
      items = [],
      quantity = 1,
      unitPrice,
      discount = 0,
      paymentType = 'Cash',
      paymentStatus = 'Paid',
      downPayment = 0,
      paymentMethod = 'Cash',
      markupPercentage = 0,
      installmentDuration = 0,
      selectedInstallmentDuration = 0,
      treatDownPaymentAsFirstInstallment = false,
      initialPaymentType,
      initialInstallmentPaidAmount = 0,
      installmentSchedule = [],
      installments = []
    } = req.body;

    // ========================================================
    // USE FRONTEND SCHEDULE FIRST
    // ========================================================

    const customInstallments =
      Array.isArray(installmentSchedule) &&
      installmentSchedule.length > 0
        ? installmentSchedule
        : installments;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (paymentType === 'Installment' && !customer) {
      return res.status(400).json({
        message: 'Customer is required.'
      });
    }

    if (!product && !(paymentType === 'Cash' && Array.isArray(items) && items.length)) {
      return res.status(400).json({
        message: 'Product is required.'
      });
    }

    const qty = Number(quantity);
    const price = roundMoney(unitPrice);
    const discountAmount = roundMoney(discount);
    const dPayment = roundMoney(downPayment);
    const markup = roundMoney(markupPercentage);
    const normalizedInitialPaymentType = ['DownPayment', 'FirstInstallment'].includes(initialPaymentType)
      ? initialPaymentType
      : (toBoolean(treatDownPaymentAsFirstInstallment) && dPayment > 0 ? 'DownPayment' : 'None');
    const initialInstallmentPayment = normalizedInitialPaymentType === 'FirstInstallment'
      ? roundMoney(initialInstallmentPaidAmount)
      : 0;

    if (
      !Number.isInteger(qty) ||
      qty <= 0
    ) {
      return res.status(400).json({
        message:
          'Quantity must be a valid positive number.'
      });
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message:
          'Invalid unit price.'
      });
    }

    if (discountAmount < 0) {
      return res.status(400).json({
        message:
          'Discount cannot be negative.'
      });
    }

    if (markup < 0) {
      return res.status(400).json({
        message:
          'Markup percentage cannot be negative.'
      });
    }

    if (
      paymentType !== 'Cash' &&
      paymentType !== 'Installment'
    ) {
      return res.status(400).json({
        message:
          'Invalid payment type.'
      });
    }

    if (!['Paid', 'Unpaid'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Payment status must be Paid or Unpaid.' });
    }

    const selectedBook = bookId ? await Book.findOne({ _id: bookId, shopId }) : null;
    if (bookId && !selectedBook) {
      return res.status(404).json({ message: 'Selected book was not found.' });
    }

    // ========================================================
    // CASH
    // ========================================================

    const recordedSaleDate = saleDate ? normalizeDate(saleDate) : new Date();
    if (!recordedSaleDate) {
      return res.status(400).json({ message: 'Sale date and time are invalid.' });
    }

    if (paymentType === 'Cash') {
      const hasInstallmentData =
        Number(markup) !== 0 ||
        Number(installmentDuration) !== 0 ||
        Number(selectedInstallmentDuration) !== 0 ||
        toBoolean(
          treatDownPaymentAsFirstInstallment
        ) ||
        (
          Array.isArray(customInstallments) &&
          customInstallments.length > 0
        );

      if (hasInstallmentData) {
        return res.status(400).json({
          message:
            'Cash sale cannot contain installment information.'
        });
      }
    }

    // ========================================================
    // INSTALLMENT
    // ========================================================

    if (paymentType === 'Installment') {
      const selectedDurationCheck =
        Number(
          selectedInstallmentDuration ||
          installmentDuration
        );

      if (
        !Number.isInteger(
          selectedDurationCheck
        ) ||
        selectedDurationCheck <= 0
      ) {
        return res.status(400).json({
          message:
            'Installment sale requires a valid installment duration.'
        });
      }
    }

    // ========================================================
    // CUSTOMER
    // ========================================================

    const customerDoc = customer ? await Customer.findOne({ _id: customer, shopId }) : null;

    if (customer && !customerDoc) {
      return res.status(404).json({
        message:
          'Customer not found.'
      });
    }

    if (paymentType === 'Cash' && Array.isArray(items) && items.length > 0) {
      const normalizedItems = [];
      for (const item of items) {
        const itemProductId = item?.product?._id || item?.product?.id || item?.product;
        const itemQty = Number(item?.quantity);
        const itemPrice = roundMoney(item?.unitPrice);
        const stockAdjustment = Number(item?.stockAdjustment || 0);
        if (!itemProductId || !Number.isInteger(itemQty) || itemQty <= 0 || !Number.isFinite(itemPrice) || itemPrice < 0 || !Number.isInteger(stockAdjustment)) {
          return res.status(400).json({ message: 'Each sale item needs a valid product, quantity, and price.' });
        }
        const productDoc = await Product.findOne({ _id: itemProductId, shopId });
        if (!productDoc) return res.status(404).json({ message: 'A sale product was not found.' });
        const itemPurchasePrice = item?.purchasePriceAtSale === undefined
          ? Number(productDoc.purchasePrice || 0)
          : roundMoney(item.purchasePriceAtSale);
        if (!Number.isFinite(itemPurchasePrice) || itemPurchasePrice < 0) {
          return res.status(400).json({ message: `Purchase price for ${productDoc.name} must be a valid non-negative amount.` });
        }
        const alreadyRequested = normalizedItems.filter((entry) => String(entry.product._id) === String(productDoc._id)).reduce((sum, entry) => sum + entry.quantity, 0);
        const previousAdjustments = normalizedItems.filter((entry) => String(entry.product._id) === String(productDoc._id)).reduce((sum, entry) => sum + entry.stockAdjustment, 0);
        const availableAfterAdjustment = Number(productDoc.quantity || 0) + previousAdjustments + stockAdjustment;
        if (availableAfterAdjustment < 0 || availableAfterAdjustment < itemQty + alreadyRequested) {
          return res.status(400).json({ message: `Insufficient stock for ${productDoc.name}. Current quantity: ${productDoc.quantity}. Adjust stock before selling.` });
        }
        normalizedItems.push({ product: productDoc, quantity: itemQty, unitPrice: itemPrice, discount: 0, stockAdjustment, purchasePriceAtSale: itemPurchasePrice });
      }
      const itemsSubtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
      if (discountAmount > itemsSubtotal) return res.status(400).json({ message: 'Overall discount cannot be greater than the sale subtotal.' });
      const itemsDiscount = discountAmount;
      const itemsFinalTotal = roundMoney(itemsSubtotal - discountAmount);
      const cashReceived = dPayment > 0 || paymentStatus === 'Unpaid' ? dPayment : itemsFinalTotal;
      if (cashReceived < 0 || cashReceived > itemsFinalTotal) return res.status(400).json({ message: 'Cash received must be between zero and the sale total.' });
      const saleId = await generateSaleID(shopId);
      const invoiceNumber = manualInvoiceNumber ? String(manualInvoiceNumber).trim() : saleId;
      if (await Sale.findOne({ shopId, saleId: invoiceNumber })) return res.status(400).json({ message: 'Invoice number already exists.' });
      const saleItems = normalizedItems.map(({ product: itemProduct, quantity: itemQty, unitPrice: itemPrice, discount: itemDiscount, purchasePriceAtSale }) => ({ product: itemProduct._id, quantity: itemQty, unitPrice: itemPrice, discount: itemDiscount, purchasePriceAtSale }));
      const sale = await Sale.create({ shopId, saleId: invoiceNumber, book: selectedBook?._id, customer, product: saleItems[0].product, items: saleItems, quantity: saleItems.reduce((sum, item) => sum + item.quantity, 0), unitPrice: itemsSubtotal / saleItems.reduce((sum, item) => sum + item.quantity, 0), purchasePriceAtSale: normalizedItems[0].purchasePriceAtSale, discount: itemsDiscount, subtotal: itemsSubtotal, finalTotal: itemsFinalTotal, markupPercentage: 0, markupAmount: 0, totalWithMarkup: itemsFinalTotal, paymentType: 'Cash', paymentStatus: cashReceived >= itemsFinalTotal ? 'Paid' : 'Unpaid', downPayment: cashReceived, cashPayments: cashReceived > 0 ? [{ amount: cashReceived, paymentDate: recordedSaleDate, paymentMethod: paymentMethod || 'Cash' }] : [], remainingBalance: roundMoney(itemsFinalTotal - cashReceived), installmentDuration: 0, selectedInstallmentDuration: 0, treatDownPaymentAsFirstInstallment: false, installmentScheduleSnapshot: [], saleDate: recordedSaleDate });
      for (const item of normalizedItems) {
        let previousQuantity = Number(item.product.quantity || 0);
        if (item.stockAdjustment !== 0) {
          const adjustedQuantity = previousQuantity + item.stockAdjustment;
          item.product.quantity = adjustedQuantity;
          await item.product.save();
          await StockMovement.create({
            shopId,
            product: item.product._id,
            type: 'Adjustment',
            quantity: Math.abs(item.stockAdjustment),
            previousQuantity,
            newQuantity: adjustedQuantity,
            reason: 'Cash sale stock adjustment',
            reference: invoiceNumber,
          });
          previousQuantity = adjustedQuantity;
        }
        item.product.quantity = previousQuantity - item.quantity;
        await item.product.save();
        await createSaleStockMovement({ shopId, product: item.product._id, quantity: item.quantity, previousQuantity, newQuantity: item.product.quantity, reference: invoiceNumber, reason: `Sale ${invoiceNumber}` });
      }
      return res.status(201).json({ success: true, message: 'Cash sale created successfully.', data: { sale, productName: normalizedItems.map((item) => item.product.name).join(', ') } });
    }

    // ========================================================
    // PRODUCT
    // ========================================================

    let normalizedInstallmentItems = null;
    if (paymentType === 'Installment' && Array.isArray(items) && items.length > 0) {
      normalizedInstallmentItems = [];
      for (const item of items) {
        const itemProductId = item?.product?._id || item?.product?.id || item?.product;
        const itemQty = Number(item?.quantity);
        const itemPrice = roundMoney(item?.unitPrice);
        const itemDiscount = 0;
        const itemStockAdjustment = Number(item?.stockAdjustment || 0);
        if (!itemProductId || !Number.isInteger(itemQty) || itemQty <= 0 || !Number.isFinite(itemPrice) || itemPrice < 0 || !Number.isFinite(itemDiscount) || itemDiscount < 0 || itemDiscount > roundMoney(itemQty * itemPrice) || !Number.isInteger(itemStockAdjustment)) {
          return res.status(400).json({ message: 'Each installment sale item needs a valid product, quantity, price, discount, and stock change.' });
        }
        const itemProduct = await Product.findOne({ _id: itemProductId, shopId });
        if (!itemProduct) return res.status(404).json({ message: 'An installment sale product was not found.' });
        const itemPurchasePrice = item?.purchasePriceAtSale === undefined
          ? Number(itemProduct.purchasePrice || 0)
          : roundMoney(item.purchasePriceAtSale);
        if (!Number.isFinite(itemPurchasePrice) || itemPurchasePrice < 0) {
          return res.status(400).json({ message: `Purchase price for ${itemProduct.name} must be a valid non-negative amount.` });
        }
        normalizedInstallmentItems.push({
          product: itemProduct,
          quantity: itemQty,
          unitPrice: itemPrice,
          discount: itemDiscount,
          stockAdjustment: itemStockAdjustment,
          purchasePriceAtSale: itemPurchasePrice,
        });
      }

      const requestedQuantity = normalizedInstallmentItems.reduce((sum, item) => sum + item.quantity, 0);
      if (requestedQuantity !== qty) {
        return res.status(400).json({ message: 'Sale quantity must match the total quantity of its products.' });
      }

      const stockByProduct = new Map();
      for (const item of normalizedInstallmentItems) {
        const key = String(item.product._id);
        const stock = stockByProduct.get(key) || {
          product: item.product,
          quantity: 0,
          adjustment: 0,
        };
        stock.quantity += item.quantity;
        stock.adjustment += item.stockAdjustment;
        stockByProduct.set(key, stock);
      }
      for (const stock of stockByProduct.values()) {
        const availableAfterAdjustment = Number(stock.product.quantity || 0) + stock.adjustment;
        if (availableAfterAdjustment < 0 || availableAfterAdjustment < stock.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${stock.product.name}. Current quantity: ${stock.product.quantity}. Adjust stock before selling.` });
        }
      }
    }

    const productDoc = normalizedInstallmentItems?.[0]?.product || await Product.findOne({
      _id: product,
      shopId
    });

    if (!productDoc) {
      return res.status(404).json({
        message:
          'Product not found.'
      });
    }

    const currentStock = Number(productDoc.quantity || 0);
    const installmentStockAdjustment = paymentType === 'Installment' && !normalizedInstallmentItems ? Number(stockAdjustment || 0) : 0;
    const stockAfterAdjustment = currentStock + installmentStockAdjustment;
    if (!normalizedInstallmentItems && (!Number.isInteger(installmentStockAdjustment) || stockAfterAdjustment < 0 || stockAfterAdjustment < qty)) {
      return res.status(400).json({
        message:
          `Insufficient stock. Current quantity: ${currentStock}. Adjust stock before selling.`
      });
    }
    const salePurchasePrice = normalizedInstallmentItems?.[0]?.purchasePriceAtSale ?? (purchasePriceAtSale === undefined
      ? Number(productDoc.purchasePrice || 0)
      : roundMoney(purchasePriceAtSale));
    if (!Number.isFinite(salePurchasePrice) || salePurchasePrice < 0) {
      return res.status(400).json({ message: 'Purchase price must be a valid non-negative amount.' });
    }

    // ========================================================
    // SALE TOTAL
    // ========================================================

    const subtotal = normalizedInstallmentItems
      ? roundMoney(normalizedInstallmentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
      : roundMoney(qty * price);

    if (discountAmount > subtotal) {
      return res.status(400).json({ message: 'Overall discount cannot be greater than the sale subtotal.' });
    }

    const finalTotal =
      roundMoney(
        Math.max(
          0,
          subtotal - discountAmount
        )
      );

    // ========================================================
    // CASH SALE
    // ========================================================

    if (paymentType === 'Cash') {
      const cashReceived = dPayment > 0 || paymentStatus === 'Unpaid' ? dPayment : finalTotal;
      if (cashReceived < 0 || cashReceived > finalTotal) {
        return res.status(400).json({ message: 'Cash received must be between zero and the sale total.' });
      }
      const saleId =
        await generateSaleID(shopId);

      let invoiceNumber =
        manualInvoiceNumber
          ? String(manualInvoiceNumber).trim()
          : saleId;

      if (!invoiceNumber) {
        invoiceNumber = saleId;
      }

      const duplicate =
        await Sale.findOne({
          shopId,
          saleId: invoiceNumber
        });

      if (duplicate) {
        return res.status(400).json({
          message:
            'Invoice number already exists.'
        });
      }

      const previousQuantity =
        Number(productDoc.quantity || 0);

      const newQuantity =
        previousQuantity - qty;

      productDoc.quantity =
        newQuantity;

      await productDoc.save();

      const sale =
        await Sale.create({
          shopId,
          saleId: invoiceNumber,
          book: selectedBook?._id,
          customer,
          product,
          quantity: qty,
          unitPrice: price,
          purchasePriceAtSale: salePurchasePrice,
          discount: discountAmount,
          subtotal,
          finalTotal,
          markupPercentage: 0,
          markupAmount: 0,
          totalWithMarkup: finalTotal,
          paymentType: 'Cash',
          paymentStatus: cashReceived >= finalTotal ? 'Paid' : 'Unpaid',
          downPayment: cashReceived,
          cashPayments: cashReceived > 0 ? [{ amount: cashReceived, paymentDate: recordedSaleDate, paymentMethod: paymentMethod || 'Cash' }] : [],
          remainingBalance: roundMoney(finalTotal - cashReceived),
          installmentDuration: 0,
          selectedInstallmentDuration: 0,
          treatDownPaymentAsFirstInstallment: false,
          installmentScheduleSnapshot: [],
          saleDate: recordedSaleDate
        });

      await createSaleStockMovement({
        shopId,
        product: productDoc._id,
        quantity: qty,
        previousQuantity,
        newQuantity,
        reference: invoiceNumber,
        reason: `Sale ${invoiceNumber}`
      });

      return res.status(201).json({
        success: true,
        message:
          'Cash sale created successfully.',
        data: {
          sale,
          productName: productDoc.name,
          stockRemaining: productDoc.quantity,
        }
      });
    }

    // ========================================================
    // INSTALLMENT SALE
    // ========================================================

    const selectedDuration =
      Number(
        selectedInstallmentDuration ||
        installmentDuration
      );

    if (
      !Number.isInteger(
        selectedDuration
      ) ||
      selectedDuration <= 0
    ) {
      return res.status(400).json({
        message:
          'Installment duration must be greater than zero.'
      });
    }

    const treatDownPayment = dPayment > 0;

    if (dPayment < 0) {
      return res.status(400).json({
        message:
          'Down payment cannot be negative.'
      });
    }

    if (dPayment > finalTotal) {
      return res.status(400).json({
        message:
          'Down payment cannot be greater than sale total.'
      });
    }

    if (initialInstallmentPayment < 0 || (normalizedInitialPaymentType === 'FirstInstallment' && initialInstallmentPayment > finalTotal)) {
      return res.status(400).json({ message: 'First-installment payment must be between zero and the total sale amount.' });
    }

    // ========================================================
    // CALCULATION
    // ========================================================

    const calculation =
      calculateInstallmentSale({
        finalTotal,
        downPayment: dPayment,
        markupPercentage: markup,
        selectedDuration,
        treatDownPaymentAsFirstInstallment:
          treatDownPayment
      });

    const {
      remainingBeforeMarkup,
      markupAmount,
      totalWithMarkup,
      financedAmount,
      actualInstallmentCount
    } = calculation;

    if (initialInstallmentPayment > financedAmount) {
      return res.status(400).json({ message: 'First-installment payment cannot be greater than the financed balance.' });
    }

    if (
      actualInstallmentCount === 0 &&
      financedAmount > 0
    ) {
      return res.status(400).json({
        message:
          'There must be at least one future installment for the remaining financed amount.'
      });
    }

    // ========================================================
    // SCHEDULE
    // ========================================================

    let futureSchedule = [];

    if (financedAmount > 0) {
      if (
        Array.isArray(customInstallments) &&
        customInstallments.length > 0
      ) {
        const startingNumber =
          treatDownPayment
            ? 2
            : 1;

        const validation =
          validateSchedule({
            installments:
              customInstallments,
            expectedCount:
              actualInstallmentCount,
            expectedTotal:
              financedAmount,
            startingInstallmentNumber:
              startingNumber
          });

        if (!validation.valid) {
          return res.status(400).json({
            message:
              validation.message
          });
        }

        futureSchedule =
          validation.schedule;
      } else {
        const firstDueDate = addMonthsClamped(
          recordedSaleDate,
          treatDownPayment ? 1 : 0
        );

        futureSchedule =
          buildDefaultSchedule({
            financedAmount,
            duration:
              actualInstallmentCount,
            firstDueDate,
            startingInstallmentNumber:
              treatDownPayment
                ? 2
                : 1
          });
      }
    }

    // ========================================================
    // COMPLETE INVOICE SCHEDULE
    // ========================================================

    const invoiceSchedule = [];

    if (
      treatDownPayment &&
      dPayment > 0
    ) {
      invoiceSchedule.push({
        installmentNumber: 1,
        amount: dPayment,
        dueDate: recordedSaleDate
      });
    }

    invoiceSchedule.push(
      ...futureSchedule
    );

    const initialInstallmentNumber = treatDownPayment ? 2 : 1;
    const firstScheduledEntry = futureSchedule.find((item) => Number(item.installmentNumber) === initialInstallmentNumber);
    const originalFirstScheduledAmount = Number(firstScheduledEntry?.amount || 0);
    const initialPaidByInstallment = new Map();
    if (normalizedInitialPaymentType === 'FirstInstallment' && futureSchedule.length > 0) {
      const firstPaid = Math.min(originalFirstScheduledAmount, initialInstallmentPayment);
      const shortfall = Math.max(0, roundMoney(originalFirstScheduledAmount - firstPaid));
      let targets = futureSchedule
        .filter((item) => Number(item.installmentNumber) > initialInstallmentNumber)
        .map((item) => ({ number: Number(item.installmentNumber), item }));

      // If the first installment receives less than its scheduled amount,
      // close it at the amount actually received and spread its shortfall
      // evenly over all later installments. Preserve the plan total.
      if (shortfall > 0.005 && targets.length > 0 && firstPaid > 0) {
        firstScheduledEntry.amount = roundMoney(firstPaid);
        const shortfallCents = Math.round(shortfall * 100);
        const shareCents = Math.floor(shortfallCents / targets.length);
        const extraCents = shortfallCents % targets.length;
        targets.forEach(({ item }, index) => {
          item.amount = roundMoney(Number(item.amount || 0) + (shareCents + (index < extraCents ? 1 : 0)) / 100);
        });
      }

      if (firstPaid > 0) initialPaidByInstallment.set(initialInstallmentNumber, firstPaid);

      let extra = Math.max(0, roundMoney(initialInstallmentPayment - firstPaid));
      targets = targets.map(({ number, item }) => ({ number, remaining: Number(item.amount || 0) }));
      while (extra > 0.005 && targets.length > 0) {
        const share = extra / targets.length;
        let roundTotal = 0;
        targets = targets.filter((target) => {
          const allocation = Math.min(target.remaining, share);
          target.remaining = roundMoney(target.remaining - allocation);
          initialPaidByInstallment.set(target.number, roundMoney((initialPaidByInstallment.get(target.number) || 0) + allocation));
          roundTotal = roundMoney(roundTotal + allocation);
          return target.remaining > 0.005;
        });
        if (roundTotal <= 0) break;
        extra = roundMoney(extra - roundTotal);
      }
    }
    const firstScheduledAmount = Number(futureSchedule.find((item) => Number(item.installmentNumber) === initialInstallmentNumber)?.amount || 0);
    const initialPaymentCountsAsFirstInstallment = treatDownPayment || (
      normalizedInitialPaymentType === 'FirstInstallment' && firstScheduledAmount > 0 && (initialPaidByInstallment.get(initialInstallmentNumber) || 0) >= firstScheduledAmount
    );
    const remainingInstallmentCount = futureSchedule.filter((item) =>
      Number(item.amount || 0) - (initialPaidByInstallment.get(Number(item.installmentNumber)) || 0) > 0.005
    ).length;
    const remainingAfterInitialPayment = Math.max(0, roundMoney(financedAmount - initialInstallmentPayment));

    // ========================================================
    // INVOICE
    // ========================================================

    const saleId =
      await generateSaleID(shopId);

    let invoiceNumber =
      manualInvoiceNumber
        ? String(manualInvoiceNumber).trim()
        : saleId;

    if (!invoiceNumber) {
      invoiceNumber = saleId;
    }

    const duplicate =
      await Sale.findOne({
        shopId,
        saleId: invoiceNumber
      });

    if (duplicate) {
      return res.status(400).json({
        message:
          'Invoice number already exists.'
      });
    }

    // ========================================================
    // STOCK
    // ========================================================

    let previousQuantity = currentStock;
    let newQuantity = currentStock - qty;
    if (normalizedInstallmentItems) {
      const stockByProduct = new Map();
      for (const item of normalizedInstallmentItems) {
        const key = String(item.product._id);
        const stock = stockByProduct.get(key) || {
          product: item.product,
          quantity: 0,
          adjustment: 0,
        };
        stock.quantity += item.quantity;
        stock.adjustment += item.stockAdjustment;
        stockByProduct.set(key, stock);
      }
      for (const stock of stockByProduct.values()) {
        const itemPreviousQuantity = Number(stock.product.quantity || 0);
        if (stock.adjustment !== 0) {
          const adjustedQuantity = itemPreviousQuantity + stock.adjustment;
          stock.product.quantity = adjustedQuantity;
          await stock.product.save();
          await StockMovement.create({
            shopId,
            product: stock.product._id,
            type: 'Adjustment',
            quantity: Math.abs(stock.adjustment),
            previousQuantity: itemPreviousQuantity,
            newQuantity: adjustedQuantity,
            reason: 'Installment sale stock adjustment',
            reference: invoiceNumber,
          });
        }
        const salePreviousQuantity = Number(stock.product.quantity || 0);
        stock.product.quantity = salePreviousQuantity - stock.quantity;
        await stock.product.save();
        await createSaleStockMovement({
          shopId,
          product: stock.product._id,
          quantity: stock.quantity,
          previousQuantity: salePreviousQuantity,
          newQuantity: stock.product.quantity,
          reference: invoiceNumber,
          reason: `Installment Sale ${invoiceNumber}`,
        });
      }
      previousQuantity = Number(productDoc.quantity || 0) + qty;
      newQuantity = Number(productDoc.quantity || 0);
    } else {
      if (installmentStockAdjustment !== 0) {
        const adjustedQuantity = currentStock + installmentStockAdjustment;
        productDoc.quantity = adjustedQuantity;
        await productDoc.save();
        await StockMovement.create({
          shopId,
          product: productDoc._id,
          type: 'Adjustment',
          quantity: Math.abs(installmentStockAdjustment),
          previousQuantity: currentStock,
          newQuantity: adjustedQuantity,
          reason: 'Installment sale stock adjustment',
          reference: invoiceNumber,
        });
        previousQuantity = adjustedQuantity;
      }

      newQuantity = previousQuantity - qty;
      productDoc.quantity = newQuantity;
      await productDoc.save();
    }

    // ========================================================
    // SALE
    // ========================================================

    const sale =
      await Sale.create({
        shopId,

        saleId:
          invoiceNumber,

        book:
          selectedBook?._id,

        customer,

        product: productDoc._id,

        ...(normalizedInstallmentItems ? {
          items: normalizedInstallmentItems.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            purchasePriceAtSale: item.purchasePriceAtSale,
          })),
        } : {}),

        quantity:
          qty,

        unitPrice:
          price,

        purchasePriceAtSale:
          salePurchasePrice,

        discount:
          discountAmount,

        subtotal,

        finalTotal,

        markupPercentage:
          markup,

        markupAmount,

        totalWithMarkup,

        paymentType:
          'Installment',

        paymentStatus: roundMoney(dPayment + initialInstallmentPayment) >= totalWithMarkup ? 'Paid' : 'Unpaid',

        downPayment:
          dPayment,

        remainingBalance:
          remainingAfterInitialPayment,

        installmentDuration:
          actualInstallmentCount,

        selectedInstallmentDuration:
          selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment,

        initialPaymentType: normalizedInitialPaymentType,
        initialInstallmentPaidAmount: initialInstallmentPayment,

        installmentScheduleSnapshot:
          invoiceSchedule.map(
            (item) => ({
              installmentNumber:
                item.installmentNumber,

              amount:
                item.amount,

              remainingAmount: Math.max(0, roundMoney(Number(item.amount || 0) - (
                treatDownPayment && Number(item.installmentNumber) === 1
                  ? dPayment
                  : (initialPaidByInstallment.get(Number(item.installmentNumber)) || 0)
              ))),

              dueDate:
                item.dueDate
            })
          ),

        saleDate:
          recordedSaleDate
      });

    // ========================================================
    // STOCK MOVEMENT
    // ========================================================

    if (!normalizedInstallmentItems) {
      await createSaleStockMovement({
        shopId,
        product: productDoc._id,
        quantity: qty,
        previousQuantity,
        newQuantity,
        reference: invoiceNumber,
        reason: `Installment Sale ${invoiceNumber}`
      });
    }

    // ========================================================
    // PLAN
    // ========================================================

    const planId =
      await generatePlanID(shopId);

    const firstDueDate =
      futureSchedule.length > 0
        ? futureSchedule[0].dueDate
        : recordedSaleDate;

    const plan =
      await InstallmentPlan.create({
        shopId,

        planId,

        sale:
          sale._id,

        customer,

        product: productDoc._id,

        totalAmount:
          totalWithMarkup,

        downPayment:
          dPayment,

        remainingBalance:
          remainingAfterInitialPayment,

        duration:
          remainingInstallmentCount,

        selectedDuration:
          selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment,

        initialPaymentType: normalizedInitialPaymentType,
        initialInstallmentPaidAmount: initialInstallmentPayment,
        initialPaymentCountsAsFirstInstallment,

        status:
          remainingAfterInitialPayment > 0
            ? 'Active'
            : 'Completed',

        firstDueDate,

        invoiceSnapshot: {
          selectedDuration:
            selectedDuration,

          duration:
            remainingInstallmentCount,

          downPayment:
            dPayment,

          treatDownPaymentAsFirstInstallment:
            treatDownPayment,

          initialPaymentType: normalizedInitialPaymentType,
          initialInstallmentPaidAmount: initialInstallmentPayment,
          initialPaymentCountsAsFirstInstallment,

          financedAmount: remainingAfterInitialPayment,

          installments:
            invoiceSchedule.map(
              (item) => ({
                installmentNumber:
                  item.installmentNumber,

                amount:
                  item.amount,

                remainingAmount: Math.max(0, roundMoney(Number(item.amount || 0) - (
                  treatDownPayment && Number(item.installmentNumber) === 1
                    ? dPayment
                    : (initialPaidByInstallment.get(Number(item.installmentNumber)) || 0)
                ))),

                dueDate:
                  item.dueDate
              })
            ),

          createdAt:
            new Date()
        }
      });

    // ========================================================
    // INSTALLMENT RECORDS
    //
    // IMPORTANT:
    // DP-FIRST MODE:
    // DP is counted ONLY inside installment #1.
    //
    // DO NOT CREATE A SEPARATE PAYMENT RECORD HERE.
    // ========================================================

    const installmentDocuments = [];

    if (
      treatDownPayment &&
      dPayment > 0
    ) {
      installmentDocuments.push({
        shopId,

        installmentPlan:
          plan._id,

        installmentNumber:
          1,

        amount:
          dPayment,

        originalAmount:
          dPayment,

        // DP is actual received money.
        paidAmount:
          dPayment,

        remainingAmount:
          0,

        dueDate:
          recordedSaleDate,

        status:
          'Paid',

        paidDate:
          recordedSaleDate,

        isSettledByPlanPayment:
          false
      });
    }

    if (futureSchedule.length > 0) {
      installmentDocuments.push(
        ...futureSchedule.map((item) => {
          const number = Number(item.installmentNumber);
          const paidAmount = normalizedInitialPaymentType === 'FirstInstallment'
            ? (initialPaidByInstallment.get(number) || 0)
            : 0;
          const remainingAmount = Math.max(0, roundMoney(Number(item.amount || 0) - paidAmount));
          return {
            shopId,

            installmentPlan:
              plan._id,

            installmentNumber:
              item.installmentNumber,

            amount:
              item.amount,

            originalAmount:
              item.amount,

            paidAmount,

            remainingAmount,

            dueDate:
              item.dueDate,

            status: remainingAmount <= 0.005 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending',
            ...(paidAmount > 0 ? { paidDate: recordedSaleDate } : {})
          };
        })
      );
    }

    if (
      installmentDocuments.length > 0
    ) {
      await Installment.insertMany(
        installmentDocuments
      );
    }

    // ========================================================
    // ========================================================
    // RESPONSE
    // ========================================================

    const createdSale =
      await Sale.findOne({
        _id:
          sale._id,

        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product')
        .populate('items.product');

    const createdPlan =
      await InstallmentPlan.findOne({
        _id:
          plan._id,

        shopId
      });

    const createdInstallments =
      await Installment.find({
        shopId,

        installmentPlan:
          plan._id
      })
        .sort({
          installmentNumber: 1
        });

    return res.status(201).json({
      success: true,

      message:
        'Installment sale created successfully.',

      data: {
        sale:
          createdSale,

        plan:
          createdPlan,

        installments:
          createdInstallments,

        paymentReceipt: null,

        calculation: {
          saleTotal:
            finalTotal,

          downPayment:
            dPayment,

          remainingBeforeMarkup,

          markupPercentage:
            markup,

          markupAmount,

          totalWithMarkup,

          financedAmount,

          selectedDuration,

          actualInstallmentCount,

          treatDownPaymentAsFirstInstallment:
            treatDownPayment
        }
      }
    });

    return res.status(500).json({
      success: false,
      message:
        'An unexpected error occurred while creating the sale. Please try again or contact support.',
    });
  } catch (error) {
    console.error(
      'CREATE SALE ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to create sale.',

      error:
        error.message
    });
  }
};

// ============================================================
// GET ALL SALES
// ============================================================

const getSales = async (req, res) => {
  try {
    const shopId =
      req.shopId;

    const requestedType =
      String(
        req.query.type || ''
      )
        .trim()
        .toLowerCase();

    const filter = {
      shopId
    };

    const requestedCustomer = String(req.query.customer || '').trim();
    if (requestedCustomer && mongoose.Types.ObjectId.isValid(requestedCustomer)) {
      filter.customer = requestedCustomer;
    }

    if (
      requestedType === 'cash'
    ) {
      filter.paymentType =
        'Cash';
    }

    if (
      requestedType === 'installment'
    ) {
      filter.paymentType =
        'Installment';
    }

    const requestedStatus = String(req.query.status || '').trim().toLowerCase();
    if (['paid', 'unpaid'].includes(requestedStatus)) {
      filter.paymentStatus = requestedStatus === 'paid' ? 'Paid' : 'Unpaid';
    }

    // --------------------------------------------------------
    // OPTIONAL PAGINATION (backward compatible)
    // ?page=1&limit=20 -> { data, pagination }
    // no params       -> plain array (unchanged)
    // --------------------------------------------------------
    const pagination =
      getPaginationParams(req);

    let salesQuery =
      Sale.find(filter)
        .populate(
          'customer',
          requestedCustomer
            ? 'fullName mobileNumber cnic customerId'
            : 'fullName mobileNumber cnic +liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt'
        )
        .populate('product', 'name brand model')
        .populate('items.product', 'name brand model')
        .populate('book', 'name')
        .sort({
          createdAt: -1
        })
        .lean();

    let totalSales = 0;

    if (pagination) {
      totalSales =
        await Sale.countDocuments(filter);

      salesQuery = salesQuery
        .skip(pagination.skip)
        .limit(pagination.limit);
    }

    const sales =
      await salesQuery;

    // Attach the current installment-plan revision state for admin list views.
    // Keep this as response-only metadata so invoice/receipt print data stays unchanged.
    const installmentSales = sales.filter((sale) => sale.paymentType === 'Installment');
    const installmentSaleIds = installmentSales.map((sale) => sale._id);
    if (installmentSaleIds.length) {
      const installmentPlans = await InstallmentPlan.find({
        shopId,
        sale: { $in: installmentSaleIds },
      })
        .select('sale revisionNumber lastRevisionChange')
        .lean();
      const revisionBySale = new Map(
        installmentPlans.map((plan) => [String(plan.sale), {
          revisionNumber: Number(plan.revisionNumber || 0),
          direction: plan.lastRevisionChange || 'Same',
        }])
      );
      for (const sale of installmentSales) {
        const revision = revisionBySale.get(String(sale._id)) || { revisionNumber: 0, direction: 'Same' };
        const revisionNumber = revision.revisionNumber;
        sale.isInstallmentPlanRevised = revisionNumber > 0;
        sale.installmentPlanRevisionNumber = revisionNumber;
        sale.installmentPlanRevisionDirection = revision.direction;
      }
    }

    if (pagination) {
      return paginatedResponse(
        res,
        sales,
        totalSales,
        pagination
      );
    }

    return res.status(200).json({
      success: true,
      data: sales
    });

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch sales. Please try again or contact support.',
    });
  } catch (error) {
    console.error(
      'GET SALES ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch sales',

      error:
        error.message
    });
  }
};

// ============================================================
// GET SINGLE SALE
// ============================================================

const getSaleById = async (req, res) => {
  try {
    const {
      id
    } = req.params;

    const shopId =
      req.shopId;

    const sale =
      await Sale.findOne({
        _id: id,
        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product')
        .populate('items.product')
        .populate('book', 'name');

    if (!sale) {
      return res.status(404).json({
        message:
          'Sale not found'
      });
    }

    const plan =
      await InstallmentPlan.findOne({
        sale:
          sale._id,

        shopId
      });

    let installments = [];

    if (plan) {
      installments =
        await Installment.find({
          shopId,

          installmentPlan:
            plan._id,
          $or: [
            { revisionNumber: Number(plan.revisionNumber || 0) },
            ...(Number(plan.revisionNumber || 0) === 0 ? [{ revisionNumber: { $exists: false } }] : []),
          ],
          isArchived: { $ne: true },
        })
          .sort({
            installmentNumber: 1
          });

      // Repair revised invoices created before the frozen balance/count
      // snapshot was persisted reliably. Do this once so later collections
      // do not keep changing the invoice's printed balance or Urdu count.
      if (Number(plan.revisionNumber || 0) > 0 && Number(plan.balanceDiscount || 0) > 0) {
        const snapshot = plan.invoiceSnapshot?.toObject?.() || plan.invoiceSnapshot || {};
        let snapshotChanged = false;
        if (Number(snapshot.financedAmount || 0) <= 0 && Number(plan.remainingBalance || 0) > 0) {
          snapshot.financedAmount = Number(plan.remainingBalance || 0);
          snapshotChanged = true;
        }
        if (snapshot.remainingInstallmentCountFrozen !== true) {
          snapshot.remainingInstallmentCount = installments.filter((installment) => {
            const unpaid = Number(installment.remainingAmount || 0) > 0.005 && !['Paid', 'Settled'].includes(installment.status);
            const clearedByDiscount = Number(installment.balanceDiscountAmount || 0) > 0.005 ||
              Number(installment.originalAmount || 0) > Number(installment.amount || 0) + 0.005;
            return unpaid || clearedByDiscount;
          }).length;
          snapshot.remainingInstallmentCountFrozen = true;
          snapshotChanged = true;
        }
        if (snapshotChanged) {
          plan.invoiceSnapshot = snapshot;
          plan.markModified('invoiceSnapshot');
          await plan.save();
        }
      }
    }

    return res.status(200).json({
      success: true,

      data: {
        sale,

        plan,

        installments,

        invoiceSchedule:
          sale.installmentScheduleSnapshot ||
          []
      }
    });

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch sale details. Please try again or contact support.',
    });
  } catch (error) {
    console.error(
      'GET SALE ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to fetch sale',

      error:
        error.message
    });
  }
};

const receiveCashSalePayment = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      shopId: req.shopId,
      paymentType: 'Cash',
    });

    if (!sale) {
      return res.status(404).json({ message: 'Outstanding cash sale not found.' });
    }

    const amount = roundMoney(req.body.amount);
    const remaining = Math.max(0, roundMoney(sale.remainingBalance));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Enter a payment amount greater than zero.' });
    }
    if (amount > remaining) {
      return res.status(400).json({ message: `Payment cannot exceed remaining cash balance ${remaining}.` });
    }

    const paymentDate = req.body.paymentDate ? normalizeDate(req.body.paymentDate) : new Date();
    if (!paymentDate) {
      return res.status(400).json({ message: 'Payment date is invalid.' });
    }

    const updatedSale = await Sale.findOneAndUpdate(
      {
        _id: sale._id,
        shopId: req.shopId,
        paymentType: 'Cash',
        remainingBalance: { $gte: amount },
      },
      {
        $inc: { downPayment: amount, remainingBalance: -amount },
        $push: {
          cashPayments: {
            amount,
            paymentDate,
            paymentMethod: String(req.body.paymentMethod || 'Cash').trim().slice(0, 80) || 'Cash',
          },
        },
      },
      { new: true }
    );

    if (!updatedSale) {
      return res.status(409).json({ message: 'The remaining cash balance changed. Refresh and try again.' });
    }

    updatedSale.paymentStatus = Number(updatedSale.remainingBalance || 0) <= 0 ? 'Paid' : 'Unpaid';
    await updatedSale.save();

    const cashReceipt = await Payment.create({
      shopId: req.shopId,
      paymentId: await generatePaymentID(req.shopId),
      customer: updatedSale.customer || undefined,
      sale: updatedSale._id,
      amount,
      paymentMethod: String(req.body.paymentMethod || 'Cash').trim().slice(0, 80) || 'Cash',
      paymentDate,
      cashSalePayment: true,
      cashRemainingBalanceAfterPayment: Math.max(0, roundMoney(updatedSale.remainingBalance)),
    });

    return res.status(200).json({
      success: true,
      message: updatedSale.paymentStatus === 'Paid'
        ? 'Remaining cash received. Sale is now fully paid and appears in Cash Sales.'
        : 'Cash payment recorded. Remaining amount is still due.',
      data: { sale: updatedSale, payment: cashReceipt },
    });
  } catch (error) {
    console.error('RECEIVE CASH SALE PAYMENT ERROR:', error);
    return res.status(500).json({ message: 'Failed to record cash payment.', error: error.message });
  }
};

const updateCashSaleBalance = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      shopId: req.shopId,
      paymentType: 'Cash',
    });
    if (!sale) {
      return res.status(404).json({ message: 'Cash sale not found.' });
    }

    const newRemainingBalance = roundMoney(req.body.remainingBalance);
    if (!Number.isFinite(newRemainingBalance) || newRemainingBalance < 0) {
      return res.status(400).json({ message: 'Remaining balance must be a valid amount of zero or more.' });
    }

    const receivedAmount = roundMoney(sale.downPayment || 0);
    sale.remainingBalance = newRemainingBalance;
    sale.finalTotal = roundMoney(receivedAmount + newRemainingBalance);
    sale.totalWithMarkup = sale.finalTotal;
    sale.subtotal = roundMoney(sale.finalTotal + Number(sale.discount || 0));
    sale.paymentStatus = newRemainingBalance === 0 ? 'Paid' : 'Unpaid';
    await sale.save();

    return res.status(200).json({
      success: true,
      message: newRemainingBalance === 0
        ? 'Balance updated. This invoice is now fully paid.'
        : 'Remaining cash balance updated.',
      data: { sale },
    });
  } catch (error) {
    console.error('UPDATE CASH SALE BALANCE ERROR:', error);
    return res.status(500).json({ message: 'Failed to update remaining cash balance.', error: error.message });
  }
};

const updateSaleBook = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    const bookId = req.body?.bookId ? String(req.body.bookId).trim() : '';
    if (bookId) {
      const book = await Book.findOne({ _id: bookId, shopId: req.shopId });
      if (!book) return res.status(404).json({ success: false, message: 'Selected book was not found.' });
      sale.book = book._id;
    } else {
      sale.book = undefined;
    }

    await sale.save();
    await sale.populate('book', 'name');
    return res.json({ success: true, data: sale, message: 'Sale book updated successfully.' });
  } catch (error) {
    console.error('Update sale book error:', error);
    return res.status(500).json({ success: false, message: 'Could not update the sale book.' });
  }
};

const bulkUpdateSalesBook = async (req, res) => {
  try {
    const rawSaleIds = Array.isArray(req.body?.saleIds) ? req.body.saleIds : [];
    const saleIds = [...new Set(rawSaleIds.map((id) => String(id || '').trim()).filter(Boolean))];
    const bookId = String(req.body?.bookId || '').trim();

    if (!saleIds.length || saleIds.length > 500 || saleIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: 'Select between 1 and 500 valid sales.' });
    }
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'bookId')) {
      return res.status(400).json({ success: false, message: 'Choose a book or explicitly choose Unassign.' });
    }
    let book = null;
    if (bookId) {
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ success: false, message: 'Select a valid book or choose Unassign.' });
      }
      book = await Book.findOne({ _id: bookId, shopId: req.shopId }).select('_id');
      if (!book) return res.status(404).json({ success: false, message: 'Selected book was not found.' });
    }

    const matchingSaleCount = await Sale.countDocuments({ shopId: req.shopId, _id: { $in: saleIds } });
    if (matchingSaleCount !== saleIds.length) {
      return res.status(404).json({ success: false, message: 'One or more selected sales were not found.' });
    }

    const result = await Sale.updateMany(
      { shopId: req.shopId, _id: { $in: saleIds } },
      book ? { $set: { book: book._id } } : { $unset: { book: 1 } }
    );

    return res.json({
      success: true,
      data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      message: book
        ? `${result.modifiedCount} sale(s) assigned to the selected book.`
        : `${result.modifiedCount} sale(s) unassigned from their books.`,
    });
  } catch (error) {
    console.error('Bulk update sale book error:', error);
    return res.status(500).json({ success: false, message: 'Could not assign the selected sales to the book.' });
  }
};

// ============================================================
// UPDATE SALE
// ============================================================

const updateSale = async (req, res) => {
  try {
    const shopId =
      req.shopId;

    const {
      id
    } = req.params;

    const sale =
      await Sale.findOne({
        _id: id,
        shopId
      });

    if (!sale) {
      return res.status(404).json({
        message:
          'Sale not found'
      });
    }

    // --------------------------------------------------------
    // PAYMENT HISTORY PROTECTION
    // --------------------------------------------------------

    const existingPayment =
      await Payment.exists({
        shopId,

        sale:
          sale._id
      });

    const existingReturn = await Return.exists({ shopId, sale: sale._id });

    if (existingReturn) {
      return res.status(400).json({
        message: 'This sale already has a processed return. It cannot be edited until the return is reversed.',
      });
    }

    if (existingPayment) {
      return res.status(400).json({
        message:
          'This sale already has payments. It cannot be edited because its invoice and installment history are immutable.'
      });
    }

    // An edit creates a newly numbered version of this invoice. Payment
    // collection does not go through this handler and must keep the current ID.
    sale.saleId = await generateLatestSaleID(shopId);

    const {
      customer =
        sale.customer,

      saleDate =
        sale.saleDate,

      product =
        sale.product,

      quantity =
        sale.quantity,

      unitPrice =
        sale.unitPrice,

      purchasePriceAtSale =
        sale.purchasePriceAtSale ?? 0,

      discount =
        sale.discount,

      paymentType =
        sale.paymentType,

      downPayment =
        sale.downPayment,

      markupPercentage =
        sale.markupPercentage || 0,

      installmentDuration =
        sale.selectedInstallmentDuration ||
        sale.installmentDuration,

      selectedInstallmentDuration =
        sale.selectedInstallmentDuration ||
        sale.installmentDuration,

      treatDownPaymentAsFirstInstallment =
        sale.treatDownPaymentAsFirstInstallment,

      items: requestedItems = null,

      installmentSchedule = [],

      installments = []
    } = req.body;

    const updatedSaleDate = normalizeDate(saleDate);
    if (!updatedSaleDate) {
      return res.status(400).json({ message: 'Please provide a valid sale date.' });
    }

    const customInstallments =
      Array.isArray(installmentSchedule) &&
      installmentSchedule.length > 0
        ? installmentSchedule
        : installments;

    if (
      paymentType !== 'Cash' &&
      paymentType !== 'Installment'
    ) {
      return res.status(400).json({
        message:
          'Invalid payment type.'
      });
    }

    if (
      paymentType !==
      sale.paymentType
    ) {
      return res.status(400).json({
        message:
          'Sale type cannot be changed after the sale has been created.'
      });
    }

    // Cash invoices support editing their full product list. Rebuild stock
    // from the difference between the old and new item quantities so removed
    // products are returned to inventory and newly added products are deducted.
    if (paymentType === 'Cash' && Array.isArray(requestedItems)) {
      let customerDoc = null;
      if (customer) {
        if (!mongoose.Types.ObjectId.isValid(String(customer))) {
          return res.status(404).json({ message: 'Customer not found.' });
        }
        customerDoc = await Customer.findOne({ _id: customer, shopId });
        if (!customerDoc) return res.status(404).json({ message: 'Customer not found.' });
      }
      if (requestedItems.length === 0) {
        return res.status(400).json({ message: 'A cash sale must contain at least one product.' });
      }

      const oldItems = Array.isArray(sale.items) && sale.items.length > 0
        ? sale.items.map((item) => ({
            product: item.product,
            quantity: Number(item.quantity || 0),
            purchasePriceAtSale: item.purchasePriceAtSale,
          }))
        : [{
            product: sale.product,
            quantity: Number(sale.quantity || 0),
            purchasePriceAtSale: sale.purchasePriceAtSale,
          }];

      const oldQuantityByProduct = new Map();
      const oldPurchasePriceByProduct = new Map();
      oldItems.forEach((item) => {
        const productId = String(item.product?._id || item.product || '');
        if (!productId) return;
        oldQuantityByProduct.set(
          productId,
          (oldQuantityByProduct.get(productId) || 0) + Number(item.quantity || 0)
        );
        if (!oldPurchasePriceByProduct.has(productId)) {
          oldPurchasePriceByProduct.set(productId, item.purchasePriceAtSale);
        }
      });

      const requestedProductIds = [];
      const parsedItems = [];
      for (const item of requestedItems) {
        const productId = String(item?.product?._id || item?.product?.id || item?.product || '');
        const quantity = Number(item?.quantity);
        const unitPrice = roundMoney(item?.unitPrice);
        const discount = roundMoney(item?.discount || 0);
        const purchasePriceAtSale = item?.purchasePriceAtSale === undefined
          ? undefined
          : roundMoney(item.purchasePriceAtSale);
        if (
          !mongoose.Types.ObjectId.isValid(productId) ||
          !Number.isInteger(quantity) || quantity <= 0 ||
          !Number.isFinite(unitPrice) || unitPrice < 0 ||
          !Number.isFinite(discount) || discount < 0 ||
          discount > roundMoney(quantity * unitPrice) ||
          (purchasePriceAtSale !== undefined &&
            (!Number.isFinite(purchasePriceAtSale) || purchasePriceAtSale < 0))
        ) {
          return res.status(400).json({
            message: 'Each product needs a valid selection, quantity, price, and discount.',
          });
        }
        requestedProductIds.push(productId);
        parsedItems.push({ productId, quantity, unitPrice, discount, purchasePriceAtSale });
      }

      const allProductIds = [...new Set([
        ...oldQuantityByProduct.keys(),
        ...requestedProductIds,
      ])];
      const productDocs = await Product.find({
        _id: { $in: allProductIds },
        shopId,
      });
      const productById = new Map(productDocs.map((doc) => [String(doc._id), doc]));

      const requestedQuantityByProduct = new Map();
      parsedItems.forEach((item) => {
        requestedQuantityByProduct.set(
          item.productId,
          (requestedQuantityByProduct.get(item.productId) || 0) + item.quantity
        );
      });

      for (const productId of requestedQuantityByProduct.keys()) {
        if (!productById.has(productId)) {
          return res.status(404).json({ message: 'A selected product was not found in this shop.' });
        }
      }

      for (const [productId, productDoc] of productById) {
        const oldQuantity = oldQuantityByProduct.get(productId) || 0;
        const requestedQuantity = requestedQuantityByProduct.get(productId) || 0;
        const availableAfterRestoringOldSale = Number(productDoc.quantity || 0) + oldQuantity;
        if (requestedQuantity > availableAfterRestoringOldSale) {
          return res.status(400).json({
            message: `Insufficient stock for ${productDoc.name}. Available quantity: ${availableAfterRestoringOldSale}`,
          });
        }
      }

      for (const [productId, productDoc] of productById) {
        const oldQuantity = oldQuantityByProduct.get(productId) || 0;
        const requestedQuantity = requestedQuantityByProduct.get(productId) || 0;
        const previousQuantity = Number(productDoc.quantity || 0);
        const newQuantity = previousQuantity + oldQuantity - requestedQuantity;
        const quantityDifference = requestedQuantity - oldQuantity;

        if (quantityDifference !== 0) {
          productDoc.quantity = newQuantity;
          await productDoc.save();
          await StockMovement.create({
            shopId,
            product: productDoc._id,
            type: quantityDifference > 0 ? 'Sale' : 'Return',
            quantity: Math.abs(quantityDifference),
            previousQuantity,
            newQuantity,
            reason: `Cash sale ${sale.saleId} edited`,
            reference: sale.saleId,
          });
        }
      }

      const normalizedItems = parsedItems.map((item) => {
        const productDoc = productById.get(item.productId);
        const savedPurchasePrice = item.purchasePriceAtSale ??
          oldPurchasePriceByProduct.get(item.productId) ??
          productDoc.purchasePrice;
        return {
          product: productDoc._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          purchasePriceAtSale: Number(savedPurchasePrice ?? 0),
        };
      });
      const itemSubtotal = roundMoney(normalizedItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      ));
      const itemDiscount = roundMoney(normalizedItems.reduce(
        (sum, item) => sum + item.discount,
        0
      ));
      const itemQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
      const finalTotal = roundMoney(Math.max(0, itemSubtotal - itemDiscount));
      const historicalCashReceived = roundMoney(
        Array.isArray(sale.cashPayments) && sale.cashPayments.length
          ? sale.cashPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          : Number(sale.downPayment || 0)
      );
      if (finalTotal + 0.005 < historicalCashReceived) {
        return res.status(400).json({
          message: `Edited sale total cannot be less than the ${historicalCashReceived} already received. Record a refund/adjustment before lowering the sale total.`,
        });
      }

      sale.items = normalizedItems;
      sale.product = normalizedItems[0].product;
      sale.quantity = itemQuantity;
      sale.unitPrice = itemQuantity > 0 ? itemSubtotal / itemQuantity : 0;
      sale.purchasePriceAtSale = normalizedItems[0].purchasePriceAtSale;
      sale.discount = itemDiscount;
      sale.subtotal = itemSubtotal;
      sale.finalTotal = finalTotal;
      sale.totalWithMarkup = finalTotal;
      sale.customer = customerDoc?._id || null;
      sale.saleDate = updatedSaleDate;
      sale.downPayment = historicalCashReceived;
      sale.remainingBalance = Math.max(0, roundMoney(finalTotal - sale.downPayment));
      sale.paymentStatus = sale.remainingBalance <= 0 ? 'Paid' : 'Unpaid';
      await sale.save();

      return res.json({
        success: true,
        message: 'Cash sale products updated successfully.',
        data: { sale },
      });
    }

    const customerDoc =
      customer
        ? await Customer.findOne({ _id: customer, shopId })
        : null;

    if (paymentType === 'Installment' && !customerDoc) {
      return res.status(404).json({
        message:
          'Customer not found'
      });
    }

    const newProduct =
      await Product.findOne({
        _id:
          product,

        shopId
      });

    if (!newProduct) {
      return res.status(404).json({
        message:
          'Product not found'
      });
    }

    let qty =
      Number(quantity);

    let price =
      roundMoney(unitPrice);

    let purchasePrice =
      roundMoney(purchasePriceAtSale);

    let discountAmount =
      roundMoney(discount);

    const dPayment =
      roundMoney(downPayment);

    const markup =
      roundMoney(markupPercentage);

    if (
      !Number.isInteger(qty) ||
      qty <= 0
    ) {
      return res.status(400).json({
        message:
          'Quantity must be a valid positive number.'
      });
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message:
          'Invalid unit price.'
      });
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      return res.status(400).json({
        message:
          'Invalid purchase price.'
      });
    }

    if (discountAmount < 0) {
      return res.status(400).json({
        message:
          'Discount cannot be negative.'
      });
    }

    if (markup < 0) {
      return res.status(400).json({
        message:
          'Markup cannot be negative.'
      });
    }

    let subtotal =
      roundMoney(
        qty * price
      );

    let finalTotal =
      roundMoney(
        Math.max(
          0,
          subtotal - discountAmount
        )
      );

    let installmentItems = null;
    let installmentProductById = null;
    if (paymentType === 'Installment' && Array.isArray(requestedItems)) {
      if (requestedItems.length === 0) {
        return res.status(400).json({ message: 'An installment sale must contain at least one product.' });
      }
      const oldItems = Array.isArray(sale.items) && sale.items.length > 0
        ? sale.items.map((item) => ({
            product: String(item.product?._id || item.product || ''),
            purchasePriceAtSale: item.purchasePriceAtSale,
          }))
        : [{ product: String(sale.product?._id || sale.product || ''), purchasePriceAtSale: sale.purchasePriceAtSale }];
      const oldCostByProduct = new Map(oldItems.map((item) => [item.product, item.purchasePriceAtSale]));
      const parsedItems = requestedItems.map((item) => ({
        productId: String(item?.product?._id || item?.product?.id || item?.product || ''),
        quantity: Number(item?.quantity),
        unitPrice: roundMoney(item?.unitPrice),
        purchasePriceAtSale: item?.purchasePriceAtSale === undefined ? undefined : roundMoney(item.purchasePriceAtSale),
        discount: roundMoney(item?.discount || 0),
      }));
      if (parsedItems.some((item) =>
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) || item.unitPrice < 0 ||
        !Number.isFinite(item.discount) || item.discount < 0 || item.discount > roundMoney(item.quantity * item.unitPrice) ||
        (item.purchasePriceAtSale !== undefined && (!Number.isFinite(item.purchasePriceAtSale) || item.purchasePriceAtSale < 0))
      )) {
        return res.status(400).json({ message: 'Each product needs a valid selection, quantity, purchase price, selling price, and discount.' });
      }
      const productDocs = await Product.find({ _id: { $in: [...new Set(parsedItems.map((item) => item.productId))] }, shopId });
      installmentProductById = new Map(productDocs.map((doc) => [String(doc._id), doc]));
      if (parsedItems.some((item) => !installmentProductById.has(item.productId))) {
        return res.status(404).json({ message: 'A selected product was not found in this shop.' });
      }
      installmentItems = parsedItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        purchasePriceAtSale: Number(item.purchasePriceAtSale ?? oldCostByProduct.get(item.productId) ?? installmentProductById.get(item.productId).purchasePrice ?? 0),
      }));
      qty = installmentItems.reduce((sum, item) => sum + item.quantity, 0);
      subtotal = roundMoney(installmentItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
      discountAmount = roundMoney(installmentItems.reduce((sum, item) => sum + item.discount, 0));
      finalTotal = roundMoney(Math.max(0, subtotal - discountAmount));
      price = qty > 0 ? roundMoney(subtotal / qty) : 0;
      purchasePrice = installmentItems[0].purchasePriceAtSale;
    }

    // ========================================================
    // CASH UPDATE
    // ========================================================

    if (
      paymentType === 'Cash'
    ) {
      if (dPayment < 0 || dPayment > finalTotal) {
        return res.status(400).json({
          message:
            'Cash received cannot exceed the sale total.'
        });
      }

      if (
        Number(markup) !== 0 ||
        Number(installmentDuration) !== 0 ||
        Number(selectedInstallmentDuration) !== 0 ||
        toBoolean(
          treatDownPaymentAsFirstInstallment
        ) ||
        (
          Array.isArray(customInstallments) &&
          customInstallments.length > 0
        )
      ) {
        return res.status(400).json({
          message:
            'Cash sale cannot contain installment information.'
        });
      }

      const oldProduct =
        await Product.findOne({
          _id:
            sale.product,

          shopId
        });

      if (!oldProduct) {
        return res.status(404).json({
          message:
            'Original product not found.'
        });
      }

      const oldPreviousQuantity =
        Number(
          oldProduct.quantity || 0
        );

      const restoredOldQuantity =
        oldPreviousQuantity +
        Number(sale.quantity);

      const newProductQuantity =
        Number(
          newProduct.quantity || 0
        );

      if (
        String(oldProduct._id) ===
        String(newProduct._id)
      ) {
        if (
          restoredOldQuantity <
          qty
        ) {
          return res.status(400).json({
            message:
              `Insufficient stock. Available quantity: ${restoredOldQuantity}`
          });
        }

        const finalQuantity =
          restoredOldQuantity -
          qty;

        oldProduct.quantity =
          finalQuantity;

        await oldProduct.save();

        await StockMovement.deleteMany({
          shopId,

          reference:
            sale.saleId
        });

        await StockMovement.create({
          shopId,

          product:
            newProduct._id,

          type:
            'Sale',

          quantity:
            qty,

          previousQuantity:
            oldPreviousQuantity,

          newQuantity:
            finalQuantity,

          reason:
            `Updated Sale ${sale.saleId}`,

          reference:
            sale.saleId
        });
      } else {
        if (
          newProductQuantity <
          qty
        ) {
          return res.status(400).json({
            message:
              `Insufficient stock. Available quantity: ${newProductQuantity}`
          });
        }

        oldProduct.quantity =
          restoredOldQuantity;

        await oldProduct.save();

        const finalNewQuantity =
          newProductQuantity -
          qty;

        newProduct.quantity =
          finalNewQuantity;

        await newProduct.save();

        await StockMovement.deleteMany({
          shopId,

          reference:
            sale.saleId
        });

        await StockMovement.create({
          shopId,

          product:
            newProduct._id,

          type:
            'Sale',

          quantity:
            qty,

          previousQuantity:
            newProductQuantity,

          newQuantity:
            finalNewQuantity,

          reason:
            `Updated Sale ${sale.saleId}`,

          reference:
            sale.saleId
        });
      }

      const oldPlan =
        await InstallmentPlan.findOne({
          sale:
            sale._id,

          shopId
        });

      if (oldPlan) {
        await Installment.deleteMany({
          shopId,

          installmentPlan:
            oldPlan._id
        });

        await InstallmentPlan.deleteOne({
          _id:
            oldPlan._id,

          shopId
        });
      }

      sale.customer =
        customer;

      sale.product =
        product;

      sale.purchasePriceAtSale =
        Number(newProduct.purchasePrice || 0);

      sale.quantity =
        qty;

      sale.unitPrice =
        price;

      sale.discount =
        discountAmount;

      sale.subtotal =
        subtotal;

      const historicalCashReceived = roundMoney(
        Array.isArray(sale.cashPayments) && sale.cashPayments.length
          ? sale.cashPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          : Number(sale.downPayment || 0)
      );
      if (finalTotal + 0.005 < historicalCashReceived) {
        return res.status(400).json({
          message: `Edited sale total cannot be less than the ${historicalCashReceived} already received. Record a refund/adjustment before lowering the sale total.`,
        });
      }

      sale.finalTotal =
        finalTotal;

      sale.markupPercentage =
        0;

      sale.markupAmount =
        0;

      sale.totalWithMarkup =
        finalTotal;

      sale.paymentType =
        'Cash';

      sale.downPayment = historicalCashReceived;
      sale.remainingBalance = Math.max(0, roundMoney(finalTotal - sale.downPayment));
      sale.paymentStatus = sale.remainingBalance <= 0 ? 'Paid' : 'Unpaid';

      sale.installmentDuration =
        0;

      sale.selectedInstallmentDuration =
        0;

      sale.treatDownPaymentAsFirstInstallment =
        false;

      sale.installmentScheduleSnapshot =
        [];

      await sale.save();

      return res.json({
        success: true,

        message:
          'Cash sale updated successfully',

        data: {
          sale
        }
      });
    }

    // ========================================================
    // INSTALLMENT UPDATE
    // ========================================================

    const selectedDuration =
      Number(
        selectedInstallmentDuration ||
        installmentDuration
      );

    if (
      !Number.isInteger(
        selectedDuration
      ) ||
      selectedDuration <= 0
    ) {
      return res.status(400).json({
        message:
          'Installment duration must be greater than zero.'
      });
    }

    const treatDownPayment =
      toBoolean(
        treatDownPaymentAsFirstInstallment
      );

    if (dPayment < 0) {
      return res.status(400).json({
        message:
          'Down payment cannot be negative.'
      });
    }

    if (
      dPayment >
      finalTotal
    ) {
      return res.status(400).json({
        message:
          'Down payment cannot be greater than sale total.'
      });
    }

    const calculation =
      calculateInstallmentSale({
        finalTotal,

        downPayment:
          dPayment,

        markupPercentage:
          markup,

        selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment
      });

    const {
      remainingBeforeMarkup,
      markupAmount,
      totalWithMarkup,
      financedAmount,
      actualInstallmentCount
    } = calculation;

    if (
      actualInstallmentCount === 0 &&
      financedAmount > 0
    ) {
      return res.status(400).json({
        message:
          'There must be at least one future installment for the remaining financed amount.'
      });
    }

    // ========================================================
    // BUILD SCHEDULE
    // ========================================================

    let futureSchedule = [];

    if (financedAmount > 0) {
      if (
        Array.isArray(customInstallments) &&
        customInstallments.length > 0
      ) {
        const validation =
          validateSchedule({
            installments:
              customInstallments,

            expectedCount:
              actualInstallmentCount,

            expectedTotal:
              financedAmount,

            startingInstallmentNumber:
              treatDownPayment
                ? 2
                : 1
          });

        if (!validation.valid) {
          return res.status(400).json({
            message:
              validation.message
          });
        }

        futureSchedule =
          validation.schedule;
      } else {
        const firstDueDate = addMonthsClamped(
          updatedSaleDate,
          treatDownPayment ? 1 : 0
        );

        futureSchedule =
          buildDefaultSchedule({
            financedAmount,

            duration:
              actualInstallmentCount,

            firstDueDate,

            startingInstallmentNumber:
              treatDownPayment
                ? 2
                : 1
          });
      }
    }

    // ========================================================
    // COMPLETE INVOICE SCHEDULE
    // ========================================================

    const invoiceSchedule = [];

    if (
      treatDownPayment &&
      dPayment > 0
    ) {
      invoiceSchedule.push({
        installmentNumber:
          1,

        amount:
          dPayment,

        dueDate:
          updatedSaleDate
      });
    }

    invoiceSchedule.push(
      ...futureSchedule
    );

    // ========================================================
    // STOCK
    // ========================================================

    if (installmentItems) {
      const oldItems = Array.isArray(sale.items) && sale.items.length > 0
        ? sale.items.map((item) => ({ productId: String(item.product?._id || item.product || ''), quantity: Number(item.quantity || 0) }))
        : [{ productId: String(sale.product?._id || sale.product || ''), quantity: Number(sale.quantity || 0) }];
      const oldQuantityByProduct = new Map();
      const requestedQuantityByProduct = new Map();
      oldItems.forEach((item) => oldQuantityByProduct.set(item.productId, (oldQuantityByProduct.get(item.productId) || 0) + item.quantity));
      installmentItems.forEach((item) => requestedQuantityByProduct.set(String(item.product), (requestedQuantityByProduct.get(String(item.product)) || 0) + item.quantity));
      const allProductIds = [...new Set([...oldQuantityByProduct.keys(), ...requestedQuantityByProduct.keys()])];
      const stockProducts = await Product.find({ _id: { $in: allProductIds }, shopId });
      const stockProductById = new Map(stockProducts.map((doc) => [String(doc._id), doc]));
      for (const productId of allProductIds) {
        const productDoc = stockProductById.get(productId);
        if (!productDoc) return res.status(404).json({ message: 'An original or selected product was not found in this shop.' });
        const availableAfterRestore = Number(productDoc.quantity || 0) + Number(oldQuantityByProduct.get(productId) || 0);
        const requestedQuantity = Number(requestedQuantityByProduct.get(productId) || 0);
        if (requestedQuantity > availableAfterRestore) {
          return res.status(400).json({ message: `Insufficient stock for ${productDoc.name}. Available quantity: ${availableAfterRestore}` });
        }
      }
      await StockMovement.deleteMany({ shopId, reference: sale.saleId });
      for (const productId of allProductIds) {
        const productDoc = stockProductById.get(productId);
        const previousQuantity = Number(productDoc.quantity || 0) + Number(oldQuantityByProduct.get(productId) || 0);
        const soldQuantity = Number(requestedQuantityByProduct.get(productId) || 0);
        productDoc.quantity = previousQuantity - soldQuantity;
        await productDoc.save();
        if (soldQuantity > 0) {
          await StockMovement.create({
            shopId,
            product: productDoc._id,
            type: 'Sale',
            quantity: soldQuantity,
            previousQuantity,
            newQuantity: productDoc.quantity,
            reason: `Updated Installment Sale ${sale.saleId}`,
            reference: sale.saleId,
          });
        }
      }
    } else {
    const oldProduct =
      await Product.findOne({
        _id:
          sale.product,

        shopId
      });

    if (!oldProduct) {
      return res.status(404).json({
        message:
          'Original product not found.'
      });
    }

    const oldProductQuantity =
      Number(
        oldProduct.quantity || 0
      );

    const restoredOldQuantity =
      oldProductQuantity +
      Number(sale.quantity);

    const newProductQuantity =
      Number(
        newProduct.quantity || 0
      );

    if (
      String(oldProduct._id) ===
      String(newProduct._id)
    ) {
      if (
        restoredOldQuantity <
        qty
      ) {
        return res.status(400).json({
          message:
            `Insufficient stock. Available quantity: ${restoredOldQuantity}`
        });
      }

      const finalQuantity =
        restoredOldQuantity -
        qty;

      oldProduct.quantity =
        finalQuantity;

      await oldProduct.save();

      await StockMovement.deleteMany({
        shopId,

        reference:
          sale.saleId
      });

      await StockMovement.create({
        shopId,

        product:
          newProduct._id,

        type:
          'Sale',

        quantity:
          qty,

        previousQuantity:
          oldProductQuantity,

        newQuantity:
          finalQuantity,

        reason:
          `Updated Installment Sale ${sale.saleId}`,

        reference:
          sale.saleId
      });
    } else {
      if (
        newProductQuantity <
        qty
      ) {
        return res.status(400).json({
          message:
            `Insufficient stock. Available quantity: ${newProductQuantity}`
        });
      }

      oldProduct.quantity =
        restoredOldQuantity;

      await oldProduct.save();

      const finalNewQuantity =
        newProductQuantity -
        qty;

      newProduct.quantity =
        finalNewQuantity;

      await newProduct.save();

      await StockMovement.deleteMany({
        shopId,

        reference:
          sale.saleId
      });

      await StockMovement.create({
        shopId,

        product:
          newProduct._id,

        type:
          'Sale',

        quantity:
          qty,

        previousQuantity:
          newProductQuantity,

        newQuantity:
          finalNewQuantity,

        reason:
          `Updated Installment Sale ${sale.saleId}`,

        reference:
          sale.saleId
      });
    }

    }

    // ========================================================
    // REMOVE OLD PLAN
    // ========================================================

    const oldPlan =
      await InstallmentPlan.findOne({
        sale:
          sale._id,

        shopId
      });

    if (oldPlan) {
      await Installment.deleteMany({
        shopId,

        installmentPlan:
          oldPlan._id
      });

      await InstallmentPlan.deleteOne({
        _id:
          oldPlan._id,

        shopId
      });
    }

    // ========================================================
    // UPDATE SALE
    // ========================================================

    sale.customer =
      customer;

    sale.items = installmentItems || [{
      product,
      quantity: qty,
      unitPrice: price,
      discount: discountAmount,
      purchasePriceAtSale: purchasePrice,
    }];

    sale.product =
      installmentItems ? installmentItems[0].product : product;

    sale.purchasePriceAtSale =
      purchasePrice;

    sale.quantity =
      qty;

    sale.unitPrice =
      price;

    sale.discount =
      discountAmount;

    sale.subtotal =
      subtotal;

    sale.finalTotal =
      finalTotal;

    sale.markupPercentage =
      markup;

    sale.markupAmount =
      markupAmount;

    sale.totalWithMarkup =
      totalWithMarkup;

    sale.paymentType =
      'Installment';

    sale.downPayment =
      dPayment;

    sale.remainingBalance =
      financedAmount;

    sale.installmentDuration =
      actualInstallmentCount;

    sale.selectedInstallmentDuration =
      selectedDuration;

    sale.treatDownPaymentAsFirstInstallment =
      treatDownPayment;

    sale.installmentScheduleSnapshot =
      invoiceSchedule.map(
        (item) => ({
          installmentNumber:
            item.installmentNumber,

          amount:
            item.amount,

          dueDate:
            item.dueDate
        })
      );

    sale.saleDate = updatedSaleDate;

    await sale.save();

    // ========================================================
    // NEW PLAN
    // ========================================================

    const planId =
      await generatePlanID(
        shopId
      );

    const plan =
      await InstallmentPlan.create({
        shopId,

        planId,

        sale:
          sale._id,

        customer,

        product,

        totalAmount:
          totalWithMarkup,

        downPayment:
          dPayment,

        remainingBalance:
          financedAmount,

        duration:
          actualInstallmentCount,

        selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment,

        status:
          financedAmount > 0
            ? 'Active'
            : 'Completed',

        firstDueDate:
          futureSchedule.length
            ? futureSchedule[0].dueDate
            : new Date(),

        invoiceSnapshot: {
          selectedDuration,

          duration:
            actualInstallmentCount,

          downPayment:
            dPayment,

          treatDownPaymentAsFirstInstallment:
            treatDownPayment,

          financedAmount,

          installments:
            invoiceSchedule.map(
              (item) => ({
                installmentNumber:
                  item.installmentNumber,

                amount:
                  item.amount,

                dueDate:
                  item.dueDate
              })
            ),

          createdAt:
            new Date()
        }
      });

    // ========================================================
    // CREATE INSTALLMENT RECORDS
    //
    // DP FIRST = ONLY INSTALLMENT #1 PAID.
    // NO EXTRA PAYMENT RECORD.
    // ========================================================

    const installmentDocuments = [];

    if (
      treatDownPayment &&
      dPayment > 0
    ) {
      installmentDocuments.push({
        shopId,

        installmentPlan:
          plan._id,

        installmentNumber:
          1,

        amount:
          dPayment,

        originalAmount:
          dPayment,

        paidAmount:
          dPayment,

        remainingAmount:
          0,

        dueDate:
          new Date(),

        status:
          'Paid',

        paidDate:
          new Date(),

        isSettledByPlanPayment:
          false
      });
    }

    installmentDocuments.push(
      ...futureSchedule.map(
        (item) => ({
          shopId,

          installmentPlan:
            plan._id,

          installmentNumber:
            item.installmentNumber,

          amount:
            item.amount,

          originalAmount:
            item.amount,

          paidAmount:
            0,

          remainingAmount:
            item.amount,

          dueDate:
            item.dueDate,

          status:
            'Pending'
        })
      )
    );

    if (
      installmentDocuments.length > 0
    ) {
      await Installment.insertMany(
        installmentDocuments
      );
    }

    return res.json({
      success: true,

      message:
        'Installment sale updated successfully',

      data: {
        sale,

        plan,

        installments:
          installmentDocuments
      }
    });

    return res.status(500).json({
      success: false,
      message:
        'An internal error occurred while updating the sale. Please try again.',
    });
  } catch (error) {
    console.error(
      'UPDATE SALE ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to update sale',

      error:
        error.message
    });
  }
};

// ============================================================
// DELETE SALE
// ============================================================

const deleteSale = async (req, res) => {
  try {
    const shopId =
      req.shopId;

    const {
      id
    } = req.params;

    const allowed =
      await checkDeletionMode(
        shopId
      );

    if (!allowed) {
      return res.status(403).json({
        message:
          'Global deletion access is locked.'
      });
    }

    const sale =
      await Sale.findOne({
        _id:
          id,

        shopId
      });

    if (!sale) {
      return res.status(404).json({
        message:
          'Sale not found'
      });
    }

    const plan =
      await InstallmentPlan.findOne({
        sale:
          sale._id,

        shopId
      });

    const saleReturns = await Return.find({
      shopId,
      sale: sale._id,
    })
      .select('product quantity')
      .lean();
    const returnedByProduct = new Map();
    saleReturns.forEach((returnRow) => {
      const productId = String(returnRow.product);
      returnedByProduct.set(
        productId,
        (returnedByProduct.get(productId) || 0) + Number(returnRow.quantity || 0)
      );
    });

    const stockRestoreByProduct = new Map();
    const hasItemSnapshot = Array.isArray(sale.items) && sale.items.length > 0;
    const soldItems = hasItemSnapshot
      ? sale.items
      : [{ product: sale.product, quantity: sale.quantity }];
    const soldByProduct = new Map();
    soldItems.forEach((item) => {
      const productId = String(item.product?._id || item.product || '');
      if (!productId) return;
      soldByProduct.set(
        productId,
        (soldByProduct.get(productId) || 0) + Number(item.quantity || 0)
      );
    });
    soldByProduct.forEach((soldQuantity, productId) => {
      const returnedQuantity = hasItemSnapshot
        ? Number(returnedByProduct.get(productId) || 0)
        : 0; // Legacy sale.quantity has already been reduced by returns.
      const quantityToRestore = Math.max(0, soldQuantity - returnedQuantity);
      if (quantityToRestore > 0) {
        stockRestoreByProduct.set(productId, quantityToRestore);
      }
    });

    if (sale.saleId) {
      await StockMovement.deleteMany({ shopId, reference: sale.saleId });
    }
    for (const [productId, quantity] of stockRestoreByProduct) {
      const product = await Product.findOne({ _id: productId, shopId });
      if (!product) continue;
      const previousQuantity = Number(product.quantity || 0);
      product.quantity = previousQuantity + quantity;
      await product.save();
      await StockMovement.create({
        shopId,
        product: product._id,
        type: 'Return',
        quantity,
        previousQuantity,
        newQuantity: product.quantity,
        reason: `Sale deleted ${sale.saleId}`,
        reference: sale.saleId,
      });
    }

    const deletedPayments = await Payment.deleteMany({
      shopId,
      $or: [
        { sale: sale._id },
        ...(plan ? [{ installmentPlan: plan._id }] : []),
      ],
    });

    await Return.deleteMany({ shopId, sale: sale._id });

    if (plan) {
      await Installment.deleteMany({
        shopId,

        installmentPlan:
          plan._id
      });

      await InstallmentPlan.deleteOne({
        _id:
          plan._id,

        shopId
      });
    }

    await Sale.deleteOne({
      _id:
        sale._id,

      shopId
    });

    return res.json({
      success: true,

      message: 'Sale and related financial records deleted successfully',
      deletedPayments: deletedPayments.deletedCount || 0,
    });

    return res.status(500).json({
      success: false,
      message:
        'An internal error occurred while deleting the sale. Please try again.',
    });
  } catch (error) {
    console.error(
      'DELETE SALE ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to delete sale',

      error:
        error.message
    });
  }
};

// ============================================================
// EXCHANGE SALE PRODUCT
// ============================================================

const exchangeSaleProduct = async (
  req,
  res
) => {
  try {
    const shopId =
      req.shopId;

    const {
      id
    } = req.params;

    const {
      newProductId
    } = req.body;

    const sale =
      await Sale.findOne({
        _id:
          id,

        shopId
      });

    if (!sale) {
      return res.status(404).json({
        message:
          'Sale not found'
      });
    }

    const hasPayments =
      await Payment.exists({
        shopId,

        sale:
          sale._id
      });

    if (
      sale.paymentType ===
        'Installment' &&
      hasPayments
    ) {
      return res.status(400).json({
        message:
          'This sale already has payments. Product exchange cannot change its financial schedule.'
      });
    }

    const oldProduct =
      await Product.findOne({
        _id:
          sale.product,

        shopId
      });

    const newProduct =
      await Product.findOne({
        _id:
          newProductId,

        shopId
      });

    if (!oldProduct) {
      return res.status(404).json({
        message:
          'Old product not found'
      });
    }

    if (!newProduct) {
      return res.status(404).json({
        message:
          'New product not found'
      });
    }

    if (
      String(oldProduct._id) ===
      String(newProduct._id)
    ) {
      return res.status(400).json({
        message:
          'Please select a different product.'
      });
    }

    if (
      Number(newProduct.quantity || 0) <
      Number(sale.quantity)
    ) {
      return res.status(400).json({
        message:
          'Insufficient stock for exchange product.'
      });
    }

    const newUnitPrice =
      roundMoney(
        newProduct.salePrice ??
        sale.unitPrice
      );

    const newSubtotal =
      roundMoney(
        newUnitPrice *
        sale.quantity
      );

    const newFinalTotal =
      roundMoney(
        Math.max(
          0,
          newSubtotal -
          Number(sale.discount || 0)
        )
      );

    let newMarkupPercentage =
      roundMoney(
        sale.markupPercentage || 0
      );

    let newMarkupAmount = 0;

    let newTotalWithMarkup =
      newFinalTotal;

    let newFinancedAmount = 0;

    let newSchedule = [];

    if (
      sale.paymentType ===
      'Installment'
    ) {
      const selectedDuration =
        Number(
          sale.selectedInstallmentDuration ||
          sale.installmentDuration ||
          0
        );

      const treatDownPayment =
        toBoolean(
          sale.treatDownPaymentAsFirstInstallment
        );

      const dPayment =
        roundMoney(
          sale.downPayment || 0
        );

      if (dPayment > newFinalTotal) {
        return res.status(400).json({
          message:
            'Existing down payment is greater than the exchanged product total.'
        });
      }

      const remainingBeforeMarkup =
        roundMoney(
          Math.max(
            0,
            newFinalTotal -
            dPayment
          )
        );

      newMarkupAmount =
        roundMoney(
          remainingBeforeMarkup *
          (newMarkupPercentage / 100)
        );

      newFinancedAmount =
        roundMoney(
          remainingBeforeMarkup +
          newMarkupAmount
        );

      newTotalWithMarkup =
        roundMoney(
          dPayment +
          newFinancedAmount
        );

      const actualCount =
        treatDownPayment
          ? Math.max(
              0,
              selectedDuration - 1
            )
          : selectedDuration;

      if (
        newFinancedAmount > 0 &&
        actualCount <= 0
      ) {
        return res.status(400).json({
          message:
            'Exchange cannot create a valid installment schedule.'
        });
      }

      if (
        newFinancedAmount > 0
      ) {
        const firstDueDate =
          new Date();

        firstDueDate.setMonth(
          firstDueDate.getMonth() + 1
        );

        newSchedule =
          buildDefaultSchedule({
            financedAmount:
              newFinancedAmount,

            duration:
              actualCount,

            firstDueDate,

            startingInstallmentNumber:
              treatDownPayment
                ? 2
                : 1
          });
      }
    }

    const oldProductPreviousQuantity =
      Number(
        oldProduct.quantity || 0
      );

    const newProductPreviousQuantity =
      Number(
        newProduct.quantity || 0
      );

    const oldProductNewQuantity =
      oldProductPreviousQuantity +
      Number(sale.quantity);

    const newProductNewQuantity =
      newProductPreviousQuantity -
      Number(sale.quantity);

    oldProduct.quantity =
      oldProductNewQuantity;

    await oldProduct.save();

    newProduct.quantity =
      newProductNewQuantity;

    await newProduct.save();

    sale.product =
      newProduct._id;

    sale.unitPrice =
      newUnitPrice;

    sale.subtotal =
      newSubtotal;

    sale.finalTotal =
      newFinalTotal;

    if (
      sale.paymentType ===
      'Cash'
    ) {
      sale.markupPercentage =
        0;

      sale.markupAmount =
        0;

      sale.totalWithMarkup =
        newFinalTotal;

      sale.downPayment =
        newFinalTotal;

      sale.remainingBalance =
        0;

      sale.installmentDuration =
        0;

      sale.selectedInstallmentDuration =
        0;

      sale.treatDownPaymentAsFirstInstallment =
        false;

      sale.installmentScheduleSnapshot =
        [];
    } else {
      const selectedDuration =
        Number(
          sale.selectedInstallmentDuration ||
          sale.installmentDuration
        );

      const treatDownPayment =
        toBoolean(
          sale.treatDownPaymentAsFirstInstallment
        );

      const actualCount =
        treatDownPayment
          ? Math.max(
              0,
              selectedDuration - 1
            )
          : selectedDuration;

      const invoiceSchedule = [];

      if (
        treatDownPayment &&
        Number(sale.downPayment || 0) > 0
      ) {
        invoiceSchedule.push({
          installmentNumber:
            1,

          amount:
            roundMoney(
              sale.downPayment
            ),

          dueDate:
            new Date()
        });
      }

      invoiceSchedule.push(
        ...newSchedule
      );

      sale.markupPercentage =
        newMarkupPercentage;

      sale.markupAmount =
        newMarkupAmount;

      sale.totalWithMarkup =
        newTotalWithMarkup;

      sale.remainingBalance =
        newFinancedAmount;

      sale.installmentDuration =
        actualCount;

      sale.selectedInstallmentDuration =
        selectedDuration;

      sale.installmentScheduleSnapshot =
        invoiceSchedule;

      sale.treatDownPaymentAsFirstInstallment =
        treatDownPayment;
    }

    await sale.save();

    const oldPlan =
      await InstallmentPlan.findOne({
        sale:
          sale._id,

        shopId
      });

    if (oldPlan) {
      await Installment.deleteMany({
        shopId,

        installmentPlan:
          oldPlan._id
      });

      await InstallmentPlan.deleteOne({
        _id:
          oldPlan._id,

        shopId
      });
    }

    if (
      sale.paymentType ===
      'Installment'
    ) {
      const planId =
        await generatePlanID(
          shopId
        );

      const selectedDuration =
        Number(
          sale.selectedInstallmentDuration ||
          sale.installmentDuration
        );

      const treatDownPayment =
        toBoolean(
          sale.treatDownPaymentAsFirstInstallment
        );

      const actualCount =
        treatDownPayment
          ? Math.max(
              0,
              selectedDuration - 1
            )
          : selectedDuration;

      const invoiceSchedule =
        sale.installmentScheduleSnapshot ||
        [];

      const plan =
        await InstallmentPlan.create({
          shopId,

          planId,

          sale:
            sale._id,

          customer:
            sale.customer,

          product:
            newProduct._id,

          totalAmount:
            newTotalWithMarkup,

          downPayment:
            sale.downPayment,

          remainingBalance:
            newFinancedAmount,

          duration:
            actualCount,

          selectedDuration,

          treatDownPaymentAsFirstInstallment:
            treatDownPayment,

          status:
            newFinancedAmount > 0
              ? 'Active'
              : 'Completed',

          firstDueDate:
            newSchedule.length
              ? newSchedule[0].dueDate
              : new Date(),

          invoiceSnapshot: {
            selectedDuration,

            duration:
              actualCount,

            downPayment:
              sale.downPayment,

            treatDownPaymentAsFirstInstallment:
              treatDownPayment,

            financedAmount:
              newFinancedAmount,

            installments:
              invoiceSchedule,

            createdAt:
              new Date()
          }
        });

      const installmentDocuments = [];

      if (
        treatDownPayment &&
        Number(sale.downPayment || 0) > 0
      ) {
        installmentDocuments.push({
          shopId,

          installmentPlan:
            plan._id,

          installmentNumber:
            1,

          amount:
            roundMoney(
              sale.downPayment
            ),

          originalAmount:
            roundMoney(
              sale.downPayment
            ),

          paidAmount:
            roundMoney(
              sale.downPayment
            ),

          remainingAmount:
            0,

          dueDate:
            new Date(),

          status:
            'Paid',

          paidDate:
            new Date(),

          isSettledByPlanPayment:
            false
        });
      }

      installmentDocuments.push(
        ...newSchedule.map(
          (item) => ({
            shopId,

            installmentPlan:
              plan._id,

            installmentNumber:
              item.installmentNumber,

            amount:
              item.amount,

            originalAmount:
              item.amount,

            paidAmount:
              0,

            remainingAmount:
              item.amount,

            dueDate:
              item.dueDate,

            status:
              'Pending'
          })
        )
      );

      if (
        installmentDocuments.length > 0
      ) {
        await Installment.insertMany(
          installmentDocuments
        );
      }
    }

    await StockMovement.deleteMany({
      shopId,

      reference:
        sale.saleId
    });

    await createSaleStockMovement({
      shopId,

      product:
        newProduct._id,

      quantity:
        sale.quantity,

      previousQuantity:
        newProductPreviousQuantity,

      newQuantity:
        newProductNewQuantity,

      reference:
        sale.saleId,

      reason:
        `Product exchange for ${sale.saleId}`
    });

    await StockMovement.create({
      shopId,

      product:
        oldProduct._id,

      type:
        'Return',

      quantity:
        sale.quantity,

      previousQuantity:
        oldProductPreviousQuantity,

      newQuantity:
        oldProductNewQuantity,

      reason:
        `Product returned during exchange ${sale.saleId}`,

      reference:
        sale.saleId
    });

    const updatedSale =
      await Sale.findOne({
        _id:
          sale._id,

        shopId
      })
        .populate('customer', '+liveImage +fingerprintImage +liveImageCapturedAt +fingerprintCapturedAt')
        .populate('product');

    return res.json({
      success: true,

      message:
        'Product exchanged successfully',

      data: {
        sale:
          updatedSale
      }
    });

    return res.status(500).json({
      success: false,
      message:
        'An internal error occurred during product exchange. Please try again.',
    });
  } catch (error) {
    console.error(
      'EXCHANGE SALE ERROR:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to exchange product',

      error:
        error.message
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSales,
  getSaleById,
  receiveCashSalePayment,
  updateCashSaleBalance,
  updateSaleBook,
  bulkUpdateSalesBook,
  createSale,
  updateSale,
  deleteSale
};
