const DailyQuest = require('../../models/dailyQuest.model');
const UserProgress = require('../../models/userProgress.model');
const User = require('../../modules/user/user.model');
const eventBus = require('../../shared/events/eventBus');
const { AppError } = require('../../shared/errors/AppError');

// ── Quest Templates (Duolingo-focused) ────────────────────────────────────────
// XP quest: triggered by Duolingo submitAnswer (+10 per correct) + completeLesson (+20 bonus)
// lessons quest: triggered by Duolingo completeLesson
// reviews quest: triggered by Duolingo lesson practice/review
// flashcards quest: triggered by Duolingo lesson practice/review
// streak quest: triggered by BOTH Duolingo completeLesson AND Quizlet completeSession
const QUEST_TEMPLATES = [
  {
    type: 'xp',
    title: 'Săn Điểm',
    description: 'Kiếm 100 XP hôm nay',
    targetValue: 100,
    xpReward: 15,
    icon: '⚡',
  },
  {
    type: 'lessons',
    title: 'Tân Binh',
    description: 'Hoàn thành 1 bài học',
    targetValue: 1,
    xpReward: 20,
    icon: '🌱',
  },
  {
    type: 'lessons',
    title: 'Người Học Nhanh',
    description: 'Hoàn thành 3 bài học',
    targetValue: 3,
    xpReward: 50,
    icon: '📚',
  },
  {
    type: 'reviews',
    title: 'Từ Vựng Mới',
    description: 'Học thuộc 5 bài học mới',
    targetValue: 5,
    xpReward: 25,
    icon: '🧠',
  },
  {
    type: 'flashcards',
    title: 'Luyện Tập',
    description: 'Luyện tập 10 bài học đã học',
    targetValue: 10,
    xpReward: 30,
    icon: '🔄',
  },
  {
    type: 'streak',
    title: 'Giữ Chuỗi',
    description: 'Học mỗi ngày để giữ chuỗi',
    targetValue: 1,
    xpReward: 10,
    icon: '🔥',
  },
];

class QuestService {
  /**
   * Get or create daily quests for a user
   */
  async getDailyQuests(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ensure all quest templates exist in DB
    await this._ensureQuestTemplates();

    // Get user's quests for today
    let userQuests = await DailyQuest.find({
      user: userId,
      day: { $gte: today, $lt: tomorrow },
    }).sort({ createdAt: 1 });

    // Auto-create quests for today if missing.
    for (const template of QUEST_TEMPLATES) {
      const exists = userQuests.some(q => q.type === template.type);
      if (!exists) {
        try {
          await DailyQuest.updateOne(
            { user: userId, day: today, type: template.type },
            { $setOnInsert: {
              user: userId,
              day: today,
              type: template.type,
              targetValue: template.targetValue,
              xpReward: template.xpReward,
              progress: 0,
              isCompleted: false,
              rewardClaimed: false,
            }},
            { upsert: true }
          );
        } catch (err) {
          if (err.code !== 11000) throw err;
        }
        const found = await DailyQuest.findOne({
          user: userId,
          day: today,
          type: template.type,
        });
        if (found && !userQuests.some(q => String(q._id) === String(found._id))) {
          userQuests.push(found);
        }
      }
    }

    return userQuests.map(q => this._formatQuest(q));
  }

