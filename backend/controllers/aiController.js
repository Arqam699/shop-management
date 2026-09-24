const mongoose = require('mongoose');

const localService = require('../services/localSearchService');
const AiChatHistory = require('../models/AiChatHistory');

const executeQuery =
  typeof localService === 'function'
    ? localService
    : localService.processLocalQuery ||
      localService.default;

// ============================================================
// PAKISTAN DATE
// ============================================================

const getPakistanDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

// ============================================================
// AI CHAT
// ============================================================

const handleAiChat = async (req, res) => {
  try {
    const { message } = req.body || {};

    // ========================================================
    // SHOP ID FROM PROTECTED AUTH CONTEXT
    // ========================================================

    const shopId =
      req.shopId ||
      req.admin?.shopId ||
      req.shop?._id;

    console.log('========================================');
    console.log('AI CHAT SHOP CONTEXT');
    console.log('req.shopId:', req.shopId);
    console.log('req.admin.shopId:', req.admin?.shopId);
    console.log('req.shop._id:', req.shop?._id);
    console.log('Final shopId:', shopId);
    console.log('Final type:', typeof shopId);
    console.log('========================================');

    if (!shopId) {
      return res.status(403).json({
        success: false,
        code: 'SHOP_CONTEXT_MISSING',
        message:
          'Unauthorized: Shop context missing.',
      });
    }

    // ========================================================
    // VERIFY SHOP ID FORMAT
    // ========================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        String(shopId)
      )
    ) {
      console.error(
        'AI CHAT INVALID SHOP ID:',
        shopId
      );

      return res.status(403).json({
        success: false,
        code: 'INVALID_SHOP_ID',
        message:
          'Unauthorized: Invalid Shop ID.',
      });
    }

    // ========================================================
    // VERIFY SHOP DOCUMENT
    // ========================================================

    const shop = await mongoose
      .model('Shop')
      .findById(shopId)
      .select('_id subscriptionStatus');

    if (!shop) {
      return res.status(403).json({
        success: false,
        code: 'SHOP_NOT_FOUND',
        message:
          'Shop account was not found.',
      });
    }

    console.log(
      'AI SHOP VERIFIED:',
      shop._id.toString()
    );

    // ========================================================
    // MESSAGE VALIDATION
    // ========================================================

    if (
      !message ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Query message is required.',
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message:
          'Query is too long.',
      });
    }

    const cleanMessage = message.trim();

    // ========================================================
    // LOCAL AI QUERY
    // ========================================================

    const answer = await executeQuery({
      message: cleanMessage,
      shopId: shop._id,
    });

    const finalAnswer =
      typeof answer === 'string'
        ? answer
        : JSON.stringify(answer);

    // ========================================================
    // SAVE HISTORY
    // ========================================================

    try {
      await AiChatHistory.create({
        shopId: shop._id,
        userMessage: cleanMessage,
        assistantResponse: finalAnswer,
        historyDate: getPakistanDate(),
      });
    } catch (historyError) {
      console.error(
        'AI History Save Error:',
        historyError
      );
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,
      answer: finalAnswer,
    });

  } catch (error) {
    console.error(
      'Local Search Controller Error:',
      error
    );

    return res.status(500).json({
      success: false,
      code: 'AI_QUERY_ERROR',
      message:
        'Search query process nahi ho saki.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET TODAY AI HISTORY
// ============================================================

const getAiHistory = async (req, res) => {
  try {
    const shopId =
      req.shopId ||
      req.admin?.shopId ||
      req.shop?._id;

    if (!shopId) {
      return res.status(403).json({
        success: false,
        code: 'SHOP_CONTEXT_MISSING',
        message:
          'Unauthorized: Shop context missing.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        String(shopId)
      )
    ) {
      return res.status(403).json({
        success: false,
        code: 'INVALID_SHOP_ID',
        message:
          'Unauthorized: Invalid Shop ID.',
      });
    }

    const historyDate =
      getPakistanDate();

    const history =
      await AiChatHistory.find({
        shopId,
        historyDate,
      })
        .sort({ createdAt: 1 })
        .lean();

    return res.status(200).json({
      success: true,
      date: historyDate,
      count: history.length,
      history,
    });

  } catch (error) {
    console.error(
      'Get AI History Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'AI history load nahi ho saki.',
    });
  }
};

module.exports = {
  handleAiChat,
  getAiHistory,
};