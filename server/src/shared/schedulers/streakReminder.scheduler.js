const cron = require('node-cron');
const streakReminderService = require('../services/streakReminder.service');

class StreakReminderScheduler {
  start() {
    // 20:00 every day, Vietnam timezone
    // Note: requires Intl timeZone support on the runtime.
    cron.schedule(
      '0 20 * * *',
      async () => {
        try {
          const result = await streakReminderService.runDailyCheck(new Date());
          console.log('[StreakReminderScheduler] Daily run result:', result);
        } catch (err) {
          console.error('[StreakReminderScheduler] Daily run failed:', err);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    console.log('[StreakReminderScheduler] Scheduled at 20:00 Asia/Ho_Chi_Minh');
  }
}

module.exports = new StreakReminderScheduler();