  /**
   * Update quest progress when user earns XP, completes lessons, etc.
   * Called from gamification/triggers throughout the app.
   * Auto-creates the quest if it doesn't exist yet (handles timezone mismatches).
   */
  async updateProgress(userId, { type, amount, xpEarned }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let incValue = 0;
    if (type === 'xp') {
      incValue = xpEarned || 0;
    } else if (['lessons', 'reviews', 'flashcards', 'streak'].includes(type)) {
      incValue = amount || 1;
    } else {
      return null;
    }

    if (incValue <= 0) return null;

    // Find all quests matching this type for today
    let quests = await DailyQuest.find({
      user: userId,
      day: { $gte: today, $lt: tomorrow },
      type,
    });

    // Auto-create the quest if it doesn't exist yet (timezone edge case)
    const template = QUEST_TEMPLATES.find(t => t.type === type);
    if (quests.length === 0 && template) {
      try {
        await DailyQuest.updateOne(
          { user: userId, day: today, type },
          { $setOnInsert: {
            user: userId,
            day: today,
            type,
            targetValue: template.targetValue,
            xpReward: template.xpReward,
            progress: 0,
            isCompleted: false,
            rewardClaimed: false,
          }},
          { upsert: true }
        );
        quests = await DailyQuest.find({
          user: userId,
          day: { $gte: today, $lt: tomorrow },
          type,
        });
      } catch (err) {
        if (err.code !== 11000) console.error('[Quest] Auto-create failed:', err.message);
        // Race condition: another request created it — re-fetch
        quests = await DailyQuest.find({
          user: userId,
          day: { $gte: today, $lt: tomorrow },
          type,
        });
      }
    }

    if (quests.length === 0) {
      console.warn(`[Quest] No quest found for user=${userId} type=${type} day=${today.toISOString()}`);
      return null;
    }

    // Atomic: use findOneAndUpdate with $set + $inc in one query to check AND update.
    // First, atomically increment progress for all matching quests.
    const writeResult = await DailyQuest.updateMany(
      { user: userId, day: { $gte: today, $lt: tomorrow }, type },
      { $inc: { progress: incValue } }
    );

    if (writeResult.modifiedCount === 0) return null;

    // Re-fetch updated quests
    quests = await DailyQuest.find({
      user: userId,
      day: { $gte: today, $lt: tomorrow },
      type,
    });

    // Check which quests just completed and mark them atomically
    const results = [];
    for (const quest of quests) {
      const newlyCompleted = !quest.isCompleted && quest.progress >= quest.targetValue;
      if (newlyCompleted) {
        await DailyQuest.findOneAndUpdate(
          { _id: quest._id, isCompleted: false },
          { isCompleted: true, completedAt: new Date() }
        );

        eventBus.emit('quest:completed', {
          userId,
          questType: type,
          xpReward: quest.xpReward,
        });
      }
      results.push(this._formatQuest(quest));
    }

    // Emit real-time progress update so frontend can refresh
    eventBus.emit('quest:progress_updated', { userId });

    return results;
  }

  /**
   * Claim quest reward (atomic — prevents double-claim)
   */
  async claimReward(userId, questId) {
    // Atomic: update only if NOT already claimed
    const quest = await DailyQuest.findOneAndUpdate(
      { _id: questId, user: userId, isCompleted: true, rewardClaimed: false },
      { rewardClaimed: true, claimedAt: new Date() },
      { new: true }
    );
    if (!quest) {
      // Check why it failed
      const existing = await DailyQuest.findOne({ _id: questId, user: userId });
      if (!existing) throw new AppError('Quest not found', 404);
      if (!existing.isCompleted) throw new AppError('Quest not yet completed', 400);
      if (existing.rewardClaimed) throw new AppError('Reward already claimed', 400);
      throw new AppError('Quest not found', 404);
    }

    // Award XP atomically
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const newXP = (user.gamification?.xp || 0) + quest.xpReward;
    const newLevel = Math.floor(newXP / 500) + 1;
    await User.findByIdAndUpdate(userId, {
      'gamification.xp': newXP,
      'gamification.level': newLevel,
    });

    // Emit event
    eventBus.emit('quest:claimed', {
      userId,
      xpReward: quest.xpReward,
      totalXP: newXP,
    });

    return {
      xpAwarded: quest.xpReward,
      newTotalXP: newXP,
      newLevel,
    };
  }

  /**
   * Get quest statistics for dashboard
   */
  async getStats(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayQuests = await DailyQuest.find({
      user: userId,
      day: { $gte: today, $lt: tomorrow },
    });

    const completed = todayQuests.filter(q => q.isCompleted).length;
    const claimed = todayQuests.filter(q => q.rewardClaimed).length;
    const totalRewards = todayQuests
      .filter(q => q.isCompleted)
      .reduce((sum, q) => sum + q.xpReward, 0);

    return {
      totalQuests: todayQuests.length,
      completed,
      claimed,
      totalPossibleRewards: totalRewards,
      progressPercent: todayQuests.length > 0
        ? Math.round((completed / todayQuests.length) * 100)
        : 0,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  async _ensureQuestTemplates() {
    // Templates are defined in code, not stored separately.
    // Auto-creation is handled in getDailyQuests.
  }

  _formatQuest(quest) {
    const template = QUEST_TEMPLATES.find(t => t.type === quest.type);
    return {
      id: quest._id,
      type: quest.type,
      title: template?.title || quest.type,
      description: template?.description || '',
      icon: template?.icon || '🎯',
      targetValue: quest.targetValue,
      progress: quest.progress,
      isCompleted: quest.isCompleted,
      rewardClaimed: quest.rewardClaimed,
      xpReward: quest.xpReward,
      progressPercent: quest.targetValue > 0
        ? Math.min(100, Math.round((quest.progress / quest.targetValue) * 100))
        : 0,
    };
  }
}

module.exports = new QuestService();
