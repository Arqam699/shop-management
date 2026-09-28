const mongoose = require('mongoose');

const AiChatHistorySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },

    userMessage: {
      type: String,
      required: true,
      trim: true,
    },

    assistantResponse: {
      type: String,
      required: true,
      trim: true,
    },

    // Pakistan date: YYYY-MM-DD
    historyDate: {
      type: String,
      required: true,
      index: true,
    },

    // Which engine answered: 'local' (free), 'llm' (Groq tokens),
    // 'confirmed' (write action), 'limit' not stored.
    source: {
      type: String,
      enum: ['local', 'llm', 'confirmed'],
    },
  },
  {
    timestamps: true,
  }
);

// Single compound index for history retrieval
AiChatHistorySchema.index({
  shopId: 1,
  historyDate: 1,
  createdAt: 1,
});

// Fast per-shop daily Groq quota counting
AiChatHistorySchema.index({
  shopId: 1,
  historyDate: 1,
  source: 1,
});

module.exports = mongoose.model(
  'AiChatHistory',
  AiChatHistorySchema
);