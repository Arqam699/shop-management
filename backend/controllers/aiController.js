const localService = require('../services/localSearchService');

const executeQuery =
  typeof localService === 'function'
    ? localService
    : localService.processLocalQuery ||
      localService.default;

const handleAiChat = async (
  req,
  res
) => {
  try {
    const { message } =
      req.body || {};

    // ========================================================
    // SHOP ID
    // ========================================================

    const shopId =
      req.shopId ||
      req.admin?.shopId ||
      req.user?.shopId;

    if (!shopId) {
      return res.status(403).json({
        success: false,
        message:
          'Unauthorized: Shop context missing.',
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
        message:
          'Query message is required.',
      });
    }

    if (
      message.trim().length > 500
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Query is too long.',
      });
    }

    // ========================================================
    // EXECUTE READ-ONLY SEARCH
    // ========================================================

    const answer =
      await executeQuery({
        message:
          message.trim(),
        shopId,
      });

    return res.status(200).json({
      success: true,
      answer:
        typeof answer === 'string'
          ? answer
          : JSON.stringify(
              answer
            ),
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

module.exports = {
  handleAiChat,
};