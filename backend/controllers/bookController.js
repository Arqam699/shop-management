const Book = require('../models/Book');
const Sale = require('../models/Sale');

const getBooks = async (req, res) => {
  try {
    const books = await Book.find({ shopId: req.shopId }).sort({ createdAt: 1, name: 1 }).lean();
    const sales = await Sale.find({ shopId: req.shopId, book: { $in: books.map((book) => book._id) } })
      .populate('items.product', 'name brand model sku')
      .populate('product', 'name brand model sku')
      .sort({ saleDate: -1, createdAt: -1 })
      .lean();

    const salesByBook = new Map();
    for (const sale of sales) {
      const bookKey = String(sale.book);
      const saleItems = Array.isArray(sale.items) && sale.items.length
        ? sale.items
        : [{ product: sale.product, quantity: sale.quantity, unitPrice: sale.unitPrice, discount: sale.discount, purchasePriceAtSale: sale.purchasePriceAtSale }];
      const lines = saleItems.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const discount = Number(item.discount || 0);
        const purchasePrice = Number(item.purchasePriceAtSale ?? sale.purchasePriceAtSale ?? 0);
        const sellingTotal = Math.max(0, quantity * unitPrice - discount);
        const purchaseTotal = quantity * purchasePrice;
        return {
          productId: item.product?._id || item.product,
          product: item.product && typeof item.product === 'object' ? item.product : { name: 'Deleted product' },
          quantity,
          unitPrice,
          discount,
          sellingTotal,
          purchasePrice,
          purchaseTotal,
          profit: sellingTotal - purchaseTotal,
        };
      });
      const bookSales = salesByBook.get(bookKey) || [];
      bookSales.push({
        _id: sale._id,
        invoice: sale.saleId || '—',
        saleDate: sale.saleDate || sale.createdAt,
        paymentType: sale.paymentType,
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

module.exports = { getBooks, createBook };
