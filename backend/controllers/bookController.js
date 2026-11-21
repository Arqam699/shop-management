const Book = require('../models/Book');
const Sale = require('../models/Sale');
const Return = require('../models/Return');
const Settings = require('../models/Settings');

const checkDeletionMode = async (shopId) => {
  const settings = await Settings.findOne({ shopId });
  if (!settings || !settings.allowGlobalDeletion) {
    return { allowed: false, message: 'Deletion Mode is disabled. Enable it from Settings first.' };
  }
  if (settings.deletionModeExpiresAt && new Date() > settings.deletionModeExpiresAt) {
    settings.allowGlobalDeletion = false;
    settings.deletionModeExpiresAt = null;
    await settings.save();
    return { allowed: false, message: 'Deletion Mode has expired. Enable it again from Settings.' };
  }
  return { allowed: true };
};

const getBooks = async (req, res) => {
  try {
    const books = await Book.find({ shopId: req.shopId }).sort({ createdAt: 1, name: 1 }).lean();
    const sales = await Sale.find({ shopId: req.shopId, book: { $in: books.map((book) => book._id) } })
      .populate('items.product', 'name brand model sku')
      .populate('product', 'name brand model sku')
      .sort({ saleDate: -1, createdAt: -1 })
      .lean();
    const returns = sales.length
      ? await Return.find({ shopId: req.shopId, sale: { $in: sales.map((sale) => sale._id) } }).lean()
      : [];
    const returnsBySale = new Map();
    for (const returnRow of returns) {
      const key = String(returnRow.sale);
      const rows = returnsBySale.get(key) || [];
      rows.push(returnRow);
      returnsBySale.set(key, rows);
    }

    const salesByBook = new Map();
    for (const sale of sales) {
      const bookKey = String(sale.book);
      const saleItems = Array.isArray(sale.items) && sale.items.length
        ? sale.items
        : [{ product: sale.product, quantity: sale.quantity, unitPrice: sale.unitPrice, discount: sale.discount, purchasePriceAtSale: sale.purchasePriceAtSale }];
      const saleReturns = returnsBySale.get(String(sale._id)) || [];
      const returnedByProduct = new Map();
      for (const returnRow of saleReturns) {
        const productKey = String(returnRow.product);
        returnedByProduct.set(productKey, (returnedByProduct.get(productKey) || 0) + Number(returnRow.quantity || 0));
      }
      const returnQtyRemaining = new Map(returnedByProduct);
      const remainingQuantities = saleItems.map((item) => {
        const key = String(item.product?._id || item.product);
        const originalQuantity = Number(item.quantity || 0);
        const qtyToApply = Math.min(originalQuantity, Number(returnQtyRemaining.get(key) || 0));
        returnQtyRemaining.set(key, Math.max(0, Number(returnQtyRemaining.get(key) || 0) - qtyToApply));
        return Math.max(0, originalQuantity - qtyToApply);
      });
      const itemGrossTotals = saleItems.map((item, index) => {
        return Math.max(0, remainingQuantities[index] * Number(item.unitPrice || 0));
      });
      const itemGrossTotal = itemGrossTotals.reduce((sum, value) => sum + value, 0);
      const itemDiscountTotal = saleItems.reduce((sum, item, index) => {
        const originalQuantity = Number(item.quantity || 0);
        const remainingQuantity = remainingQuantities[index];
        return sum + (originalQuantity > 0 ? Number(item.discount || 0) * remainingQuantity / originalQuantity : 0);
      }, 0);
      // Multi-item sales may store the overall discount on Sale.discount while
      // each item.discount is zero. Allocate only that unassigned remainder.
      const unallocatedSaleDiscount = Math.max(0, Number(sale.discount || 0) - itemDiscountTotal);
      const saleSellingTotal = Math.max(0, itemGrossTotal - itemDiscountTotal - unallocatedSaleDiscount);
      const markupProfit = sale.paymentType === 'Installment'
        ? Math.max(0, Number(sale.markupAmount || (Number(sale.totalWithMarkup || 0) - Number(sale.finalTotal || 0))))
        : 0;
      const lines = saleItems.map((item, index) => {
        const originalQuantity = Number(item.quantity || 0);
        const quantity = remainingQuantities[index];
        const unitPrice = Number(item.unitPrice || 0);
        const lineDiscount = Number(item.discount || 0);
        const remainingGross = itemGrossTotals[index];
        const allocatedOverallDiscount = itemGrossTotal > 0
          ? unallocatedSaleDiscount * remainingGross / itemGrossTotal
          : 0;
        const remainingLineDiscount = originalQuantity > 0 ? lineDiscount * quantity / originalQuantity : 0;
        const discount = remainingLineDiscount + allocatedOverallDiscount;
        const purchasePrice = Number(item.purchasePriceAtSale ?? sale.purchasePriceAtSale ?? 0);
        const sellingTotal = Math.max(0, remainingGross - discount);
        const purchaseTotal = quantity * purchasePrice;
        const lineMarkupProfit = saleSellingTotal > 0
          ? markupProfit * sellingTotal / saleSellingTotal
          : markupProfit / Math.max(1, saleItems.length);
        return {
          productId: item.product?._id || item.product,
          product: item.product && typeof item.product === 'object' ? item.product : { name: 'Deleted product' },
          quantity,
          unitPrice,
          discount,
          sellingTotal,
          purchasePrice,
          purchaseTotal,
          markupProfit: lineMarkupProfit,
          profit: sellingTotal - purchaseTotal + lineMarkupProfit,
        };
      });
      const bookSales = salesByBook.get(bookKey) || [];
      bookSales.push({
        _id: sale._id,
        invoice: sale.saleId || '—',
        saleDate: sale.saleDate || sale.createdAt,
        paymentType: sale.paymentType,
        markupProfit,
        lines,
      });
      salesByBook.set(bookKey, bookSales);
    }

    const result = books.map((book) => {
      const bookSales = salesByBook.get(String(book._id)) || [];
      const lines = bookSales.flatMap((sale) => sale.lines);
      return {
        ...book,
        sales: bookSales,
        summary: {
          invoices: bookSales.length,
          quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
          purchaseCost: lines.reduce((sum, line) => sum + line.purchaseTotal, 0),
          sellingTotal: lines.reduce((sum, line) => sum + line.sellingTotal, 0),
          markupProfit: lines.reduce((sum, line) => sum + Number(line.markupProfit || 0), 0),
          profit: lines.reduce((sum, line) => sum + line.profit, 0),
        },
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Load book-wise audit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load book-wise audit.' });
  }
};

const createBook = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Book name is required.' });
    const book = await Book.create({ shopId: req.shopId, name });
    return res.status(201).json({ success: true, data: book, message: 'Book created successfully.' });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'A book with this name already exists.' });
    console.error('Create book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create book.' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const deletionCheck = await checkDeletionMode(req.shopId);
    if (!deletionCheck.allowed) return res.status(403).json({ success: false, message: deletionCheck.message });

    const book = await Book.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });

    const result = await Sale.updateMany(
      { shopId: req.shopId, book: book._id },
      { $unset: { book: 1 } }
    );
    await book.deleteOne();

    return res.json({
      success: true,
      data: { unassignedInvoices: result.modifiedCount || 0 },
      message: `Book deleted. ${result.modifiedCount || 0} invoice(s) were unassigned; sales and invoices were kept.`,
    });
  } catch (error) {
    console.error('Delete book error:', error);
    return res.status(500).json({ success: false, message: 'Could not delete book.' });
  }
};

module.exports = { getBooks, createBook, deleteBook };
