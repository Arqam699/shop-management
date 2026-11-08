const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

bookSchema.index({ shopId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Book', bookSchema);
