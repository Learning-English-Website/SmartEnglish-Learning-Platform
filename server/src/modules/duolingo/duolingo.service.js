const UserProgress = require('../../models/userProgress.model');
const User = require('../user/user.model');
const Course = require('../../models/course.model');
const Unit = require('../../models/unit.model');
const Lesson = require('../../models/lesson.model');
const Challenge = require('../../models/challenge.model');
const ChallengeOption = require('../../models/challengeOption.model');
const ChallengeProgress = require('../../models/challengeProgress.model');

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

    if (isCorrect) {
      // Save progress
      await ChallengeProgress.findOneAndUpdate(
        { user: userId, challenge: challengeId },
        { user: userId, challenge: challengeId, completed: true, completedAt: new Date() },
        { upsert: true }
      );

      // Award points (XP)
      await UserProgress.findOneAndUpdate(
        { user: userId },
        { $inc: { points: POINTS_PER_CORRECT, totalXP: POINTS_PER_CORRECT } }
      );
    }

    return { isCorrect, pointsEarned: isCorrect ? POINTS_PER_CORRECT : 0 };
  }

  async completeLesson(userId, lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    // Mark lesson as completed
    lesson.isCompleted = true;
    lesson.completedAt = new Date();
    await lesson.save();

    // Unlock next lesson in the same unit
    const nextLesson = await Lesson.findOne({
      unit: lesson.unit,
      order: lesson.order + 1,
    }).sort({ order: 1 });
    if (nextLesson) {
      nextLesson.isLocked = false;
      await nextLesson.save();
    }

    // Check if practice lesson - restore 1 heart
    if (lesson.type === 'practice') {
      await UserProgress.findOneAndUpdate(
        { user: userId },
        { $inc: { hearts: 1 } }
      );
    }

    // Check unit completion
    const unit = await Unit.findById(lesson.unit);
    const unitLessons = await Lesson.find({ unit: unit._id });
    
    // Check if all lessons in the unit are completed
    const allCompleted = unitLessons.length > 0 && unitLessons.every(l => l.isCompleted);
    if (allCompleted) {
      unit.isCompleted = true;
      await unit.save();
    }

    // Update Streak and Award 20 XP Lesson Completion Bonus
    const progress = await UserProgress.findOne({ user: userId });
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
          // Maintaining streak (next day study)
          progress.streak += 1;
          progress.lastStudyDate = new Date();
        } else if (diffDays > 1) {
          // Missed a day: reset streak to 1
          progress.streak = 1;
          progress.lastStudyDate = new Date();
        }
        // If diffDays === 0: already studied today, keep current streak
      }

      // Increment XP / Points
      progress.points += 20; // 20 XP completion bonus
      progress.totalXP += 20;
      await progress.save();
    }

    return { lesson, unitCompleted: unit.isCompleted };
  }

  // === HEARTS & USER PROGRESS ===
  async getUserHearts(userId) {
    let progress = await UserProgress.findOne({ user: userId }).populate('activeCourse');
    if (!progress) {
      progress = await UserProgress.create({ user: userId });
      progress = await progress.populate('activeCourse');
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
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress) return { hearts: 0 };

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
