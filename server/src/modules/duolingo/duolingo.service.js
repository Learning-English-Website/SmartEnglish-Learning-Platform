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
const POINTS_TO_REFILL = 10;

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
      const options = await ChallengeOption.find({ challenge: challenge._id });
      const progress = await ChallengeProgress.findOne({ 
        user: userId, 
        challenge: challenge._id 
      });
      return {
        ...challenge.toObject(),
        options: options.map(opt => opt.toObject()),
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

    // Check if already completed
    const existing = await ChallengeProgress.findOne({ user: userId, challenge: challengeId });
    if (existing?.completed) {
      return { isCorrect: true, alreadyCompleted: true };
    }

    let isCorrect = false;
    
    if (challenge.type === 'TYPE') {
      // Compare typed answer
      isCorrect = userAnswer?.trim().toLowerCase() === challenge.correctAnswer?.trim().toLowerCase();
    } else {
      // Multiple choice
      const option = await ChallengeOption.findById(selectedOptionId);
      isCorrect = option?.correct || false;
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
    // Since unitLessons might have been created dynamically, let's check
    const allCompleted = unitLessons.length > 0 && unitLessons.every(l => l.isCompleted);
    if (allCompleted) {
      unit.isCompleted = true;
      await unit.save();
    }

    return { lesson, unitCompleted: unit.isCompleted };
  }

  // === HEARTS ===
  async getUserHearts(userId) {
    let progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      progress = await UserProgress.create({ user: userId });
    }
    return {
      hearts: progress.hearts,
      maxHearts: progress.isPro ? Infinity : MAX_HEARTS,
      isPro: progress.isPro || false,
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
