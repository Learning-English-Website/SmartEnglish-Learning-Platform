const User = require('../user/user.model');
const Achievement = require('../../models/achievement.model');
const UserAchievement = require('../../models/userAchievement.model');
const LeaderboardEntry = require('../../models/leaderboardEntry.model');
const { AppError } = require('../../shared/errors/AppError');
const eventBus = require('../../shared/events/eventBus');

// ── XP Constants ───────────────────────────────────────────────────────────────
const XP_PER_CARD = 10;
const XP_ACCURACY_BONUS = 50;   // accuracy >= 90%
const XP_STREAK_BONUS = 25;     // streak >= 7 ngày
const XP_PER_LEVEL = 500;

// ── Achievement Definitions (seed-in-code) ────────────────────────────────────
const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first_study',
    title: 'Bước đầu tiên',
    description: 'Hoàn thành phiên học đầu tiên',
    emoji: '🌱',
    xpReward: 50,
    condition: (ctx) => ctx.totalSessions >= 1,
  },
  {
    key: 'streak_3',
    title: 'Đang nóng!',
    description: 'Học 3 ngày liên tiếp',
    emoji: '🔥',
    xpReward: 75,
    condition: (ctx) => ctx.streak >= 3,
  },
  {
    key: 'streak_7',
    title: 'Chiến binh tuần',
    description: 'Học 7 ngày liên tiếp',
    emoji: '⚡',
    xpReward: 150,
    condition: (ctx) => ctx.streak >= 7,
  },
  {
    key: 'streak_30',
    title: 'Bậc thầy tháng',
    description: 'Học 30 ngày liên tiếp',
    emoji: '👑',
    xpReward: 500,
    condition: (ctx) => ctx.streak >= 30,
  },
  {
    key: 'level_5',
    title: 'Ngôi sao đang lên',
    description: 'Đạt Level 5',
    emoji: '⭐',
    xpReward: 100,
    condition: (ctx) => ctx.level >= 5,
  },
  {
    key: 'level_10',
    title: 'Học giả',
    description: 'Đạt Level 10',
    emoji: '🎓',
    xpReward: 200,
    condition: (ctx) => ctx.level >= 10,
  },
  {
    key: 'xp_1000',
    title: 'Săn điểm',
    description: 'Tích lũy 1000 XP',
    emoji: '💎',
    xpReward: 100,
    condition: (ctx) => ctx.totalXP >= 1000,
  },
  {
    key: 'perfect_score',
    title: 'Hoàn hảo',
    description: 'Đạt accuracy 100% trong một phiên học',
    emoji: '💯',
    xpReward: 100,
    condition: (ctx) => ctx.accuracy === 100,
  },
  {
    key: 'speed_demon',
    title: 'Tốc độ ánh sáng',
    description: 'Hoàn thành Match Mode trong vòng 30 giây',
    emoji: '⚡',
    xpReward: 200,
    condition: (ctx) => ctx.matchTimeMs > 0 && ctx.matchTimeMs <= 30000,
  },
  {
    key: 'night_owl',
    title: 'Cú đêm',
    description: 'Học sau 22 giờ tối',
    emoji: '🦉',
    xpReward: 50,
    condition: (ctx) => ctx.studyHour >= 22,
  },
];

// ── Helper: isSameDay ─────────────────────────────────────────────────────────
const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

// Helper: Check and refill premium streak freezes monthly
const checkMonthlyRefill = async (user) => {
  if (user.premium !== 'premium') {
    // Reset non-premium freezes to 0 just in case
    if (user.streakFreezes !== 0) {
      user.streakFreezes = 0;
      await user.save();
    }
    return user;
  }

  const today = new Date();
  const lastUpdate = user.updatedAt || new Date();
  
  const todayMonth = `${today.getFullYear()}-${today.getMonth()}`;
  const lastUpdateMonth = `${lastUpdate.getFullYear()}-${lastUpdate.getMonth()}`;
  
  if (todayMonth !== lastUpdateMonth || user.streakFreezes === undefined || user.streakFreezes === null) {
    user.streakFreezes = 3;
    await user.save();
  }
  return user;
};

