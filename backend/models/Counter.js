const mongoose = require('mongoose');

// ============================================================
// COUNTER
//
// Atomic per-shop sequence counters used for ID generation
// (sale IDs, installment plan IDs, ...).
//
// Replaces full-collection scans: instead of loading every
// document to find the max ID, a single atomic
// findOneAndUpdate with $inc hands out the next number.
//
// _id examples: 'sale_<shopId>', 'plan_<shopId>'
// ============================================================

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Counter',
  counterSchema
);
