const cron = require('node-cron');
const AiChatHistory = require('../models/AiChatHistory');

const startAiHistoryCleanup = () => {
  // Every day at 12:00 AM Pakistan time
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        const now = new Date();

        // Pakistan date
        const pakistanDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Karachi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);

        console.log(
          `🧹 AI history cleanup started for ${pakistanDate}`
        );

        // Keep only today's history
        const result = await AiChatHistory.deleteMany({
          historyDate: {
            $ne: pakistanDate,
          },
        });

        console.log(
          `✅ AI history cleanup complete. Deleted: ${result.deletedCount}`
        );
      } catch (error) {
        console.error(
          '❌ AI history cleanup error:',
          error
        );
      }
    },
    {
      timezone: 'Asia/Karachi',
    }
  );

  console.log(
    '🕛 AI history cleanup scheduled: Every day at 12:00 AM Pakistan time'
  );
};

module.exports = startAiHistoryCleanup;