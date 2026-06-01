const Notification = require('../../models/notification.model');
const User = require('../../modules/user/user.model');
const eventBus = require('../../shared/events/eventBus');

// ── Notification Templates ───────────────────────────────────────────────────────
const NOTIFICATION_TYPES = ['system', 'streak', 'achievement', 'friend', 'reminder', 'quest', 'leaderboard'];

class NotificationService {
  /**
   * Get notifications for a user (paginated)
   */
  async getNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const query = { user: userId };
    if (unreadOnly) query.read = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ user: userId, read: false });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );
    return { success: true };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId, notificationId) {
    await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    return { success: true };
  }

  /**
   * Create and emit a notification (called internally via eventBus)
   */
  async createNotification({ userId, type, title, body, data, actionUrl }) {
    const notification = await Notification.create({
      user: userId,
      type: NOTIFICATION_TYPES.includes(type) ? type : 'system',
      title,
      body,
      data,
      actionUrl,
    });

    // Emit via Socket.IO (handled by socketService)
    eventBus.emit('notification:new', {
      userId,
      notification,
    });

    return notification;
  }

  /**
   * Create streak reminder notifications for users who haven't studied today
   * (called by a scheduled job)
   */
  async createStreakReminders() {
    const now = new Date();
    const hour = now.getHours();

    // Only send at specific hours (e.g., 9am, 6pm)
    if (![9, 18].includes(hour)) return;

    const users = await User.find({ 'streak.current': { $gt: 0 } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const promises = [];
    for (const user of users) {
      const studiedToday = user.streak?.lastStudyDate &&
        new Date(user.streak.lastStudyDate) >= today;

      if (!studiedToday) {
        promises.push(
          this.createNotification({
            userId: user._id,
            type: 'reminder',
            title: hour === 9 ? 'Bắt đầu ngày mới nào!' : 'Đừng bỏ lỡ chuỗi!',
            body: hour === 9
              ? 'Hãy hoàn thành bài học đầu tiên để bắt đầu streak!'
              : `Bạn có ${user.streak.current} ngày streak! Hoàn thành bài học ngay để không mất streak.`,
            actionUrl: '/duolingo/learn',
          })
        );
      }
    }

    await Promise.allSettled(promises);
    return { sent: promises.length };
  }
}

module.exports = new NotificationService();
