const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Settings = require('../models/Settings');


// ============================================================
// DELETION MODE CHECK
// ============================================================
const checkDeletionMode = async () => {
  const settings = await Settings.findOne();

  // Deletion Mode OFF
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


// ============================================================
// SIMPLE PRODUCT SKU/ID GENERATOR
// ============================================================
const generateSKU = async () => {
  try {
    const products = await Product.find({}, 'sku');

    let maxNum = 0;

    products.forEach(p => {
      if (p.sku) {
        const num = parseInt(
          p.sku.replace(/[^0-9]/g, ''),
          10
        );

        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    return String(maxNum + 1).padStart(2, '0');

  } catch (err) {
    return '01';
  }
};


// ============================================================
// GET ALL PRODUCTS
// @route   GET /api/products
// @access  Private
// ============================================================
const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      status
    } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          brand: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          model: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          sku: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    const products = await Product.find(query)
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: products
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================================================
// GET SINGLE PRODUCT
// @route   GET /api/products/:id
// @access  Private
// ============================================================
const getProductById = async (req, res) => {
  try {
    const product =
      await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      error: error.message
    });
  }
};


// ============================================================
// CREATE PRODUCT
// @route   POST /api/products
// @access  Private
// ============================================================
const createProduct = async (req, res) => {
  try {
    const {
      purchasePrice,
      salePrice,
      quantity,
      minStockLevel
    } = req.body;

    const pPrice = Number(purchasePrice);
    const sPrice = Number(salePrice);
    const qty = Number(quantity);
    const mStock = Number(minStockLevel);

    if (
      isNaN(pPrice) ||
      isNaN(sPrice) ||
      isNaN(qty)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Pricing and Quantity values must be valid numbers'
      });
    }

    const sku = await generateSKU();

    const productData = {
      ...req.body,
      sku,
      purchasePrice: pPrice,
      salePrice: sPrice,
      quantity: qty,
      minStockLevel:
        isNaN(mStock) ? 5 : mStock
    };

    const product =
      new Product(productData);

    await product.save();

    const initialMovement =
      new StockMovement({
        product: product._id,
        type: 'Stock Added',
        quantity: qty,
        previousQuantity: 0,
        newQuantity: qty,
        reason: 'Initial setup purchase',
        reference: sku
      });

    await initialMovement.save();

    return res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: product
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to create product'
    });
  }
};


// ============================================================
// UPDATE PRODUCT
// @route   PUT /api/products/:id
// @access  Private
// ============================================================
const updateProduct = async (req, res) => {
  try {
    const product =
      await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousQty =
      product.quantity;

    const newQty =
      req.body.quantity !== undefined
        ? Number(req.body.quantity)
        : previousQty;

    if (
      req.body.purchasePrice !== undefined
    ) {
      req.body.purchasePrice =
        Number(req.body.purchasePrice);
    }

    if (
      req.body.salePrice !== undefined
    ) {
      req.body.salePrice =
        Number(req.body.salePrice);
    }

    if (
      req.body.quantity !== undefined
    ) {
      req.body.quantity =
        Number(req.body.quantity);
    }

    if (
      req.body.minStockLevel !== undefined
    ) {
      req.body.minStockLevel =
        Number(req.body.minStockLevel);
    }

    Object.assign(product, req.body);

    await product.save();

    if (previousQty !== newQty) {
      const adjustmentMovement =
        new StockMovement({
          product: product._id,
          type: 'Adjustment',
          quantity:
            Math.abs(
              newQty - previousQty
            ),
          previousQuantity: previousQty,
          newQuantity: newQty,
          reason:
            req.body.adjustmentReason ||
            'Manual stock override',
          reference: product.sku
        });

      await adjustmentMovement.save();
    }

    return res.status(200).json({
      success: true,
      message:
        'Product updated successfully',
      data: product
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to update product',
      error: error.message
    });
  }
};


// ============================================================
// DELETE PRODUCT
// @route   DELETE /api/products/:id
// @access  Private
// ============================================================
const deleteProduct = async (req, res) => {
  try {

    // --------------------------------------------------------
    // CHECK DELETION MODE FIRST
    // --------------------------------------------------------
    const deletionCheck =
      await checkDeletionMode();

    if (!deletionCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deletionCheck.message
      });
    }

    // --------------------------------------------------------
    // DELETE PRODUCT
    // --------------------------------------------------------
    const product =
      await Product.findByIdAndDelete(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete related stock movements
    await StockMovement.deleteMany({
      product: req.params.id
    });

    return res.status(200).json({
      success: true,
      message:
        'Product removed from database'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to delete product',
      error: error.message
    });
  }
};


// ============================================================
// GET STOCK MOVEMENTS
// @route   GET /api/products/:id/movements
// @access  Private
// ============================================================
const getStockMovements = async (req, res) => {
  try {
    const movements =
      await StockMovement.find({
        product: req.params.id
      }).sort({
        createdAt: 1
      });

    return res.status(200).json({
      success: true,
      data: movements
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        'Failed to load stock movements',
      error: error.message
    });
  }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockMovements
};