const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const InstallmentPlan = require('../models/InstallmentPlan');
const Installment = require('../models/Installment');
const Settings = require('../models/Settings');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');

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

const generateSaleID = async (shopId) => {
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

  return `SALE-${String(maxNumber + 1).padStart(4, '0')}`;
};

// ============================================================
// PLAN ID
// ============================================================

const generatePlanID = async (shopId) => {
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

  return String(maxNumber + 1).padStart(2, '0');
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

  const treatDownPayment = Boolean(
    treatDownPaymentAsFirstInstallment
  );

  let financedAmount;
  let markupAmount;
  let remainingBeforeMarkup;
  let actualInstallmentCount;

  if (treatDownPayment) {
    remainingBeforeMarkup = roundMoney(
      Math.max(
        0,
        saleTotal - dPayment
      )
    );

    markupAmount = roundMoney(
      remainingBeforeMarkup *
      (markup / 100)
    );

    financedAmount = roundMoney(
      remainingBeforeMarkup +
      markupAmount
    );

    actualInstallmentCount = Math.max(
      0,
      selected - 1
    );
  } else {
    const totalWithMarkupBeforeDP =
      roundMoney(
        saleTotal *
        (1 + markup / 100)
      );

    markupAmount = roundMoney(
      totalWithMarkupBeforeDP -
      saleTotal
    );

    financedAmount = roundMoney(
      Math.max(
        0,
        totalWithMarkupBeforeDP -
        dPayment
      )
    );

    actualInstallmentCount = selected;

    remainingBeforeMarkup = saleTotal;
  }

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
      customer,
      product,
      quantity = 1,
      unitPrice,
      discount = 0,
      paymentType = 'Cash',
      downPayment = 0,
      markupPercentage = 0,
      installmentDuration = 0,
      selectedInstallmentDuration = 0,
      treatDownPaymentAsFirstInstallment = false,

      // ======================================================
      // IMPORTANT:
      // FRONTEND SENDS installmentSchedule
      // ======================================================
      installmentSchedule = [],

      // Backward compatibility
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

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (!customer) {
      return res.status(400).json({
        message: 'Customer is required.'
      });
    }

    if (!product) {
      return res.status(400).json({
        message: 'Product is required.'
      });
    }

    const qty = Number(quantity);
    const price = roundMoney(unitPrice);
    const discountAmount = roundMoney(discount);
    const dPayment = roundMoney(downPayment);
    const markup = roundMoney(markupPercentage);

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

    // ========================================================
    // CASH
    // ========================================================

    if (paymentType === 'Cash') {
      const hasInstallmentData =
        Number(dPayment) !== 0 ||
        Number(markup) !== 0 ||
        Number(installmentDuration) !== 0 ||
        Number(selectedInstallmentDuration) !== 0 ||
        Boolean(
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

    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    const customerDoc =
      await Customer.findOne({
        _id: customer,
        shopId
      });

    if (!customerDoc) {
      return res.status(404).json({
        message:
          'Customer not found.'
      });
    }

    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

    const productDoc =
      await Product.findOne({
        _id: product,
        shopId
      });

    if (!productDoc) {
      return res.status(404).json({
        message:
          'Product not found.'
      });
    }

    const currentStock =
      Number(productDoc.quantity || 0);

    if (currentStock < qty) {
      return res.status(400).json({
        message:
          `Insufficient stock. Available quantity: ${currentStock}`
      });
    }

    // --------------------------------------------------------
    // SALE TOTAL
    // --------------------------------------------------------

    const subtotal =
      roundMoney(
        qty * price
      );

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
          customer,
          product,
          quantity: qty,
          unitPrice: price,
          discount: discountAmount,
          subtotal,
          finalTotal,
          markupPercentage: 0,
          markupAmount: 0,
          totalWithMarkup: finalTotal,
          paymentType: 'Cash',
          downPayment: finalTotal,
          remainingBalance: 0,
          installmentDuration: 0,
          selectedInstallmentDuration: 0,
          treatDownPaymentAsFirstInstallment: false,
          installmentScheduleSnapshot: [],
          saleDate: new Date()
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
          sale
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

    const treatDownPayment =
      Boolean(
        treatDownPaymentAsFirstInstallment
      );

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

    // --------------------------------------------------------
    // CALCULATION
    // --------------------------------------------------------

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
        const firstDueDate =
          new Date();

        firstDueDate.setMonth(
          firstDueDate.getMonth() + 1
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
        dueDate: new Date()
      });
    }

    invoiceSchedule.push(
      ...futureSchedule
    );

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

    const previousQuantity =
      Number(productDoc.quantity || 0);

    const newQuantity =
      previousQuantity - qty;

    productDoc.quantity =
      newQuantity;

    await productDoc.save();

    // ========================================================
    // SALE
    // ========================================================

    const sale =
      await Sale.create({
        shopId,

        saleId:
          invoiceNumber,

        customer,

        product,

        quantity:
          qty,

        unitPrice:
          price,

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

        downPayment:
          dPayment,

        remainingBalance:
          financedAmount,

        installmentDuration:
          actualInstallmentCount,

        selectedInstallmentDuration:
          selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment,

        installmentScheduleSnapshot:
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

        saleDate:
          new Date()
      });

    // ========================================================
    // STOCK MOVEMENT
    // ========================================================

    await createSaleStockMovement({
      shopId,

      product:
        productDoc._id,

      quantity:
        qty,

      previousQuantity,

      newQuantity,

      reference:
        invoiceNumber,

      reason:
        `Installment Sale ${invoiceNumber}`
    });

    // ========================================================
    // PLAN
    // ========================================================

    const planId =
      await generatePlanID(shopId);

    const firstDueDate =
      futureSchedule.length > 0
        ? futureSchedule[0].dueDate
        : new Date();

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

        selectedDuration:
          selectedDuration,

        treatDownPaymentAsFirstInstallment:
          treatDownPayment,

        status:
          financedAmount > 0
            ? 'Active'
            : 'Completed',

        firstDueDate,

        invoiceSnapshot: {
          selectedDuration:
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
    // INSTALLMENT RECORDS
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

    if (futureSchedule.length > 0) {
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
    }

    if (
      installmentDocuments.length > 0
    ) {
      await Installment.insertMany(
        installmentDocuments
      );
    }

    // ========================================================
    // DOWN PAYMENT PAYMENT
    // ========================================================

    if (
      treatDownPayment &&
      dPayment > 0
    ) {
      const firstInst =
        await Installment.findOne({
          shopId,

          installmentPlan:
            plan._id,

          installmentNumber:
            1
        });

      if (firstInst) {
        await Payment.create({
          shopId,

          paymentId:
            `DP-${invoiceNumber}`,

          customer,

          sale:
            sale._id,

          installmentPlan:
            plan._id,

          installment:
            firstInst._id,

          amount:
            dPayment,

          paymentMethod:
            'Cash',

          paymentDate:
            new Date(),

          allocations: [
            {
              installment:
                firstInst._id,

              installmentNumber:
                1,

              amount:
                dPayment,

              previousRemaining:
                dPayment,

              remainingAfterPayment:
                0
            }
          ],

          notes:
            `Down Payment for ${invoiceNumber} (Treated as 1st Installment)`
        });
      }
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    const createdSale =
      await Sale.findOne({
        _id:
          sale._id,

        shopId
      })
        .populate('customer')
        .populate('product');

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

    const sales =
      await Sale.find(filter)
        .populate('customer')
        .populate('product')
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json({
      success: true,
      data: sales
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
        .populate('customer')
        .populate('product');

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
            plan._id
        })
          .sort({
            installmentNumber: 1
          });
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

    if (existingPayment) {
      return res.status(400).json({
        message:
          'This sale already has payments. It cannot be edited because its invoice and installment history are immutable.'
      });
    }

    const {
      customer =
        sale.customer,

      product =
        sale.product,

      quantity =
        sale.quantity,

      unitPrice =
        sale.unitPrice,

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

      // ======================================================
      // IMPORTANT FIX
      // ======================================================

      installmentSchedule = [],

      // Backward compatibility
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

    // --------------------------------------------------------
    // STRICT PAYMENT TYPE
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    const customerDoc =
      await Customer.findOne({
        _id:
          customer,

        shopId
      });

    if (!customerDoc) {
      return res.status(404).json({
        message:
          'Customer not found'
      });
    }

    // --------------------------------------------------------
    // PRODUCT
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // NUMBERS
    // --------------------------------------------------------

    const qty =
      Number(quantity);

    const price =
      roundMoney(unitPrice);

    const discountAmount =
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

    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    const subtotal =
      roundMoney(
        qty * price
      );

    const finalTotal =
      roundMoney(
        Math.max(
          0,
          subtotal - discountAmount
        )
      );

    // ========================================================
    // CASH UPDATE
    // ========================================================

    if (
      paymentType === 'Cash'
    ) {
      if (
        Number(dPayment) !==
          Number(sale.finalTotal) &&
        Number(dPayment) !== 0
      ) {
        return res.status(400).json({
          message:
            'Cash sale cannot contain installment down payment information.'
        });
      }

      if (
        Number(markup) !== 0 ||
        Number(installmentDuration) !== 0 ||
        Number(selectedInstallmentDuration) !== 0 ||
        Boolean(
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
        0;

      sale.markupAmount =
        0;

      sale.totalWithMarkup =
        finalTotal;

      sale.paymentType =
        'Cash';

      sale.downPayment =
        finalTotal;

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
      Boolean(
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

    // --------------------------------------------------------
    // CALCULATION
    // --------------------------------------------------------

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
        const firstDueDate =
          new Date();

        firstDueDate.setMonth(
          firstDueDate.getMonth() + 1
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
          new Date()
      });
    }

    invoiceSchedule.push(
      ...futureSchedule
    );

    // ========================================================
    // STOCK
    // ========================================================

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

    sale.product =
      product;

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

        selectedDuration:
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

    const hasPayments =
      await Payment.exists({
        shopId,

        sale:
          sale._id
      });

    if (hasPayments) {
      return res.status(400).json({
        message:
          'This sale has payment history and cannot be deleted.'
      });
    }

    const product =
      await Product.findOne({
        _id:
          sale.product,

        shopId
      });

    if (product) {
      const previousQuantity =
        Number(
          product.quantity || 0
        );

      const newQuantity =
        previousQuantity +
        Number(sale.quantity);

      product.quantity =
        newQuantity;

      await product.save();

      await StockMovement.deleteMany({
        shopId,

        reference:
          sale.saleId,

        type:
          'Sale'
      });

      await StockMovement.create({
        shopId,

        product:
          product._id,

        type:
          'Return',

        quantity:
          Number(sale.quantity),

        previousQuantity,

        newQuantity,

        reason:
          `Sale deleted ${sale.saleId}`,

        reference:
          sale.saleId
      });
    }

    const plan =
      await InstallmentPlan.findOne({
        sale:
          sale._id,

        shopId
      });

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

      message:
        'Sale deleted successfully'
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
        Boolean(
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
        Boolean(
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
        Boolean(
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
        .populate('customer')
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
  createSale,
  updateSale,
  deleteSale,
  exchangeSaleProduct
};