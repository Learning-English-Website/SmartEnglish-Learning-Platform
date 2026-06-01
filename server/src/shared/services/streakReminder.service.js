const eventBus = require('../events/eventBus');
const User = require('../../modules/user/user.model');
const notificationService = require('../../modules/notification/notification.service');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

class StreakReminderService {
  /**
   * Send streak reminder email + in-app notification for eligible users.
   *
   * Conditions:
   * - emailReminderEnabled === true
   * - currentStreak > 0
   * - not studied today (user.streak.lastStudyDate < start of today)
   * - send once per day (lastStreakReminderSentAt not same day)
   */
  async runDailyCheck(now = new Date()) {
    const todayStart = startOfToday();
    const todayKey = dateKey(todayStart);

    const users = await User.find({
      emailReminderEnabled: true,
      'streak.current': { $gt: 0 },
    }).select('_id username emailReminderEnabled lastStreakReminderSentAt streak');

    let eligible = 0;
    let sent = 0;
    let skippedStudiedToday = 0;
    let skippedAlreadySent = 0;

    const ops = [];

    for (const user of users) {
      const lastStudy = user.streak?.lastStudyDate ? new Date(user.streak.lastStudyDate) : null;
      const hasStudiedToday = lastStudy && lastStudy >= todayStart;
      if (hasStudiedToday) {
        skippedStudiedToday++;
        continue;
      }

      const lastSent = user.lastStreakReminderSentAt ? new Date(user.lastStreakReminderSentAt) : null;
      const alreadySentToday = lastSent && dateKey(lastSent) === todayKey;
      if (alreadySentToday) {
        skippedAlreadySent++;
        continue;
      }

      eligible++;

      ops.push(async () => {
        await notificationService.createNotification({
          userId: user._id,
          type: 'reminder',
          title: 'Đừng bỏ lỡ chuỗi!',
          body: `Bạn có chuỗi ${user.streak.current} ngày. Hoàn thành bài học ngay để không mất streak!`,
          actionUrl: '/duolingo/learn',
        });

        eventBus.emit('streak:reminder', {
          userId: user._id.toString(),
          streak: user.streak.current,
        });

        await User.updateOne(
          { _id: user._id },
          { $set: { lastStreakReminderSentAt: now } }
        );

        sent++;
      });
    }

    // Run in parallel but avoid blowing up the SMTP provider
    const concurrency = 10;
    for (let i = 0; i < ops.length; i += concurrency) {
      const chunk = ops.slice(i, i + concurrency).map(fn => fn());
      await Promise.allSettled(chunk);
    }

    return {
      checked: users.length,
      eligible,
      sent,
      skippedStudiedToday,
      skippedAlreadySent,
    };
  }
}

module.exports = new StreakReminderService();
