const DailyChallenge = require('../../models/dailyChallenge.model');
const DailyChallengeScore = require('../../models/dailyChallengeScore.model');
const Lesson = require('../../models/lesson.model');
const { getIO } = require('../../config/socketIO');
const eventBus = require('../../shared/events/eventBus');
const { getDateKey } = require('../../shared/utils/dateKey');
const User = require('../user/user.model');

async function isExcludedFromXp(userId) {
  try {
    const user = await User.findById(userId).select('username email');
    if (!user) return false;
    const email = user.email ? user.email.toLowerCase() : '';
    const username = user.username ? user.username.toLowerCase() : '';
    return email.includes('chienthanglb') || username === 'chienthanglb' || username === 'thngl1';
  } catch (err) {
    console.error('[XP Exclusion Check Failed]:', err);
    return false;
  }
}

class DailyChallengeService {
  async getTodayChallenge() {
    const todayKey = getDateKey(new Date());

    let challenge = await DailyChallenge.findOne({ date: todayKey }).populate('lesson');
    if (challenge) {
      if (!challenge.lesson) {
        await DailyChallenge.deleteOne({ _id: challenge._id });
        challenge = null;
      } else {
        return challenge;
      }
    }

    const lesson = await Lesson.aggregate([{ $sample: { size: 1 } }]);
    if (!lesson || lesson.length === 0) return null;

    try {
      await DailyChallenge.create({
        date: todayKey,
        lesson: lesson[0]._id,
        xpReward: 50,
        bonusMultiplier: 2,
        participants: 0,
      });
    } catch (err) {
      if (err?.code !== 11000) {
        throw err;
      }
    }

    return DailyChallenge.findOne({ date: todayKey }).populate('lesson');
  }

  async getTodayChallengeSnapshot() {
    const challenge = await this.getTodayChallenge();
    return challenge ? challenge.toObject?.() || challenge : null;
  }

  async emitTodayChallengeSnapshot() {
    const io = getIO();
    const challenge = await this.getTodayChallenge();
    if (!challenge) return null;

    io.emit('dailyChallenge:challenge:snapshot', {
      date: challenge.date,
      challenge,
      timestamp: Date.now(),
    });

    return challenge;
  }

  async joinChallenge(userId, challengeId) {
    const challenge = await DailyChallenge.findByIdAndUpdate(
      challengeId,
      { $inc: { participants: 1 } },
      { new: true }
    ).populate('lesson');

    if (!challenge) return null;

    if (challenge.lesson?._id) {
      try {
        const unlocked = await Lesson.findOneAndUpdate(
          { _id: challenge.lesson._id, isLocked: true },
          { $set: { isLocked: false } },
          { new: true }
        );
        console.log('[DailyChallenge] Unlock attempt on join:', {
          lessonId: String(challenge.lesson._id),
          wasLocked: Boolean(challenge.lesson?.isLocked),
          updated: Boolean(unlocked),
          challengeId: String(challenge._id),
          date: challenge.date,
        });
      } catch (err) {
        console.error('[DailyChallenge] Failed to unlock lesson on join:', err);
      }
    }

    let upserted = false;
    try {
      const res = await DailyChallengeScore.updateOne(
        { date: challenge.date, user: userId },
        { $setOnInsert: { challenge: challenge._id, xp: 0 } },
        { upsert: true }
      );
      upserted = Boolean(res?.upsertedCount);
      console.log('[DailyChallenge] joinChallenge score upsert:', {
        userId: String(userId),
        date: challenge.date,
        challengeId: String(challenge._id),
        matchedCount: res?.matchedCount,
        modifiedCount: res?.modifiedCount,
        upsertedCount: res?.upsertedCount,
      });

      const after = await DailyChallengeScore.findOne({ date: challenge.date, user: userId }).select('date user challenge xp updatedAt');
      console.log('[DailyChallenge] joinChallenge score after:', after ? {
        date: after.date,
        user: String(after.user),
        challenge: String(after.challenge),
        xp: after.xp,
        updatedAt: after.updatedAt,
      } : null);
    } catch (err) {
      if (err?.code !== 11000) {
        console.error('[DailyChallenge] Failed to upsert score on join:', err);
      }
    }

    eventBus.emit('dailyChallenge:joined', {
      userId,
      date: challenge.date,
      challengeId: String(challenge._id),
      lessonId: String(challenge.lesson?._id),
    });

    eventBus.emit('dailyChallenge:score_updated', {
      date: challenge.date,
      userId: String(userId),
      xp: 0,
      reason: upserted ? 'join_upserted' : 'join_existing',
    });

    return challenge;
  }

  async addXpForUserOncePerDay({ userId, dateKey, challengeId, xp }) {
    if (!xp || xp <= 0) return { updated: false, reason: 'no_xp' };

    if (await isExcludedFromXp(userId)) {
      return { updated: false, reason: 'excluded_user' };
    }

    const existing = await DailyChallengeScore.findOne({ date: dateKey, user: userId })
      .select('xp')
      .lean();

    if (existing && existing.xp > 0) {
      return { updated: false, reason: 'already_counted', xp: existing.xp };
    }

    const doc = await DailyChallengeScore.findOneAndUpdate(
      { date: dateKey, user: userId },
      { $setOnInsert: { challenge: challengeId }, $set: { xp } },
      { upsert: true, new: true }
    );

    eventBus.emit('dailyChallenge:score_updated', {
      date: dateKey,
      userId: String(userId),
      xp: doc.xp,
      reason: 'complete_first_of_day',
    });

    return { updated: true, reason: 'set', xp: doc.xp };
  }

  async addXpForUser({ userId, dateKey, challengeId, xp }) {
    if (!xp || xp <= 0) return null;

    if (await isExcludedFromXp(userId)) {
      return null;
    }

    const doc = await DailyChallengeScore.findOneAndUpdate(
      { date: dateKey, user: userId },
      { $setOnInsert: { challenge: challengeId }, $inc: { xp } },
      { upsert: true, new: true }
    );

    eventBus.emit('dailyChallenge:score_updated', {
      date: dateKey,
      userId: String(userId),
      xp: doc.xp,
    });

    return doc;
  }

  async getLeaderboard(dateKey, { limit = 20 } = {}) {
    console.log('[DailyChallenge] getLeaderboard request:', { dateKey, limit });

    const rows = await DailyChallengeScore.find({ date: dateKey })
      .sort({ xp: -1, updatedAt: 1 })
      .limit(limit)
      .populate('user', 'username avatar');

    console.log('[DailyChallenge] getLeaderboard rows:', rows.map(r => ({
      userId: String(r.user?._id || r.user),
      username: r.user?.username,
      xp: r.xp,
      updatedAt: r.updatedAt,
    })));

    return rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user?._id,
      username: r.user?.username || 'Anonymous',
      avatar: r.user?.avatar || null,
      xp: r.xp,
    }));
  }
}

module.exports = new DailyChallengeService();
