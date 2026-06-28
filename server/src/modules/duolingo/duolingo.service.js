const UserProgress = require('../../models/userProgress.model');
const User = require('../user/user.model');
const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const ChallengeProgress = require('../../models/challengeProgress.model');
const questService = require('../quest/quest.service');
const dailyChallengeService = require('../quest/dailyChallenge.service');
const { AppError } = require('../../shared/errors/AppError');
const mongoose = require('mongoose');

const POINTS_PER_CORRECT = 10;
const LESSON_COMPLETION_XP = 20;
const MAX_HEARTS = 5;
const POINTS_TO_REFILL = 300;

function toId(value) {
  return value ? String(value) : null;
}

function countMap(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(toId(row._id), row.count || 0);
  }
  return map;
}

function normalizeTypedAnswer(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/[.!?;:]+$/g, '')
    .trim();
}

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

class DuolingoService {
  isCourseLearnable(course) {
    return Boolean(course?.isPublished && course.isActive !== false);
  }

  getCourseLockedError() {
    return new AppError('Khóa học chưa được xuất bản hoặc đang bị khóa.', 403);
  }

  async getCourseForLesson(lesson) {
    if (!lesson) return null;

    const unit = lesson.unit?.course !== undefined
      ? lesson.unit
      : await Unit.findById(lesson.unit).select('course');

    if (!unit?.course) return null;
    if (unit.course.isPublished !== undefined) return unit.course;

    return Course.findById(unit.course).select('isPublished isActive');
  }

  async assertCourseLearnableForLesson(lesson) {
    const course = await this.getCourseForLesson(lesson);
    if (!this.isCourseLearnable(course)) {
      throw this.getCourseLockedError();
    }
  }

  async isLessonCompletedForUser(userId, lessonId) {
    const progress = await UserProgress.findOne({ user: userId }).select('crownsByLesson');
    if (progress?.crownsByLesson?.get(String(lessonId))) return true;

    const challengeIds = await Challenge.distinct('_id', { lesson: lessonId });
    if (challengeIds.length === 0) return false;

    const completedCount = await ChallengeProgress.countDocuments({
      user: userId,
      challenge: { $in: challengeIds },
      completed: true,
    });

    return completedCount === challengeIds.length;
  }

  async findNextLessonAfter(userId, lesson) {
    const unit = await Unit.findById(lesson.unit);
    if (!unit) return null;

    const units = await Unit.find({ course: unit.course }).sort({ order: 1, _id: 1 });
    const startUnitIndex = units.findIndex((u) => String(u._id) === String(unit._id));
    if (startUnitIndex === -1) return null;

    for (let i = startUnitIndex; i < units.length; i++) {
      const query = { unit: units[i]._id };
      if (i === startUnitIndex) {
        query.order = { $gt: lesson.order };
      }

      const lessons = await Lesson.find(query).sort({ order: 1, _id: 1 });
      for (const candidate of lessons) {
        const completed = await this.isLessonCompletedForUser(userId, candidate._id);
        if (completed) continue;

        const isLocked = await this.isLessonLocked(userId, candidate._id);
        if (!isLocked) return candidate;
      }
    }

    return null;
  }

  async findFirstAvailableIncompleteLesson(userId, courseId) {
    if (!courseId) return null;

    const units = await Unit.find({ course: courseId }).sort({ order: 1, _id: 1 });
    for (const unit of units) {
      const lessons = await Lesson.find({ unit: unit._id }).sort({ order: 1, _id: 1 });
      for (const lesson of lessons) {
        const completed = await this.isLessonCompletedForUser(userId, lesson._id);
        if (completed) continue;

        const isLocked = await this.isLessonLocked(userId, lesson._id);
        if (!isLocked) return lesson;
      }
    }

    return null;
  }

