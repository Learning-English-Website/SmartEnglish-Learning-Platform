const { getIO, emitToUser, broadcast } = require('../../config/socketIO');
const eventBus = require('./eventBus');
const notificationService = require('../../modules/notification/notification.service');

/**
 * Safely register an eventBus listener with error boundary.
 */
const safeOn = (event, handler) => {
  eventBus.on(event, async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error(`[Socket] Error in handler for "${event}":`, err.message);
    }
  });
};

/**
 * Register Socket.IO event handlers.
 * Bridges the internal eventBus (Node EventEmitter) with Socket.IO rooms.
 * Called after Socket.IO is initialized.
 */
const registerSocketHandlers = () => {
  // ── Quest events ──────────────────────────────────────────────────────────────

  // Quest completed → notify the user privately
  safeOn('quest:completed', ({ userId, questType, xpReward }) => {
    emitToUser(userId, 'quest:completed', {
      questType,
      xpReward,
      message: `Chúc mừng! Bạn đã hoàn thành quest "${questType}" và nhận được ${xpReward} XP!`,
    });
    emitToUser(userId, 'quest:update', {});
  });

  // Quest reward claimed → notify the user
  safeOn('quest:claimed', ({ userId, xpReward, totalXP }) => {
    emitToUser(userId, 'quest:reward_claimed', {
      xpReward,
      totalXP,
      message: `+${xpReward} XP đã được cộng vào tài khoản!`,
    });
    emitToUser(userId, 'quest:update', {});
  });

  // Quest progress updated → tell frontend to refresh quest list
  safeOn('quest:progress_updated', ({ userId }) => {
    emitToUser(userId, 'quest:update', {});
  });

  // ── Gamification events ───────────────────────────────────────────────────────

  // XP gained / level up → private notification + public leaderboard update
  safeOn('gamification:xp_gained', ({ userId, username, xpGained, totalXP, level, levelUp }) => {
    // Emit to the specific user
    emitToUser(userId, 'gamification:xp_update', {
      xpGained,
      totalXP,
      level,
      levelUp,
      message: levelUp
        ? `Chúc mừng! Bạn đã lên Level ${level}!`
        : `+${xpGained} XP`,
    });

    // Broadcast leaderboard update to all connected clients
    broadcast('leaderboard:update', {
      updatedUserId: String(userId),
      username,
      totalXP,
      level,
      timestamp: Date.now(),
    });
  });

  // Achievement unlocked → private notification
  safeOn('achievement:unlocked', ({ userId, achievement }) => {
    emitToUser(userId, 'achievement:unlocked', {
      achievement,
      message: `Bạn vừa mở khóa achievement: ${achievement.title}!`,
    });

    // Also create a persistent notification (userId coerced to string)
    notificationService.createNotification({
      userId: String(userId),
      type: 'achievement',
      title: 'Achievement Mới!',
      body: `Bạn đã mở khóa "${achievement.title}" - ${achievement.description}`,
      actionUrl: '/achievements',
    }).catch(err => console.error('[Socket] Failed to create achievement notification:', err.message));
  });

  // Streak broken → private notification
  safeOn('streak:broken', ({ userId, previousStreak }) => {
    emitToUser(userId, 'streak:broken', {
      previousStreak,
      message: `Oh không! Chuỗi streak ${previousStreak} ngày của bạn đã bị gián đoạn. Bắt đầu lại ngay hôm nay!`,
    });
  });

  // Streak maintained → private notification
  safeOn('streak:kept', ({ userId, currentStreak }) => {
    emitToUser(userId, 'streak:kept', {
      currentStreak,
      message: `Chuỗi streak của bạn đã đạt ${currentStreak} ngày! Giữ vững nhé!`,
    });
  });

  // ── Daily Challenge events ───────────────────────────────────────────────────

  // Per-question XP update → broadcast to all connected clients for live leaderboard
  safeOn('dailyChallenge:xp_progress', ({ date, userId, username, xpDelta, totalXp }) => {
    console.log('[Socket] dailyChallenge:xp_progress → broadcast', { date, userId, username, xpDelta, totalXp });
    broadcast('dailyChallenge:leaderboard:update', {
      date,
      userId,
      username,
      xp: totalXp,
      xpDelta,
      timestamp: Date.now(),
      reason: 'question_answered',
    });
  });

  // Final lesson completion → full leaderboard refresh
  safeOn('dailyChallenge:score_updated', ({ date, userId, xp, reason }) => {
    console.log('[Socket] dailyChallenge:score_updated → broadcast', {
      date,
      userId,
      xp,
      reason,
    });
    broadcast('dailyChallenge:leaderboard:update', {
      date,
      timestamp: Date.now(),
      userId,
      xp,
      reason,
    });
  });

  // New notification created → deliver to user via Socket
  safeOn('notification:new', ({ userId, notification }) => {
    emitToUser(userId, 'notification:new', {
      notification,
      message: notification.title,
    });
  });

  // ── Auth events ──────────────────────────────────────────────────────────────

  // User registered → send welcome email (handled by eventHandlers.js)
  // We add socket notification here
  safeOn('user:registered', ({ userId, email, username }) => {
    emitToUser(userId, 'auth:welcome', {
      username,
      message: `Chào mừng ${username} đã gia nhập SmartEnglish! Hãy bắt đầu hành trình học tiếng Anh của bạn ngay hôm nay!`,
    });
  });

  console.log('[Socket.IO] Event handlers registered');
};

module.exports = { registerSocketHandlers };
