let cron;

try {
  ({ default: cron } = require('node-cron'));
} catch (error) {
  try {
    cron = require('node-cron');
  } catch (innerError) {
    console.warn('[StreakReminderScheduler] node-cron is not available; streak reminders will be disabled.');
    cron = null;
  }
}

const streakReminderService = require('../services/streakReminder.service');

class StreakReminderScheduler {
  start() {
    if (!cron?.schedule) {
      return;
    }

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
