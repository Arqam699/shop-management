const cron = require('node-cron');
const AiChatHistory = require('../models/AiChatHistory');

const startAiHistoryCleanup = () => {
  // Keep only today's AI chat history; old history is cleared at Pakistan midnight.
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const pakistanDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const result = await AiChatHistory.deleteMany({
          historyDate: { $ne: pakistanDate },
        });

        console.log(
          `[AI CHAT] Midnight cleanup complete. Deleted old chat entries: ${result.deletedCount}`
        );
      } catch (error) {
        console.error('[AI CHAT] Midnight cleanup failed:', error);
      }
    },
    { timezone: 'Asia/Karachi' }
  );

  console.log('[AI CHAT] Old chat history cleanup scheduled for midnight Pakistan time.');
};

module.exports = startAiHistoryCleanup;
