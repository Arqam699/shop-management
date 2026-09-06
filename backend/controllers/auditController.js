const YearlyAudit = require('../models/YearlyAudit');
const Settings = require('../models/Settings');

// ============================================================
// Helper: Check Deletion Mode
// ============================================================
const checkDeletionMode = async () => {
  const settings = await Settings.findOne();

  // Deletion Mode is OFF
  if (!settings || !settings.allowGlobalDeletion) {
    return {
      allowed: false,
      message:
        'Deletion Mode is disabled. Enable it from Settings first.',
    };
  }

  // Deletion Mode expired
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

// @desc    Get all yearly audits list
// @route   GET /api/audits
// @access  Private
const getYearlyAudits = async (req, res) => {
  try {
    const audits = await YearlyAudit.find().sort({ year: 1 });

    return res.status(200).json({
      success: true,
      data: audits,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new year slot
// @route   POST /api/audits
// @access  Private
const createYearlyAudit = async (req, res) => {
  try {
    const { year } = req.body;
    const yr = Number(year);

    if (isNaN(yr) || yr < 2000 || yr > 2100) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid Year (e.g. 2022)',
      });
    }

    const existingYear = await YearlyAudit.findOne({
      year: yr,
    });

    if (existingYear) {
      return res.status(400).json({
        success: false,
        message: `Audit sheet for Year ${yr} is already registered.`,
      });
    }

    const newAudit = new YearlyAudit({
      year: yr,
    });

    await newAudit.save();

    return res.status(201).json({
      success: true,
      message: `Audit sheet for Year ${yr} generated!`,
      data: newAudit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single year detail
// @route   GET /api/audits/:id
// @access  Private
const getYearlyAuditById = async (req, res) => {
  try {
    const audit = await YearlyAudit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Yearly Audit sheet not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: audit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add purchased product item manually to the year register
// @route   POST /api/audits/:id/purchase
// @access  Private
const addPurchasedProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      quantity,
      purchasePrice,
    } = req.body;

    const qty = Number(quantity);
    const price = Number(purchasePrice);

    const audit = await YearlyAudit.findById(
      req.params.id
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit sheet not found',
      });
    }

    // Push item
    audit.purchasedProducts.push({
      name,
      brand,
      quantity: qty,
      purchasePrice: price,
    });

    // Recalculate total spent buying cost
    audit.totalInventoryCost =
      audit.purchasedProducts.reduce(
        (sum, p) =>
          sum + p.quantity * p.purchasePrice,
        0
      );

    await audit.save();

    return res.status(200).json({
      success: true,
      message: 'Purchase logged!',
      data: audit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add sold product item manually + Automatic Profit calculations
// @route   POST /api/audits/:id/sale
// @access  Private
const addSoldProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      paymentType,
      purchasePrice,
      salePrice,
      receivedAmount,
      planDuration,
      downPayment,
    } = req.body;

    const pPrice = Number(purchasePrice);
    const sPrice = Number(salePrice);
    const recAmt = Number(receivedAmount);
    const dur = Number(planDuration || 0);
    const down = Number(downPayment || 0);

    const audit = await YearlyAudit.findById(
      req.params.id
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit sheet not found',
      });
    }

    // Automatic Profit Calculator
    let calculatedProfit = 0;

    if (paymentType === 'Cash') {
      calculatedProfit = sPrice - pPrice;
    } else {
      calculatedProfit = recAmt - pPrice;
    }

    audit.soldProducts.push({
      name,
      brand,
      paymentType,
      purchasePrice: pPrice,
      salePrice: sPrice,
      receivedAmount:
        paymentType === 'Cash'
          ? sPrice
          : recAmt,
      planDuration: dur,
      downPayment: down,
      profit: calculatedProfit,
    });

    // Recalculate totals
    audit.totalSalesRevenue =
      audit.soldProducts.reduce(
        (sum, s) => sum + s.receivedAmount,
        0
      );

    audit.totalYearlyProfit =
      audit.soldProducts.reduce(
        (sum, s) => sum + s.profit,
        0
      );

    await audit.save();

    return res.status(200).json({
      success: true,
      message:
        'Sale logged & profit audited!',
      data: audit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete custom item from lists
// @route   DELETE /api/audits/:id/item/:itemId
// @access  Private
const deleteAuditItem = async (req, res) => {
  try {
    // ========================================================
    // SECURITY: Check Deletion Mode
    // ========================================================
    const deletionCheck =
      await checkDeletionMode();

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message,
      });
    }

    const { type } = req.query;

    const audit = await YearlyAudit.findById(
      req.params.id
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit sheet not found',
      });
    }

    if (type === 'purchase') {
      audit.purchasedProducts =
        audit.purchasedProducts.filter(
          (p) =>
            p._id.toString() !==
            req.params.itemId
        );

      audit.totalInventoryCost =
        audit.purchasedProducts.reduce(
          (sum, p) =>
            sum +
            p.quantity *
              p.purchasePrice,
          0
        );
    } else if (type === 'sale') {
      audit.soldProducts =
        audit.soldProducts.filter(
          (s) =>
            s._id.toString() !==
            req.params.itemId
        );

      audit.totalSalesRevenue =
        audit.soldProducts.reduce(
          (sum, s) =>
            sum + s.receivedAmount,
          0
        );

      audit.totalYearlyProfit =
        audit.soldProducts.reduce(
          (sum, s) =>
            sum + s.profit,
          0
        );
    } else {
      return res.status(400).json({
        success: false,
        message:
          'Invalid item type. Use purchase or sale.',
      });
    }

    await audit.save();

    return res.status(200).json({
      success: true,
      message: 'Item deleted',
      data: audit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete full year
// @route   DELETE /api/audits/:id
// @access  Private
const deleteYearlyAudit = async (req, res) => {
  try {
    // ========================================================
    // SECURITY: Check Deletion Mode
    // ========================================================
    const deletionCheck =
      await checkDeletionMode();

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message,
      });
    }

    const audit =
      await YearlyAudit.findByIdAndDelete(
        req.params.id
      );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message:
          'Yearly Audit sheet not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Yearly audit sheet deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getYearlyAudits,
  createYearlyAudit,
  getYearlyAuditById,
  addPurchasedProduct,
  addSoldProduct,
  deleteAuditItem,
  deleteYearlyAudit,
};