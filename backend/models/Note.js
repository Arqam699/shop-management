const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true,
  },
  noteKey: { type: String, required: true, default: 'primary' },
  content: { type: String, trim: true, maxlength: 100000, default: '' },
}, { timestamps: true });

noteSchema.index(
  { shopId: 1, noteKey: 1 },
  { unique: true, partialFilterExpression: { noteKey: 'primary' } }
);

module.exports = mongoose.model('Note', noteSchema);
