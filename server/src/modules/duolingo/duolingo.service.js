const UserProgress = require('../../models/userProgress.model');
const User = require('../user/user.model');
const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const ChallengeProgress = require('../../models/challengeProgress.model');
const DailyChallengeScore = require('../../models/dailyChallengeScore.model');
const questService = require('../quest/quest.service');
const dailyChallengeService = require('../quest/dailyChallenge.service');
const eventBus = require('../../shared/events/eventBus');
const { getDateKey } = require('../../shared/utils/dateKey');
const { AppError } = require('../../shared/errors/AppError');

const POINTS_PER_CORRECT = 10;
const MAX_HEARTS = 5;
const POINTS_TO_REFILL = 300;

class DuolingoService {
  // === COURSES ===
  async getCourses() {
    return Course.find().sort({ order: 1 });
  }

  async getCourseById(courseId) {
    return Course.findById(courseId);
  }

  async selectCourse(userId, courseId) {
    let progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      progress = new UserProgress({ user: userId });
    }
    progress.activeCourse = courseId;
    await progress.save();
    return progress;
  }

  // === UNITS ===
  async getUnits(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.activeCourse) return [];

    const units = await Unit.find({ course: progress.activeCourse }).sort({ order: 1 });
    
    // Populate lessons with challenge progress
    const unitsWithProgress = await Promise.all(units.map(async (unit) => {
      const lessons = await Lesson.find({ unit: unit._id }).sort({ order: 1 });
      const lessonsWithProgress = await Promise.all(lessons.map(async (lesson) => {
        const challenges = await Challenge.find({ lesson: lesson._id }).sort({ order: 1 });
        const completedCount = await ChallengeProgress.countDocuments({
          user: userId,
          challenge: { $in: challenges.map(c => c._id) },
          completed: true,
        });
        return {
          ...lesson.toObject(),
          challengesCount: challenges.length,
          completedCount,
          completed: challenges.length > 0 && completedCount === challenges.length,
        };
      }));
      return {
        ...unit.toObject(),
        lessons: lessonsWithProgress,
      };
    }));

    return unitsWithProgress;
  }

  // === LESSONS ===
  async getLesson(lessonId, userId) {
    const lesson = await Lesson.findById(lessonId).populate('unit');
    if (!lesson) throw new Error('Lesson not found');

    const challenges = await Challenge.find({ lesson: lessonId }).sort({ order: 1 });
    
    const challengesWithOptions = await Promise.all(challenges.map(async (challenge) => {
      const progress = await ChallengeProgress.findOne({
        user: userId,
        challenge: challenge._id
      });
      // Prefer embedded challenge.options (from seeder) over ChallengeOption collection
      // Embedded: { text, correct } → frontend sends option.text, backend matches o.text
      // ChallengeOption: { _id, text, correct } → frontend sends option._id, backend matches o._id
      let options;
      if (challenge.options && challenge.options.length > 0) {
        options = challenge.options;
      } else {
        const challengeOptions = await ChallengeOption.find({ challenge: challenge._id });
        options = challengeOptions.map(opt => opt.toObject());
      }
      return {
        ...challenge.toObject(),
        options,
        completed: progress?.completed || false,
      };
    }));

    return {
      ...lesson.toObject(),
      challenges: challengesWithOptions,
      totalChallenges: challenges.length,
    };
  }

  async getNextLesson(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.activeCourse) return null;

    // Find first incomplete challenge
    const units = await Unit.find({ course: progress.activeCourse }).sort({ order: 1 });
    
    for (const unit of units) {
      const lessons = await Lesson.find({ unit: unit._id }).sort({ order: 1 });
      for (const lesson of lessons) {
        // Skip locked lessons
        if (lesson.isLocked) continue;
        const challenges = await Challenge.find({ lesson: lesson._id });
        for (const challenge of challenges) {
          const cp = await ChallengeProgress.findOne({ user: userId, challenge: challenge._id });
          if (!cp?.completed) {
            return { lesson, unit, challenge };
          }
        }
      }
    }
    return null; // All completed
  }

  // === QUIZ ===
  async submitAnswer(userId, challengeId, selectedOptionId, userAnswer) {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    let isCorrect = false;
    const type = challenge.type;

    if (type === 'TYPE' || type === 'TRANSLATE') {
      // Compare typed answer (case-insensitive)
      // Accept either selectedOptionId (from click-select UI) or typed userAnswer
      const normalized = (selectedOptionId || userAnswer || '').trim().toLowerCase();
      const normalizedCorrect = (challenge.correctAnswer || '').trim().toLowerCase();
      isCorrect = normalized === normalizedCorrect;
    } else if (type === 'ORDER') {
      // ORDER: userAnswer is a JSON string of the ordered indices
      try {
        const userOrder = JSON.parse(userAnswer || '[]');
        const correctOrder = challenge.correctOrder || [];
        isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
      } catch {
        isCorrect = false;
      }
    } else if (type === 'MATCH') {
      // MATCH: userAnswer is a JSON string of {leftIndex, rightIndex} pairs
      try {
        const userPairs = JSON.parse(userAnswer || '[]');
        const pairs = challenge.pairs || [];
        // Compare each user pair against the actual pairs by content
        // userPairs format: [{ leftIndex, rightIndex }]
        // Each leftIndex and rightIndex refers to a position in the shuffled pairs array.
        // Find the actual pair where left and right match the selected items.
        const allMatch = userPairs.length === pairs.length && userPairs.every((up) => {
          const leftItem = pairs[up.leftIndex]?.left;
          const rightItem = pairs[up.rightIndex]?.right;
          return leftItem && rightItem && pairs.some(
            (p) => p.left === leftItem && p.right === rightItem
          );
        });
        isCorrect = allMatch;
      } catch {
        isCorrect = false;
      }
    } else if (type === 'COMPLETE' || type === 'FILL' || type === 'LISTEN') {
      // COMPLETE / FILL / LISTEN: userAnswer is the filled word or selectedOptionId is the chosen option
      const normalized = (selectedOptionId || userAnswer || '').trim().toLowerCase();
      const normalizedCorrect = (challenge.correctAnswer || '').trim().toLowerCase();
      isCorrect = normalized === normalizedCorrect;
    } else {
      // SELECT / ASSIST: multiple choice
      // Options may be embedded in challenge.options or stored in ChallengeOption collection
      let isOptionCorrect = false;
      if (challenge.options && challenge.options.length > 0) {
        // Embedded options (seeder format) - match by _id or by text
        const selected = challenge.options.find(
          (o) =>
            (o._id && String(o._id) === String(selectedOptionId)) ||
            o.text === selectedOptionId
        );
        isOptionCorrect = selected?.correct || false;
      } else {
        // Separate ChallengeOption collection
        const option = await ChallengeOption.findById(selectedOptionId);
        isOptionCorrect = option?.correct || false;
      }
      isCorrect = isOptionCorrect;
    }

    // Duplicate protection: only award XP/quest if not already completed
    if (isCorrect) {
      // Atomically upsert progress only if NOT already completed (prevents double XP)
      const upsertResult = await ChallengeProgress.findOneAndUpdate(
        { user: userId, challenge: challengeId },
        { $setOnInsert: { user: userId, challenge: challengeId }, $set: { completed: true, completedAt: new Date() } },
        { upsert: true, new: true }
      );

      // If this was the first time completing, award XP
      const isFirstAnswer = upsertResult && upsertResult.createdAt &&
        upsertResult.createdAt.getTime() === upsertResult.updatedAt.getTime();

      if (isFirstAnswer) {
        // Award points (XP) to user progress
        await UserProgress.findOneAndUpdate(
          { user: userId },
          { $inc: { points: POINTS_PER_CORRECT, totalXP: POINTS_PER_CORRECT } }
        );

        // Update quest progress (XP quest)
        questService.updateProgress(userId, { type: 'xp', xpEarned: POINTS_PER_CORRECT }).catch(err =>
          console.error('[Quest] Failed to update XP progress:', err.message)
        );

        // ── Daily Challenge: update score and emit realtime event ────────────────
        try {
          const todayKey = getDateKey(new Date());
          const challenge_ = await dailyChallengeService.getTodayChallenge();
          const dcLessonId = challenge_?.lesson?._id != null
            ? String(challenge_.lesson._id)
            : String(challenge_?.lesson || '');
          const lessonId = challenge.lesson ? String(challenge.lesson) : null;

          if (dcLessonId && lessonId && dcLessonId === lessonId) {
            const updatedScore = await DailyChallengeScore.findOneAndUpdate(
              { date: todayKey, user: userId },
              { $setOnInsert: { challenge: challenge_._id }, $inc: { xp: POINTS_PER_CORRECT } },
              { upsert: true, new: true }
            );

            console.log('[DailyChallenge] per-question XP update:', {
              userId: String(userId),
              date: todayKey,
              lessonId,
              xpDelta: POINTS_PER_CORRECT,
              totalXp: updatedScore?.xp,
            });

            // Emit realtime event for User B to see live leaderboard update
            const user = await User.findById(userId).select('username');
            eventBus.emit('dailyChallenge:xp_progress', {
              date: todayKey,
              userId: String(userId),
              username: user?.username || 'Anonymous',
              xpDelta: POINTS_PER_CORRECT,
              totalXp: updatedScore?.xp || POINTS_PER_CORRECT,
            });
          }
        } catch (err) {
          console.error('[DailyChallenge] Failed to update per-question XP:', err.message);
        }
      }
    }

    return { isCorrect, pointsEarned: isCorrect ? POINTS_PER_CORRECT : 0 };
  }

  async completeLesson(userId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    // Determine if this is the first-time completion or a re-do.
    // NOTE: lesson.isCompleted is a global flag (not per-user). For awarding completion XP,
    // rely on user progress (ChallengeProgress) instead.
    const isFirstCompletion = !lesson.isCompleted;

    // ── Lock check ──────────────────────────────────────────────────────────
    // NOTE: Lesson lock is currently a global flag on the Lesson document (not per-user).
    // Users can still access lessons via direct URL; in that case we allow completion
    // so that quests/streak/progress are recorded. We do NOT rely on this lock for security.
    if (lesson.isLocked) {
      const todayKey = getDateKey(new Date());
      const dc = await dailyChallengeService.getTodayChallenge();
      const dcLessonId = dc?.lesson?._id != null
        ? String(dc.lesson._id)
        : String(dc?.lesson || '');

      const canBypassForDailyChallenge = dcLessonId && dcLessonId === String(lesson._id);
      if (canBypassForDailyChallenge) {
        console.warn('[Duolingo] Bypassing lesson lock for Daily Challenge:', {
          userId: String(userId),
          lessonId: String(lesson._id),
          date: todayKey,
        });
        lesson.isLocked = false;
      } else {
        console.warn('[Duolingo] Completing a locked lesson (direct URL access):', {
          userId: String(userId),
          lessonId: String(lesson._id),
        });
        // Allow completion without changing lock status globally.
      }
    }

    // ── Mark lesson completed (idempotent — always save) ────────────────────
    lesson.isCompleted = true;
    lesson.completedAt = new Date();
    await lesson.save();

    // ── Unlock next lesson in unit ──────────────────────────────────────────
    const nextLesson = await Lesson.findOne({
      unit: lesson.unit,
      order: lesson.order + 1,
    }).sort({ order: 1 });
    if (nextLesson) {
      nextLesson.isLocked = false;
      await nextLesson.save();
    }

    // ── Restore 1 heart on practice lessons ─────────────────────────────────
    if (lesson.type === 'practice') {
      await UserProgress.findOneAndUpdate(
        { user: userId },
        { $inc: { hearts: 1 } }
      );
    }

    // ── Streak & first-completion XP bonus (only once per lesson) ───────────
    const progress = await UserProgress.findOne({ user: userId });
    let completionXp = 0;
    if (progress) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!progress.lastStudyDate) {
        progress.streak = 1;
        progress.lastStudyDate = new Date();
      } else {
        const lastStudy = new Date(progress.lastStudyDate);
        lastStudy.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today - lastStudy);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          progress.streak += 1;
          progress.lastStudyDate = new Date();
        } else if (diffDays > 1) {
          progress.streak = 1;
          progress.lastStudyDate = new Date();
        }
      }

      if (isFirstCompletion) {
        completionXp = 20;
        progress.points += completionXp;
        progress.totalXP += completionXp;
        await progress.save();
      }
    }

    // ── Quest progress ────────────────────────────────────────────────────
    // streak: triggered on EVERY lesson completion (both Duolingo and Quizlet)
    questService.updateProgress(userId, { type: 'streak', amount: 1 }).catch(err =>
      console.error('[Quest] Failed to update streak progress:', err.message)
    );

    // lessons quest: every lesson completion counts
    questService.updateProgress(userId, { type: 'lessons', amount: 1 }).catch(err =>
      console.error('[Quest] Failed to update lessons progress:', err.message)
    );

    // Từ Vựng Mới (type: reviews) — only on FIRST-TIME lesson completion
    if (isFirstCompletion) {
      questService.updateProgress(userId, { type: 'reviews', amount: 1 }).catch(err =>
        console.error('[Quest] Failed to update reviews progress:', err.message)
      );
    }

    // Luyện Tập (type: flashcards) — only on RE-DO / practice lesson (lesson already completed before)
    if (!isFirstCompletion) {
      questService.updateProgress(userId, { type: 'flashcards', amount: 1 }).catch(err =>
        console.error('[Quest] Failed to update flashcards progress:', err.message)
      );
    }

    // Săn Điểm (type: xp) — completion bonus (20 XP for first-time)
    if (completionXp > 0) {
      questService.updateProgress(userId, { type: 'xp', xpEarned: completionXp }).catch(err =>
        console.error('[Quest] Failed to update xp progress:', err.message)
      );
    }

    // ── Daily Challenge scoring (always runs — re-dos earn DC XP too) ────────
    try {
      const todayKey = getDateKey(new Date());
      const challenge = await dailyChallengeService.getTodayChallenge();
      const dcLessonId = challenge?.lesson?._id != null
        ? String(challenge.lesson._id)
        : String(challenge?.lesson || '');
      const currentLessonId = String(lesson._id);
      console.log('[DailyChallenge] scoring check:', {
        userId: String(userId),
        todayKey,
        dcLessonId,
        currentLessonId,
        match: dcLessonId === currentLessonId,
        challengeId: challenge?._id,
        challengeDate: challenge?.date,
        isFirstCompletion,
      });

      if (dcLessonId && dcLessonId === currentLessonId) {
        // completedChallenges counts ALL correct answers ever for this lesson.
        // On re-do, new correct answers increase this count → more DC XP.
        const lessonChallengeIds = await Challenge.distinct('_id', { lesson: lesson._id });
        const completedChallenges = await ChallengeProgress.countDocuments({
          user: userId,
          completed: true,
          challenge: { $in: lessonChallengeIds },
        });
        const challengeXp = (completedChallenges * POINTS_PER_CORRECT) + completionXp;
        const result = await dailyChallengeService.addXpForUserOncePerDay({
          userId,
          dateKey: todayKey,
          challengeId: challenge._id,
          xp: challengeXp,
        });
        console.log('[DailyChallenge] score update (once/day):', {
          userId: String(userId),
          date: todayKey,
          lessonId: String(lesson._id),
          completedChallenges,
          completionXp,
          challengeXp,
          result,
        });

        // Note: addXpForUserOncePerDay already emits 'dailyChallenge:score_updated'
        // via its own eventBus.emit() — no duplicate emit needed here.
      }
    } catch (err) {
      console.error('[DailyChallenge] Failed to update score:', err.message);
    }

    return { lesson, unitCompleted: false };
  }

  // === HEARTS & USER PROGRESS ===
  async getUserHearts(userId) {
    const user = await User.findById(userId);
    let progress = await UserProgress.findOne({ user: userId }).populate('activeCourse');
    if (!progress) {
      progress = await UserProgress.create({ user: userId });
      progress = await progress.populate('activeCourse');
    }

    // Dynamic synchronization of Premium status
    const isPremium = !!(user && user.premium === 'premium');
    if (isPremium !== progress.isPro) {
      progress.isPro = isPremium;
      await progress.save();
    }

    return {
      hearts: progress.hearts,
      maxHearts: progress.isPro ? Infinity : MAX_HEARTS,
      isPro: progress.isPro || false,
      points: progress.points ?? 0,
      streak: progress.streak ?? 0,
      activeCourse: progress.activeCourse || null,
    };
  }

  async reduceHearts(userId) {
    const user = await User.findById(userId);
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress) return { hearts: 0 };

    // Dynamic synchronization of Premium status
    const isPremium = !!(user && user.premium === 'premium');
    if (isPremium !== progress.isPro) {
      progress.isPro = isPremium;
      await progress.save();
    }

    // Pro users don't lose hearts
    if (progress.isPro) {
      return { hearts: progress.hearts };
    }

    if (progress.hearts <= 0) {
      return { error: 'no_hearts', hearts: 0 };
    }

    progress.hearts -= 1;
    await progress.save();

    return { hearts: progress.hearts, error: progress.hearts <= 0 ? 'no_hearts' : null };
  }

  async refillHearts(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress) throw new Error('User not found');

    // Pro users have unlimited hearts
    if (progress.isPro) {
      return { hearts: Infinity, message: 'Pro user - unlimited hearts' };
    }

    if (progress.points < POINTS_TO_REFILL) {
      throw new Error(`Not enough points. Need ${POINTS_TO_REFILL}, have ${progress.points}`);
    }

    progress.points -= POINTS_TO_REFILL;
    progress.hearts = MAX_HEARTS;
    await progress.save();

    return { hearts: progress.hearts, points: progress.points };
  }

  // === PRACTICE ===
  async practiceLesson(userId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    // Authorization: user must own this lesson (via course enrolled in their progress)
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.activeCourse) {
      throw new Error('No active course selected');
    }
    const unit = await require('../../models/unit.model').findById(lesson.unit);
    if (!unit || String(unit.course) !== String(progress.activeCourse)) {
      throw new Error('Unauthorized: lesson not in active course');
    }
    
    if (lesson.type !== 'practice') {
      lesson.type = 'practice';
      await lesson.save();
    }

    // Reset progress for this lesson's challenges so user can practice
    const challenges = await Challenge.find({ lesson: lessonId });
    await ChallengeProgress.deleteMany({
      user: userId,
      challenge: { $in: challenges.map(c => c._id) }
    });

    return this.getLesson(lessonId, userId);
  }

  // === LEADERBOARD ===
  async getLeaderboard(type = 'weekly') {
    const users = await UserProgress.find()
      .populate('user', 'username avatar streak')
      .sort({ points: -1 })
      .limit(10);

    return users.map((u, index) => ({
      rank: index + 1,
      userId: u.user?._id,
      username: u.user?.username || 'Anonymous',
      avatar: u.user?.avatar || null,
      points: u.points,
      streak: u.streak || 0,
    }));
  }
}

module.exports = new DuolingoService();