  // === COURSES ===
  async getCourses(userId) {
    const [courses, progress] = await Promise.all([
      Course.find({
        isPublished: true,
        isActive: { $ne: false },
      }).sort({ order: 1, createdAt: -1 }).lean(),
      userId ? UserProgress.findOne({ user: userId }).select('activeCourse').lean() : null,
    ]);

    if (courses.length === 0) return [];

    const courseIds = courses.map((course) => course._id);
    const units = await Unit.find({ course: { $in: courseIds } }).select('_id course').lean();
    const unitIds = units.map((unit) => unit._id);
    const unitCourseMap = new Map(units.map((unit) => [toId(unit._id), toId(unit.course)]));

    const lessons = unitIds.length > 0
      ? await Lesson.find({ unit: { $in: unitIds } }).select('_id unit').lean()
      : [];
    const lessonIds = lessons.map((lesson) => lesson._id);
    const lessonCourseMap = new Map(
      lessons.map((lesson) => [toId(lesson._id), unitCourseMap.get(toId(lesson.unit))])
    );

    const [lessonRows, challengeRows, learnerRows] = await Promise.all([
      Lesson.aggregate([
        { $match: { unit: { $in: unitIds } } },
        {
          $lookup: {
            from: 'units',
            localField: 'unit',
            foreignField: '_id',
            as: 'unitDoc',
          },
        },
        { $unwind: '$unitDoc' },
        { $group: { _id: '$unitDoc.course', count: { $sum: 1 } } },
      ]),
      lessonIds.length > 0
        ? Challenge.aggregate([
          { $match: { lesson: { $in: lessonIds } } },
          { $group: { _id: '$lesson', count: { $sum: 1 } } },
        ])
        : [],
      UserProgress.aggregate([
        { $match: { activeCourse: { $in: courseIds } } },
        { $group: { _id: '$activeCourse', count: { $sum: 1 } } },
      ]),
    ]);

    const lessonsByCourse = countMap(lessonRows);
    const learnersByCourse = countMap(learnerRows);
    const challengesByCourse = new Map();
    for (const row of challengeRows) {
      const courseId = lessonCourseMap.get(toId(row._id));
      if (!courseId) continue;
      challengesByCourse.set(courseId, (challengesByCourse.get(courseId) || 0) + (row.count || 0));
    }

    const activeCourseId = toId(progress?.activeCourse);

    return courses.map((course) => {
      const courseId = toId(course._id);
      const lessonCount = lessonsByCourse.get(courseId) || 0;
      const challengeCount = challengesByCourse.get(courseId) || 0;
      const learnersCount = learnersByCourse.get(courseId) || 0;
      const xpReward = (challengeCount * POINTS_PER_CORRECT) + (lessonCount * LESSON_COMPLETION_XP);

      return {
        ...course,
        isCurrentCourse: activeCourseId === courseId,
        learnersCount,
        learnerCount: learnersCount,
        lessonCount,
        challengeCount,
        xpReward,
        stats: {
          learnersCount,
          lessonCount,
          challengeCount,
          xpReward,
        },
      };
    });
  }

  async getCourseById(courseId) {
    const course = await Course.findById(courseId);
    if (!this.isCourseLearnable(course)) {
      throw this.getCourseLockedError();
    }
    return course;
  }

