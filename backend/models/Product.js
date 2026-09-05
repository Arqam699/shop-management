const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { 
      type: String, 
      required: true,
      enum: ['Mobile Phones', 'LED TVs', 'Refrigerators', 'Washing Machines', 'Air Conditioners', 'Laptops', 'Accessories', 'Speakers', 'Other']
    },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    sku: { type: String, unique: true }, // Auto-generated e.g. PROD-0001
    serialNumber: { type: String, trim: true },
    imei: { type: String, trim: true }, // Optional for Mobiles
    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    minStockLevel: { type: Number, required: true, min: 0, default: 5 },
    supplier: { type: String, trim: true },
    warrantyPeriod: { type: String, trim: true }, // e.g. "1 Year" or "12 Months"
    purchaseDate: { type: Date, default: Date.now },
    description: { type: String, trim: true },
    status: { 
      type: String, 
      enum: ['Available', 'Low Stock', 'Out of Stock'], 
      default: 'Available' 
    }
  },
  { timestamps: true }
);

// Pre-save hook to calculate status (Corrected modern format - no "next" parameter)
productSchema.pre('save', function () {
  if (this.quantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity <= this.minStockLevel) {
    this.status = 'Low Stock';
  } else {
    this.status = 'Available';
  }
});

module.exports = mongoose.model('Product', productSchema);