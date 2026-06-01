const DailyChallenge = require('../../models/dailyChallenge.model');
const DailyChallengeScore = require('../../models/dailyChallengeScore.model');
const Lesson = require('../../models/lesson.model');
const eventBus = require('../../shared/events/eventBus');
const { getDateKey } = require('../../shared/utils/dateKey');

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

    challenge = await DailyChallenge.create({
      date: todayKey,
      lesson: lesson[0]._id,
      xpReward: 50,
      bonusMultiplier: 2,
      participants: 0,
    });

    return DailyChallenge.findById(challenge._id).populate('lesson');
  }

  async joinChallenge(userId, challengeId) {
    const challenge = await DailyChallenge.findByIdAndUpdate(
      challengeId,
      { $inc: { participants: 1 } },
      { new: true }
    ).populate('lesson');

    if (!challenge) return null;

    // If today's challenge points to a locked lesson, unlock it so the user can complete it.
    // NOTE: This is a global unlock (lesson.isLocked is not per-user in current schema).
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

    // Ensure the user appears on today's leaderboard immediately (0 XP)
    // This makes "Join" feel responsive even before the lesson is completed.
    // NOTE: dailyChallenge leaderboard API returns ApiResponse.success({ date, leaderboard })
    // so changes should be visible as soon as the client refetches.
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

      // Debug: read back the doc after upsert so we know xp value in DB
      const after = await DailyChallengeScore.findOne({ date: challenge.date, user: userId }).select('date user challenge xp updatedAt');
      console.log('[DailyChallenge] joinChallenge score after:', after ? {
        date: after.date,
        user: String(after.user),
        challenge: String(after.challenge),
        xp: after.xp,
        updatedAt: after.updatedAt,
      } : null);
    } catch (err) {
      // Ignore duplicate key races
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

    // Trigger clients to refresh leaderboard right away
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

    // Only set XP once per day. If user already has xp > 0 for this date, ignore.
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