// ── updateStreak ──────────────────────────────────────────────────────────────
/**
 * Cập nhật streak của user sau khi hoàn thành 1 phiên học.
 * @returns {{ current, longest, streakBroken, isNewRecord }}
 */
const updateStreak = async (userId) => {
  let user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Check and replenish freezes if needed
  user = await checkMonthlyRefill(user);

  const today = new Date();
  const lastStudy = user.streak?.lastStudyDate;
  let current = user.streak?.current || 0;
  let longest = user.streak?.longest || 0;
  let streakBroken = false;
  let freezesConsumed = 0;

  if (!lastStudy) {
    // Lần đầu tiên học
    current = 1;
  } else if (isSameDay(new Date(lastStudy), today)) {
    // Đã học hôm nay rồi, không thay đổi
    return {
      current,
      longest,
      streakBroken: false,
      isNewRecord: false,
    };
  } else if (isYesterday(new Date(lastStudy))) {
    // Học hôm qua → tiếp tục chuỗi
    current += 1;
  } else {
    // Bỏ lỡ ít nhất 1 ngày → kiểm tra bảo hiểm Streak Freeze cho Premium
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const lastStudyMidnight = new Date(lastStudy);
    lastStudyMidnight.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(todayMidnight - lastStudyMidnight);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const neededFreezes = diffDays - 1;

    if (user.premium === 'premium' && (user.streakFreezes || 0) >= neededFreezes) {
      // Tiêu thụ lượt bảo hiểm
      freezesConsumed = neededFreezes;
      user.streakFreezes -= neededFreezes;
      current += 1; // Giữ chuỗi hoạt động
      streakBroken = false;
    } else {
      // Tài khoản thường hoặc không đủ lượt bảo hiểm → reset
      streakBroken = current > 1;
      current = 1;
    }
  }

  const isNewRecord = current > longest;
  if (isNewRecord) longest = current;

  await User.findByIdAndUpdate(userId, {
    'streak.current': current,
    'streak.longest': longest,
    'streak.lastStudyDate': today,
    'streakFreezes': user.streakFreezes,
  });

  return { current, longest, streakBroken, isNewRecord };
};

// ── awardXP ───────────────────────────────────────────────────────────────────
/**
 * Cộng XP cho user dựa trên kết quả session.
 * @param {string} userId
 * @param {{ cardsReviewed, accuracy }} session
 * @returns {{ xpGained, totalXP, oldLevel, newLevel, levelUp }}
 */
const awardXP = async (userId, session) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const cardsReviewed = session.cardsReviewed || 0;
  const accuracy = session.accuracy || 0;
  const currentStreak = user.streak?.current || 0;

  // Tính XP kiếm được
  let xpGained = cardsReviewed * XP_PER_CARD;
  if (accuracy >= 90) xpGained += XP_ACCURACY_BONUS;
  if (currentStreak >= 7) xpGained += XP_STREAK_BONUS;

  const oldXP = user.gamification?.xp || 0;
  const totalXP = oldXP + xpGained;
  const oldLevel = user.gamification?.level || 1;
  const newLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const levelUp = newLevel > oldLevel;

  await User.findByIdAndUpdate(userId, {
    'gamification.xp': totalXP,
    'gamification.level': newLevel,
  });

  return {
    xpGained,
    totalXP,
    oldLevel,
    newLevel,
    levelUp,
    xpToNextLevel: XP_PER_LEVEL - (totalXP % XP_PER_LEVEL),
  };
};

// ── submitMatchScore ──────────────────────────────────────────────────────────
/**
 * Lưu kết quả Match Mode (thời gian tính ms).
 * Chỉ lưu khi là kỷ lục tốt nhất (timeMs nhỏ nhất).
 * Dùng `xp` field trong LeaderboardEntry để lưu timeMs (ngược: thấp hơn = tốt hơn).
 */
