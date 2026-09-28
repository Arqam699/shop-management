const mongoose = require('mongoose');

const localService = require('../services/localSearchService');
const AiChatHistory = require('../models/AiChatHistory');
const aiAgentService = require('../services/aiAgentService');

const executeQuery =
  typeof localService === 'function'
    ? localService
    : localService.processLocalQuery ||
      localService.default;

// Local engine's "I don't understand" signal. When the local
// answer contains this, the query escalates to the LLM agent.
const LOCAL_NOT_UNDERSTOOD_MARKER =
  'exact data route nahi mila';

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
    const { message, confirmedAction } = req.body || {};

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
    // CONFIRMED WRITE ACTION (from AI agent confirmation card)
    // ========================================================

    if (confirmedAction && confirmedAction.tool) {
      const actionResult =
        await aiAgentService.executeConfirmedAction({
          shopId: shop._id,
          tool: confirmedAction.tool,
          args: confirmedAction.args || {},
        });

      const confirmedAnswer = actionResult.message;

      try {
        await AiChatHistory.create({
          shopId: shop._id,
          userMessage:
            'Confirmed: ' +
            String(confirmedAction.summary || confirmedAction.tool),
          assistantResponse: confirmedAnswer,
          historyDate: getPakistanDate(),
          source: 'confirmed',
        });
      } catch (historyError) {
        console.error(
          'AI History Save Error:',
          historyError
        );
      }

      return res.status(200).json({
        success: actionResult.success,
        answer: confirmedAnswer,
        pendingAction: null,
      });
    }

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
    // LOCAL-FIRST ROUTING (SaaS cost control)
    // The free rule-based engine answers everything it
    // understands. Groq (paid tokens) runs ONLY when local
    // cannot route the query. A per-shop daily quota protects
    // the Groq budget from any single heavy shop.
    // ========================================================

    let localAnswer = '';
    let localUnderstood = false;

    try {
      const localRaw = await executeQuery({
        message: cleanMessage,
        shopId: shop._id,
      });

      localAnswer =
        typeof localRaw === 'string'
          ? localRaw
          : JSON.stringify(localRaw);

      localUnderstood = !localAnswer.includes(
        LOCAL_NOT_UNDERSTOOD_MARKER
      );
    } catch (localError) {
      console.error(
        'Local query error:',
        localError.message
      );
      localUnderstood = false;
    }

    const saveHistory = async (
      userMsg,
      assistantMsg,
      src
    ) => {
      try {
        await AiChatHistory.create({
          shopId: shop._id,
          userMessage: userMsg,
          assistantResponse: assistantMsg,
          historyDate: getPakistanDate(),
          source: src,
        });
      } catch (historyError) {
        console.error(
          'AI History Save Error:',
          historyError
        );
      }
    };

    // Local understood -> free answer, zero Groq tokens spent.
    if (localUnderstood) {
      await saveHistory(
        cleanMessage,
        localAnswer,
        'local'
      );

      return res.status(200).json({
        success: true,
        answer: localAnswer,
        source: 'local',
      });
    }

    // ========================================================
    // PER-SHOP DAILY GROQ QUOTA
    // ========================================================

    const dailyLimit = parseInt(
      process.env.AI_DAILY_LIMIT || '50',
      10
    );

    if (dailyLimit > 0) {
      const llmUsedToday =
        await AiChatHistory.countDocuments({
          shopId: shop._id,
          historyDate: getPakistanDate(),
          source: 'llm',
        });

      if (llmUsedToday >= dailyLimit) {
        return res.status(200).json({
          success: true,
          answer:
            `Aaj ke smart sawalat ki limit (${dailyLimit}) mukammal ho gayi hai. ` +
            `Kal dobara try karein — aam sawalat (sale, khata, stock, installment) ke jawab ab bhi milte rahenge.`,
          source: 'limit',
        });
      }
    }

    // ========================================================
    // LLM AI AGENT (Groq) — only for queries local can't route
    // ========================================================

    if (process.env.GROQ_API_KEY) {
      try {
        const agentHistory =
          await AiChatHistory.find({
            shopId: shop._id,
          })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        agentHistory.reverse();

        const agentResult =
          await aiAgentService.runAiAgent({
            message: cleanMessage,
            shopId: shop._id,
            history: agentHistory,
          });

        if (agentResult) {
          const agentAnswer =
            agentResult.answer ||
            agentResult.pendingAction?.summary ||
            '';

          await saveHistory(
            cleanMessage,
            agentAnswer,
            'llm'
          );

          return res.status(200).json({
            success: true,
            answer: agentAnswer,
            pendingAction:
              agentResult.pendingAction || null,
            source: 'llm',
          });
        }
      } catch (agentError) {
        console.error(
          'AI agent failed, using local guide:',
          agentError.message
        );
      }
    }

    // No key, or agent failed -> local's helpful guide answer.
    if (!localAnswer) {
      localAnswer =
        'Mujhe aapka sawal samajh nahi aya. Dobara try karein.';
    }

    await saveHistory(
      cleanMessage,
      localAnswer,
      'local'
    );

    return res.status(200).json({
      success: true,
      answer: localAnswer,
      source: 'local',
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

// ============================================================
// GET TODAY'S SMART (LLM) USAGE
// ============================================================

const getAiUsage = async (req, res) => {
  try {
    const shopId =
      req.shopId ||
      req.admin?.shopId ||
      req.shop?._id;

    if (
      !shopId ||
      !mongoose.Types.ObjectId.isValid(
        String(shopId)
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Unauthorized: Shop context missing.',
      });
    }

    const limit = parseInt(
      process.env.AI_DAILY_LIMIT || '50',
      10
    );

    const used = await AiChatHistory.countDocuments({
      shopId,
      historyDate: getPakistanDate(),
      source: 'llm',
    });

    return res.status(200).json({
      success: true,
      used,
      limit: limit > 0 ? limit : null,
      remaining:
        limit > 0 ? Math.max(0, limit - used) : null,
    });
  } catch (error) {
    console.error(
      'Get AI Usage Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Usage load nahi ho saka.',
    });
  }
};

module.exports = {
  handleAiChat,
  getAiHistory,
  getAiUsage,
};