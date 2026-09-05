const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: 'My Electronics Shop' },
  shopAddress: { type: String, default: 'Main Bazar, Pakistan' },
  shopPhone: { type: String, default: '+92 300 1234567' },
  shopEmail: { type: String, default: 'admin@shop.com' },
  currency: { type: String, default: 'Rs.' },
  defaultInstallmentDurations: { type: [Number], default: [3, 6, 12] },
  defaultMinStockLevel: { type: Number, default: 5 },
  invoicePrefix: { type: String, default: 'INV' },
  customerIdPrefix: { type: String, default: 'CUST' },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);