const submitMatchScore = async (userId, setId, timeMs) => {
  if (!timeMs || timeMs <= 0) throw new AppError('Invalid time', 400);

  const period = `match-${setId}`;

  // Tìm entry hiện tại của user cho set này
  const existing = await LeaderboardEntry.findOne({ user: userId, period });

  let isPersonalBest = false;

  if (!existing) {
    // Lần đầu chơi set này
    await LeaderboardEntry.create({
      user: userId,
      period,
      xp: timeMs,       // xp = timeMs (giá trị nhỏ = tốt hơn)
      league: 'bronze',
    });
    isPersonalBest = true;
  } else if (timeMs < existing.xp) {
    // Cải thiện kỷ lục cũ
    existing.xp = timeMs;
    await existing.save();
    isPersonalBest = true;
  }

  // Lấy bảng xếp hạng top 10 (sort ASC vì thời gian ngắn = tốt)
  const topEntries = await LeaderboardEntry.find({ period })
    .sort({ xp: 1 })
    .limit(10)
    .populate('user', 'username avatar');

  const rank = topEntries.findIndex((e) => e.user._id.toString() === userId.toString()) + 1;

  // Cập nhật rank vào entry hiện tại
  await LeaderboardEntry.findOneAndUpdate({ user: userId, period }, { rank });

  // Add gamification progression
  let streakResult = null;
  let xpResult = null;
  let newAchievements = [];
  try {
    [streakResult, xpResult] = await Promise.all([
      module.exports.updateStreak(userId),
      module.exports.awardXP(userId, { cardsReviewed: 10, accuracy: 100 }),
    ]);

    if (streakResult || xpResult) {
      const studyHour = new Date().getHours();
      const context = {
        streak: streakResult?.current || 0,
        totalXP: xpResult?.totalXP || 0,
        level: xpResult?.newLevel || 1,
        totalSessions: 1,
        accuracy: 100,
        matchTimeMs: timeMs,
        studyHour,
      };
      newAchievements = await module.exports.checkAndUnlockAchievements(userId, context);
    }

    // Emit events
    if (xpResult) {
      const user = await User.findById(userId).select('username');
      eventBus.emit('gamification:xp_gained', {
        userId,
        username: user?.username || 'Anonymous',
        xpGained: xpResult.xpGained,
        totalXP: xpResult.totalXP,
        level: xpResult.newLevel,
        levelUp: xpResult.levelUp,
      });

      // Sync to Daily XP Quest
      const questService = require('../quest/quest.service');
      questService.updateProgress(userId, { type: 'xp', xpEarned: xpResult.xpGained }).catch(err =>
        console.error('[Quest] Failed to update XP quest progress in match score:', err.message)
      );
    }
    if (streakResult?.current > 1) {
      eventBus.emit('streak:kept', { userId, currentStreak: streakResult.current });
    }
  } catch (err) {
    console.error('[Gamification] Error in submitMatchScore progression:', err.message);
  }

  return {
    timeMs,
    isPersonalBest,
    rank,
    topScores: topEntries.map((e, idx) => ({
      rank: idx + 1,
      username: e.user.username,
      avatar: e.user.avatar,
      timeMs: e.xp,
      isCurrentUser: e.user._id.toString() === userId.toString(),
    })),
    gamification: {
      streak: streakResult,
      xp: xpResult ? {
        gained:     xpResult.xpGained,
        oldXP:      xpResult.totalXP - xpResult.xpGained,
        total:      xpResult.totalXP,
        oldLevel:   xpResult.oldLevel,
        level:      xpResult.newLevel,
        levelUp:    xpResult.levelUp,
        xpPerLevel: XP_PER_LEVEL,
        xpToNextLevel: xpResult.xpToNextLevel,
      } : null,
      newAchievements,
    },
  };
};

// ── getLeaderboard ────────────────────────────────────────────────────────────
/**
 * Lấy bảng xếp hạng Match cho 1 học phần.
 */