  async selectCourse(userId, courseId) {
    const course = await Course.findById(courseId);
    if (!this.isCourseLearnable(course)) {
      throw this.getCourseLockedError();
    }

    let progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      progress = new UserProgress({ user: userId });
    }
    progress.activeCourse = courseId;
    progress.currentLessonTarget = null;
    await progress.save();
    return progress;
  }

  // Helper to determine if a lesson is locked for a specific user
  async isLessonLocked(userId, lessonId) {
    const lesson = await Lesson.findById(lessonId).populate('unit');
    if (!lesson) return true;

    const course = await this.getCourseForLesson(lesson);
    if (!this.isCourseLearnable(course)) return true;

    const completed = await this.isLessonCompletedForUser(userId, lesson._id);
    if (completed) return false;

    const lessonsInUnit = await Lesson.find({ unit: lesson.unit._id }).sort({ order: 1, _id: 1 });
    const lessonIndex = lessonsInUnit.findIndex((item) => String(item._id) === String(lesson._id));
    if (lessonIndex <= 0) return false;

    const previousLesson = lessonsInUnit[lessonIndex - 1];
    const previousCompleted = await this.isLessonCompletedForUser(userId, previousLesson._id);
    return !previousCompleted;
  }

  // === UNITS ===
  async getUnits(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress?.activeCourse) return [];

    const course = await Course.findById(progress.activeCourse).select('isPublished isActive');
    const courseIsOpen = this.isCourseLearnable(course);

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
        const completed = await this.isLessonCompletedForUser(userId, lesson._id);
        return {
          ...lesson.toObject(),
          challengesCount: challenges.length,
          completedCount,
          completed,
        };
      }));
      return {
        ...unit.toObject(),
        lessons: lessonsWithProgress,
      };
    }));

    for (const unit of unitsWithProgress) {
      unit.lessons = unit.lessons.map((lesson, index, lessons) => {
        const previousLesson = index > 0 ? lessons[index - 1] : null;
        const isSequentiallyLocked = Boolean(previousLesson && !previousLesson.completed && !lesson.completed);
        return {
          ...lesson,
          isLocked: !courseIsOpen || isSequentiallyLocked,
        };
      });
    }

    return unitsWithProgress;
  }

  // === LESSONS ===
  async getLesson(lessonId, userId, context = {}) {
    const lesson = await Lesson.findById(lessonId).populate('unit');
    if (!lesson) throw new Error('Lesson not found');

    const isDailyChallenge = context.mode === 'daily';
    if (isDailyChallenge) {
      await dailyChallengeService.assertActiveChallengeForLesson(lessonId, context.dailyChallengeId);
    }

    // Check if lesson is locked for user
    const isLocked = !isDailyChallenge && await this.isLessonLocked(userId, lessonId);
    if (isLocked) {
      throw new AppError('Bài học đang bị khóa. Hãy hoàn thành các bài học trước đó.', 403);
    }

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
      const challengeOptions = await ChallengeOption.find({ challenge: challenge._id });
      if (challengeOptions && challengeOptions.length > 0) {
        options = challengeOptions.map(opt => opt.toObject());
      } else {
        options = challenge.options || [];
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
      sessionMode: isDailyChallenge ? 'daily' : 'roadmap',
    };
  }

  async getNextLesson(userId) {
    let progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      progress = await UserProgress.create({ user: userId });
    }
    if (!progress?.activeCourse) return null;

    const activeCourse = await Course.findById(progress.activeCourse).select('isPublished isActive');
    if (!this.isCourseLearnable(activeCourse)) return null;

    if (progress.currentLessonTarget) {
      const targetLesson = await Lesson.findById(progress.currentLessonTarget);
      if (targetLesson) {
        const targetCompleted = await this.isLessonCompletedForUser(userId, targetLesson._id);
        const targetLocked = await this.isLessonLocked(userId, targetLesson._id);
        if (!targetCompleted && !targetLocked) {
          const targetUnit = await Unit.findById(targetLesson.unit);
          const targetChallenge = await Challenge.findOne({ lesson: targetLesson._id }).sort({ order: 1 });
          return { lesson: targetLesson, unit: targetUnit, challenge: targetChallenge };
        }
      }
    }

    // Find first incomplete challenge
    const units = await Unit.find({ course: progress.activeCourse }).sort({ order: 1 });
    
    for (const unit of units) {
      const lessons = await Lesson.find({ unit: unit._id }).sort({ order: 1 });
      for (const lesson of lessons) {
        // Course publish state controls whether a lesson can be reached.
        const isLocked = await this.isLessonLocked(userId, lesson._id);
        if (isLocked) continue;
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

  async submitAnswer(userId, challengeId, selectedOptionId, userAnswer, context = {}) {
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    const lesson = await Lesson.findById(challenge.lesson);
    const isDailyChallenge = context.mode === 'daily';
    let dailyChallenge = null;
    if (isDailyChallenge) {
      dailyChallenge = await dailyChallengeService.assertActiveChallengeForLesson(lesson._id, context.dailyChallengeId);
    } else {
      await this.assertCourseLearnableForLesson(lesson);
    }

    // Security check: Make sure user has hearts if it's a non-practice lesson
    const progress = await UserProgress.findOne({ user: userId });
    if (progress && !progress.isPro && progress.hearts <= 0) {
      if (lesson && lesson.type !== 'practice') {
        throw new AppError('Bạn đã hết tim. Vui lòng nạp thêm tim để tiếp tục học.', 403);
      }
    }

    let isCorrect = false;
    const type = challenge.type;

    if (type === 'TYPE' || type === 'TRANSLATE') {
      // Compare typed answer (case-insensitive)
      // Accept either selectedOptionId (from click-select UI) or typed userAnswer
      const normalized = normalizeTypedAnswer(selectedOptionId || userAnswer);
      const normalizedCorrect = normalizeTypedAnswer(challenge.correctAnswer);
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
      const normalized = normalizeTypedAnswer(selectedOptionId || userAnswer);
      let normalizedCorrect = '';
      if (challenge.correctAnswer) {
        normalizedCorrect = normalizeTypedAnswer(challenge.correctAnswer);
      } else if (challenge.options && challenge.options.length > 0) {
        const correctOption = challenge.options.find(o => o.correct);
        if (correctOption) {
          normalizedCorrect = normalizeTypedAnswer(correctOption.text);
        }
      }
      isCorrect = normalized === normalizedCorrect;
    } else {
      // SELECT / ASSIST: multiple choice
      // Options may be embedded in challenge.options or stored in ChallengeOption collection
      let isOptionCorrect = false;
      const challengeOptionsCount = await ChallengeOption.countDocuments({ challenge: challengeId });
      if (challengeOptionsCount > 0) {
        // Separate ChallengeOption collection
        let option;
        if (mongoose.Types.ObjectId.isValid(selectedOptionId)) {
          option = await ChallengeOption.findById(selectedOptionId);
        } else {
          option = await ChallengeOption.findOne({ challenge: challengeId, text: selectedOptionId });
        }
        isOptionCorrect = option?.correct || false;
      } else if (challenge.options && challenge.options.length > 0) {
        // Embedded options (seeder format) - match by _id or by text
        const selected = challenge.options.find(
          (o) =>
            (o._id && String(o._id) === String(selectedOptionId)) ||
            o.text === selectedOptionId
        );
        isOptionCorrect = selected?.correct || false;
      }
      isCorrect = isOptionCorrect;
    }

    if (isDailyChallenge) {
      let dailyScore = null;
      if (isCorrect) {
        dailyScore = await dailyChallengeService.recordCorrectAnswer({
          userId,
          dailyChallenge,
          challengeId,
          xp: POINTS_PER_CORRECT,
        });
      } else {
        dailyScore = await dailyChallengeService.recordWrongAnswer({
          userId,
          dailyChallenge,
          challengeId,
        });
      }

      const excluded = await isExcludedFromXp(userId);
      return {
        isCorrect,
        pointsEarned: (isCorrect && !excluded) ? (dailyScore?.pointsEarned || 0) : 0,
        mode: 'daily',
        dailyScore,
      };
    }

    let pointsEarned = 0;

    // Duplicate protection: only award XP when the first scored attempt is correct.
    if (isCorrect) {
      const existingProgress = await ChallengeProgress.findOne({ user: userId, challenge: challengeId });
      const isFirstCompletion = !existingProgress?.completed;
      const hadWrongAttempt = Boolean(
        (existingProgress?.wrongAttempts || 0) > 0 ||
        existingProgress?.firstAttemptCorrect === false
      );
      const shouldAwardXp = isFirstCompletion && !hadWrongAttempt;

      await ChallengeProgress.findOneAndUpdate(
        { user: userId, challenge: challengeId },
        {
          $setOnInsert: {
            user: userId,
            challenge: challengeId,
            firstAttemptCorrect: !hadWrongAttempt,
          },
          $set: {
            attempted: true,
            completed: true,
            completedAt: new Date(),
            xpAwarded: Boolean(existingProgress?.xpAwarded || shouldAwardXp),
          },
        },
        { upsert: true, new: true }
      );

      if (shouldAwardXp) {
        const excluded = await isExcludedFromXp(userId);
        if (!excluded) {
          pointsEarned = POINTS_PER_CORRECT;

          // Award points (XP) to user progress
          await UserProgress.findOneAndUpdate(
            { user: userId },
            { $inc: { points: POINTS_PER_CORRECT, totalXP: POINTS_PER_CORRECT } }
          );

          // Update quest progress (XP quest)
          questService.updateProgress(userId, { type: 'xp', xpEarned: POINTS_PER_CORRECT }).catch(err =>
            console.error('[Quest] Failed to update XP progress:', err.message)
          );
        }
      }
    } else {
      const existingProgress = await ChallengeProgress.findOne({ user: userId, challenge: challengeId });
      if (!existingProgress?.completed) {
        await ChallengeProgress.findOneAndUpdate(
          { user: userId, challenge: challengeId },
          {
            $setOnInsert: {
              user: userId,
              challenge: challengeId,
              completed: false,
              completedAt: null,
              xpAwarded: false,
            },
            $set: {
              attempted: true,
              firstAttemptCorrect: false,
            },
            $inc: { wrongAttempts: 1 },
          },
          { upsert: true, new: true }
        );
      }
    }

    return { isCorrect, pointsEarned };
  }

  async completeLesson(userId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');
    await this.assertCourseLearnableForLesson(lesson);

    let progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      progress = await UserProgress.create({ user: userId });
    }

    // Determine if this is the first-time completion or a re-do.
    // Use crownsByLesson Map to track per-user completions.
    let isFirstCompletion = true;
    if (progress && progress.crownsByLesson) {
      isFirstCompletion = !progress.crownsByLesson.get(String(lesson._id));
    }

    // ── Mark lesson completed (idempotent — always save) ────────────────────
    lesson.isCompleted = true;
    lesson.completedAt = new Date();
    await lesson.save();

    if (isFirstCompletion) {
      if (!progress.crownsByLesson) {
        progress.crownsByLesson = new Map();
      }
      progress.crownsByLesson.set(String(lesson._id), 1);
      await progress.save();
    }

    // ── Update next lesson target ───────────────────────────────────────────
    const nextTarget = await this.findNextLessonAfter(userId, lesson);
    if (nextTarget) {
      progress.currentLessonTarget = nextTarget._id;
    } else if (progress.activeCourse) {
      const fallbackTarget = await this.findFirstAvailableIncompleteLesson(userId, progress.activeCourse);
      progress.currentLessonTarget = fallbackTarget ? fallbackTarget._id : null;
    } else {
      progress.currentLessonTarget = null;
    }

    // ── Restore 1 heart on practice lessons ─────────────────────────────────
    if (lesson.type === 'practice') {
      await UserProgress.findOneAndUpdate(
        { user: userId },
        { $inc: { hearts: 1 } }
      );
    }

    // ── Streak & first-completion XP bonus (only once per lesson) ───────────
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

      const excluded = await isExcludedFromXp(userId);
      if (isFirstCompletion && !excluded) {
        completionXp = LESSON_COMPLETION_XP;
        progress.points += completionXp;
        progress.totalXP += completionXp;
      }
      await progress.save();
    }

    const excluded = await isExcludedFromXp(userId);
    if (!excluded) {
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
    }

    return { lesson, unitCompleted: false, currentLessonTarget: progress.currentLessonTarget || null };
  }

  async completeDailyChallenge(userId, lessonId, dailyChallengeId = null) {
    const result = await dailyChallengeService.completeChallenge({
      userId,
      lessonId,
      challengeId: dailyChallengeId,
    });

    return {
      ...result,
      mode: 'daily',
      redirectTo: '/duolingo',
    };
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
      currentLessonTarget: progress.currentLessonTarget || null,
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
      return { error: 'insufficient_points', required: POINTS_TO_REFILL, current: progress.points };
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

    const course = await Course.findById(unit.course).select('isPublished isActive');
    if (!this.isCourseLearnable(course)) {
      throw this.getCourseLockedError();
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
