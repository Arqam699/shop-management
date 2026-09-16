
const localService = require('../services/localSearchService');
const AiChatHistory = require('../models/AiChatHistory');

const executeQuery =
  typeof localService === 'function'
    ? localService
    : localService.processLocalQuery ||
      localService.default;

// ========================================================
// PAKISTAN DATE
// ========================================================

const getPakistanDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

// ========================================================
// AI CHAT
// ========================================================

const handleAiChat = async (req, res) => {
  try {
    const { message } = req.body || {};

    // ========================================================
    // SHOP ID
    // ========================================================

    // `protect` sets this from the verified JWT admin record.
    // Never accept a shop identifier from request data or another
    // unverified request property for an Assistant query.
    const shopId = req.shopId;

    if (!shopId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Shop context missing.',
      });
    }

    // ========================================================
    // VALIDATE MESSAGE
    // ========================================================

    if (
      !message ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Query message is required.',
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Query is too long.',
      });
    }

    const cleanMessage = message.trim();

    // ========================================================
    // EXECUTE AI / LOCAL SEARCH
    // ========================================================

    const answer = await executeQuery({
      message: cleanMessage,
      shopId,
    });

    const finalAnswer =
      typeof answer === 'string'
        ? answer
        : JSON.stringify(answer);

    // ========================================================
    // SAVE TODAY'S AI HISTORY
    // ========================================================

    try {
      await AiChatHistory.create({
        shopId,
        userMessage: cleanMessage,
        assistantResponse: finalAnswer,
        historyDate: getPakistanDate(),
      });
    } catch (historyError) {
      // History save fail hone ki wajah se AI response fail
      // nahi hona chahiye.
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
      message:
        'Search query process nahi ho saki.',
    });
  }
};

// ========================================================
// GET TODAY'S AI HISTORY
// ========================================================

const getAiHistory = async (req, res) => {
  try {
    // History must use the exact same verified shop context as chat.
    const shopId = req.shopId;

    if (!shopId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Shop context missing.',
      });
    }

    const historyDate = getPakistanDate();

    const history = await AiChatHistory.find({
      shopId,
      historyDate,
    })
      .sort({
        createdAt: 1,
      })
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