const getLeaderboard = async (userId, setId) => {
  const period = `match-${setId}`;

  const topEntries = await LeaderboardEntry.find({ period })
    .sort({ xp: 1 })
    .limit(10)
    .populate('user', 'username avatar');

  const userEntry = await LeaderboardEntry.findOne({ user: userId, period });

  return {
    setId,
    topScores: topEntries.map((e, idx) => ({
      rank: idx + 1,
      username: e.user.username,
      avatar: e.user.avatar,
      timeMs: e.xp,
      isCurrentUser: e.user._id.toString() === userId.toString(),
    })),
    userBest: userEntry ? { timeMs: userEntry.xp, rank: userEntry.rank } : null,
    totalPlayers: await LeaderboardEntry.countDocuments({ period }),
  };
};

const getStats = async (userId) => {
  let user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Auto-refill freezes if a new month has arrived
  user = await checkMonthlyRefill(user);

  const today = new Date();
  const lastStudy = user.streak?.lastStudyDate;
  const studiedToday = lastStudy ? isSameDay(new Date(lastStudy), today) : false;

  const totalXP = user.gamification?.xp || 0;
  const level = user.gamification?.level || 1;

  return {
    streak: {
      current: user.streak?.current || 0,
      longest: user.streak?.longest || 0,
      studiedToday,
      lastStudyDate: lastStudy,
      streakFreezes: user.streakFreezes || 0,
    },
    gamification: {
      xp: totalXP,
      level,
      xpToNextLevel: XP_PER_LEVEL - (totalXP % XP_PER_LEVEL),
      xpCurrentLevel: totalXP % XP_PER_LEVEL,
      xpPerLevel: XP_PER_LEVEL,
    },
  };
};

// ── checkAndUnlockAchievements ────────────────────────────────────────────────
/**
 * Kiểm tra và mở khóa achievements dựa trên context hiện tại.
 * @param {string} userId
 * @param {{ streak, totalXP, level, totalSessions, accuracy, matchTimeMs, studyHour }} context
 * @returns {Array} danh sách achievements vừa mở khóa
 */
const checkAndUnlockAchievements = async (userId, context) => {
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // Kiểm tra điều kiện
    if (!def.condition(context)) continue;

    // Tìm hoặc tạo UserAchievement
    const existing = await UserAchievement.findOne({
      user: userId,
      // tìm theo achievement key thông qua join
    }).populate({ path: 'achievement', match: { key: def.key } });

    // Tìm achievement document theo key
    let achievementDoc = await Achievement.findOne({ key: def.key });

    // Tạo achievement doc nếu chưa có (seed inline)
    if (!achievementDoc) {
      achievementDoc = await Achievement.create({
        key: def.key,
        title: def.title,
        description: def.description,
        xpReward: def.xpReward,
      });
    }

    // Kiểm tra đã unlock chưa
    const userAch = await UserAchievement.findOne({
      user: userId,
      achievement: achievementDoc._id,
    });

    if (!userAch || !userAch.unlockedAt) {
      // Mở khóa!
      await UserAchievement.findOneAndUpdate(
        { user: userId, achievement: achievementDoc._id },
        {
          user: userId,
          achievement: achievementDoc._id,
          progress: 100,
          unlockedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      // Cộng thêm XP reward
      if (def.xpReward > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { 'gamification.xp': def.xpReward },
        });
      }

      newlyUnlocked.push({
        key: def.key,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
        xpReward: def.xpReward,
      });

      // Emit achievement unlocked event
      eventBus.emit('achievement:unlocked', {
        userId,
        achievement: {
          key: def.key,
          title: def.title,
          description: def.description,
          emoji: def.emoji,
          xpReward: def.xpReward,
        },
      });
    }
  }

  return newlyUnlocked;
};

// ── getAchievements ───────────────────────────────────────────────────────────
/**
 * Lấy tất cả achievements của user (locked + unlocked).
 */
const getAchievements = async (userId) => {
  // Tất cả achievements đã unlock của user
  const userAchievements = await UserAchievement.find({ user: userId })
    .populate('achievement');

  const unlockedMap = new Map(
    userAchievements
      .filter((ua) => ua.achievement)
      .map((ua) => [ua.achievement.key, ua])
  );

  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const ua = unlockedMap.get(def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      xpReward: def.xpReward,
      unlocked: !!(ua?.unlockedAt),
      unlockedAt: ua?.unlockedAt || null,
    };
  });
};

// ── triggerSessionComplete ────────────────────────────────────────────────────
/**
 * Dùng cho chế độ Học (Learn) và Kiểm tra (Test).
 * Cập nhật streak, cộng XP, kiểm tra achievements.
 * @param {string} userId
 * @param {{ accuracy, cardsStudied, mode }} data
 * @returns {{ streak, xp, newAchievements }}
 */
const triggerSessionComplete = async (userId, { accuracy = 0, cardsStudied = 1, mode = 'learn' }) => {
  let streakResult = null;
  let xpResult = null;
  let newAchievements = [];

  try {
    [streakResult, xpResult] = await Promise.all([
      module.exports.updateStreak(userId),
      module.exports.awardXP(userId, { cardsReviewed: cardsStudied, accuracy }),
    ]);

    const studyHour = new Date().getHours();
    const context = {
      streak:        streakResult?.current || 0,
      totalXP:       xpResult?.totalXP || 0,
      level:         xpResult?.newLevel || 1,
      totalSessions: 1,
      accuracy,
      matchTimeMs:   0,
      studyHour,
    };

    newAchievements = await module.exports.checkAndUnlockAchievements(userId, context);

    // Update daily quest progress for XP and activity type
    if (xpResult && xpResult.xpGained > 0) {
      try {
        const questService = require('../quest/quest.service');
        await questService.updateProgress(userId, { type: 'xp', xpEarned: xpResult.xpGained });
        if (mode === 'learn') {
          await questService.updateProgress(userId, { type: 'flashcards', amount: cardsStudied });
        } else if (mode === 'test') {
          await questService.updateProgress(userId, { type: 'reviews', amount: cardsStudied });
        }
      } catch (questErr) {
        console.error('[Quest] Failed to update quest progress in triggerSessionComplete:', questErr.message);
      }
    }

    // Emit XP gained event (for leaderboard update + notifications)
    if (xpResult) {
      const user = await User.findById(userId).select('username');
      eventBus.emit('gamification:xp_gained', {
        userId,
        username: user?.username || 'Anonymous',
        xpGained: xpResult.xpGained,
        totalXP: xpResult.totalXP,
        level: xpResult.newLevel,
        levelUp: xpResult.levelUp,
      });
    }

    // Emit streak events
    if (streakResult) {
      if (streakResult.streakBroken) {
        eventBus.emit('streak:broken', {
          userId,
          previousStreak: streakResult.longest,
        });
      } else if (streakResult.current > 1) {
        eventBus.emit('streak:kept', {
          userId,
          currentStreak: streakResult.current,
        });
      }
    }
  } catch (err) {
    console.error(`[Gamification] triggerSessionComplete error (${mode}):`, err.message);
  }

  return {
    streak: streakResult,
    xp: xpResult ? {
      gained:      xpResult.xpGained,
      oldXP:       xpResult.totalXP - xpResult.xpGained,
      total:       xpResult.totalXP,
      oldLevel:    xpResult.oldLevel,
      level:       xpResult.newLevel,
      levelUp:     xpResult.levelUp,
      xpPerLevel:  XP_PER_LEVEL,
      xpToNextLevel: xpResult.xpToNextLevel,
    } : null,
    newAchievements,
  };
};

module.exports = {
  updateStreak,
  awardXP,
  submitMatchScore,
  getLeaderboard,
  getStats,
  checkAndUnlockAchievements,
  getAchievements,
  triggerSessionComplete,
  ACHIEVEMENT_DEFINITIONS,
};
