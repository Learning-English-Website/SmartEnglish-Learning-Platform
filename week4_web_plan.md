# WEEK 4: WEB APP — Duolingo Course Structure + Quiz System

> **Tech Stack:** React + Vite + Express + MongoDB + Mongoose
> **Reference:** `duolingo-clone` (Next.js + Drizzle + PostgreSQL)
> **Mục tiêu:** Tạo cấu trúc Course → Unit → Lesson → Challenge theo phong cách Duolingo, tích hợp Quiz System với Hearts System, Media Support (audio/image), và Course Selection UI

---

## PHÂN TÍCH SO SÁNH

### SmartEnglish hiện tại có:
| Tính năng | Trạng thái |
|---|---|
| ✅ Flashcard CRUD (Set → Cards) | Hoàn thành |
| ✅ 4 Study Modes (Flashcards, Learn, Test, Match) | Hoàn thành |
| ✅ SM-2 Spaced Repetition | Hoàn thành |
| ✅ Folders & Tags | Hoàn thành |
| ✅ Shared Sets & Community | Hoàn thành |
| ✅ Achievements System | Hoàn thành |
| ✅ Leaderboard | Hoàn thành |
| ✅ XP & Level System | Hoàn thành |
| ✅ Streak System | Hoàn thành |
| ✅ Image Upload | Hoàn thành |
| ✅ Dark Mode | Hoàn thành |

### Duolingo-clone có mà SmartEnglish THIẾU:
| Tính năng | Mô tả |
|---|---|
| ❌ **Course → Unit → Lesson → Challenge** | Cấu trúc bài học theo cấp bậc |
| ❌ **Hearts System** | Mất hearts khi trả lời sai, block khi hết hearts |
| ❌ **Challenge Types** | SELECT (image match) + ASSIST (translation) |
| ❌ **Quiz Lesson Experience** | Giao diện học toàn màn hình, fullscreen |
| ❌ **Practice Mode** | Học lại bài đã hoàn thành để lấy lại hearts |
| ❌ **Keyboard Shortcuts** | Phím 1-9 để chọn đáp án |
| ❌ **AI Voice Audio** | Audio pronunciation cho challenge options |
| ❌ **Confetti Animation** | Hiệu ứng khi hoàn thành bài |
| ❌ **Unit Banner** | Banner xanh cho mỗi unit |
| ❌ **Lesson Path UI** | Đường đi bài học theo cấp bậc |
| ❌ **Course Selection UI** | Chọn ngôn ngữ/khóa học |
| ❌ **Challenge Options Media** | Images + audio trong mỗi option |
| ❌ **Modal System** | Exit modal, Hearts modal, Practice modal |

---

## MỤC TIÊU WEEK 4

```
TUẦN 4 — Integration Plan (7 ngày)

📅 Ngày 1-2: Database Schema (Course, Unit, Lesson, Challenge)
📅 Ngày 3: Backend API + Services
📅 Ngày 4: Frontend - Course Selection & Learn Page
📅 Ngày 5: Frontend - Quiz Lesson System + Hearts
📅 Ngày 6: Media Support (Audio, Images) + Animations
📅 Ngày 7: Polish + Integration Testing
```

---

## 📆 NGÀY 1-2 — Database Schema Migration

### Bổ sung Models mới

#### 1. Tạo `server/src/models/course.model.js` (bổ sung)
```javascript
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },         // "Spanish"
  description: { type: String, default: '' },
  imageSrc: { type: String, default: '/es.svg' }, // flag icon
  language: { type: String, required: true },     // "es"
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
```

#### 2. Tạo `server/src/models/unit.model.js`
```javascript
const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  title: { type: String, required: true },         // "Unit 1"
  description: { type: String, default: '' },      // "Learn the basics"
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  order: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);
```

#### 3. Tạo `server/src/models/lesson.model.js`
```javascript
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },          // "Nouns"
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  order: { type: Number, default: 0 },
  type: { 
    type: String, 
    enum: ['challenge', 'practice'], 
    default: 'challenge' 
  },
  // Practice lessons can be repeated to earn hearts
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
```

#### 4. Tạo `server/src/models/challenge.model.js`
```javascript
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  type: { 
    type: String, 
    enum: ['SELECT', 'ASSIST', 'TYPE'],  // SELECT=image match, ASSIST=translate, TYPE=type answer
    required: true 
  },
  question: { type: String, required: true },
  // For TYPE challenges
  correctAnswer: { type: String, default: null },
  // For SELECT challenges (image-based)
  imageSrc: { type: String, default: null },
  audioSrc: { type: String, default: null },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
```

#### 5. Tạo `server/src/models/challengeOption.model.js`
```javascript
const mongoose = require('mongoose');

const challengeOptionSchema = new mongoose.Schema({
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  text: { type: String, required: true },          // "el hombre"
  correct: { type: Boolean, default: false },
  imageSrc: { type: String, default: null },       // for SELECT type
  audioSrc: { type: String, default: null },      // for SELECT type
}, { timestamps: true });

module.exports = mongoose.model('ChallengeOption', challengeOptionSchema);
```

#### 6. Tạo `server/src/models/challengeProgress.model.js`
```javascript
const mongoose = require('mongoose');

const challengeProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

// Index for fast lookups
challengeProgressSchema.index({ user: 1, challenge: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema);
```

#### 7. Cập nhật `server/src/models/userProgress.model.js`
```javascript
// Thêm fields cho Hearts System
const userProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  activeCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  hearts: { type: Number, default: 5 },             // Max 5 hearts
  maxHearts: { type: Number, default: 5 },
  points: { type: Number, default: 0 },            // XP
  streak: { type: Number, default: 0 },
  lastStudyDate: { type: Date, default: null },
  isPro: { type: Boolean, default: false },        // Pro subscription
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
}, { timestamps: true });
```

#### 8. Tạo `server/src/seeders/duolingo.seeder.js`
```javascript
const seedCourses = async () => {
  const courses = [
    { title: 'Spanish', language: 'es', imageSrc: '/es.svg', difficulty: 'beginner', order: 0 },
    { title: 'French', language: 'fr', imageSrc: '/fr.svg', difficulty: 'beginner', order: 1 },
    { title: 'Italian', language: 'it', imageSrc: '/it.svg', difficulty: 'beginner', order: 2 },
    { title: 'German', language: 'de', imageSrc: '/de.svg', difficulty: 'beginner', order: 3 },
    { title: 'Japanese', language: 'ja', imageSrc: '/ja.svg', difficulty: 'intermediate', order: 4 },
  ];
  
  for (const courseData of courses) {
    await Course.findOneAndUpdate(
      { language: courseData.language },
      courseData,
      { upsert: true, new: true }
    );
  }
};

const seedUnitsAndLessons = async () => {
  const spanish = await Course.findOne({ language: 'es' });
  
  const unit1 = await Unit.create({
    title: 'Unit 1',
    description: 'Learn the basics',
    course: spanish._id,
    order: 0,
  });

  // 5 lessons per unit
  const lessonTitles = ['Nouns', 'Verbs', 'Adjectives', 'Phrases', 'Numbers'];
  for (let i = 0; i < 5; i++) {
    const lesson = await Lesson.create({
      title: lessonTitles[i],
      unit: unit1._id,
      order: i,
    });

    // 4 challenges per lesson
    for (let j = 0; j < 4; j++) {
      const challenge = await Challenge.create({
        lesson: lesson._id,
        type: j % 2 === 0 ? 'SELECT' : 'ASSIST',
        question: `What is the ${lessonTitles[i]} #${j + 1}?`,
        order: j,
      });

      // 4 options per challenge
      const correctOption = await ChallengeOption.create({
        challenge: challenge._id,
        text: `Correct ${lessonTitles[i]} ${j + 1}`,
        correct: true,
      });

      for (let k = 1; k <= 3; k++) {
        await ChallengeOption.create({
          challenge: challenge._id,
          text: `Wrong ${lessonTitles[i]} ${j + 1}-${k}`,
          correct: false,
        });
      }
    }
  }
};
```

### ✅ Deliverable
Tất cả 6 models mới được tạo: Course, Unit, Lesson, Challenge, ChallengeOption, ChallengeProgress. Database schema hoàn chỉnh theo cấu trúc Duolingo.

---

## 📆 NGÀY 3 — Backend API + Services

### Tạo Module Duolingo Course

#### 1. Tạo `server/src/modules/duolingo/duolingo.controller.js`
```javascript
const courseService = require('./duolingo.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');

class DuolingoController {
  // === COURSES ===
  getCourses = asyncHandler(async (req, res) => {
    const courses = await courseService.getCourses();
    res.json(ApiResponse.success(courses));
  });

  getCourse = asyncHandler(async (req, res) => {
    const course = await courseService.getCourseById(req.params.courseId);
    res.json(ApiResponse.success(course));
  });

  selectCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const result = await courseService.selectCourse(req.userId, courseId);
    res.json(ApiResponse.success(result, 'Course selected successfully'));
  });

  // === UNITS ===
  getUnits = asyncHandler(async (req, res) => {
    const units = await courseService.getUnits(req.userId);
    res.json(ApiResponse.success(units));
  });

  // === LESSONS ===
  getLesson = asyncHandler(async (req, res) => {
    const lesson = await courseService.getLesson(req.params.lessonId, req.userId);
    res.json(ApiResponse.success(lesson));
  });

  getNextLesson = asyncHandler(async (req, res) => {
    const lesson = await courseService.getNextLesson(req.userId);
    res.json(ApiResponse.success(lesson));
  });

  // === QUIZ / CHALLENGES ===
  submitAnswer = asyncHandler(async (req, res) => {
    const { challengeId, selectedOptionId, userAnswer } = req.body;
    const result = await courseService.submitAnswer(req.userId, challengeId, selectedOptionId, userAnswer);
    res.json(ApiResponse.success(result));
  });

  completeLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const result = await courseService.completeLesson(req.userId, lessonId);
    res.json(ApiResponse.success(result));
  });

  // === HEARTS ===
  getHearts = asyncHandler(async (req, res) => {
    const hearts = await courseService.getUserHearts(req.userId);
    res.json(ApiResponse.success(hearts));
  });

  refillHearts = asyncHandler(async (req, res) => {
    const result = await courseService.refillHearts(req.userId);
    res.json(ApiResponse.success(result));
  });

  reduceHearts = asyncHandler(async (req, res) => {
    const result = await courseService.reduceHearts(req.userId);
    if (result.error === 'no_hearts') {
      return res.status(403).json(ApiResponse.error('No hearts left'));
    }
    res.json(ApiResponse.success(result));
  });

  // === PRACTICE ===
  practiceLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const result = await courseService.practiceLesson(req.userId, lessonId);
    res.json(ApiResponse.success(result));
  });

  // === LEADERBOARD ===
  getLeaderboard = asyncHandler(async (req, res) => {
    const { type = 'weekly' } = req.query;
    const leaderboard = await courseService.getLeaderboard(type);
    res.json(ApiResponse.success(leaderboard));
  });
}

module.exports = new DuolingoController();
```

#### 2. Tạo `server/src/modules/duolingo/duolingo.service.js`
```javascript
const UserProgress = require('../../models/userProgress.model');
const User = require('../../models/user.model');
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
          completed: completedCount === challenges.length,
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
        const challenges = await Challenge.find({ lesson: lesson._id);
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

    // Save progress
    await ChallengeProgress.findOneAndUpdate(
      { user: userId, challenge: challengeId },
      { user: userId, challenge: challengeId, completed: true, completedAt: new Date() },
      { upsert: true }
    );

    if (isCorrect) {
      // Award points
      await UserProgress.findOneAndUpdate(
        { user: userId },
        { $inc: { points: POINTS_PER_CORRECT } }
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
    const allCompleted = unitLessons.every(l => l.isCompleted);
    if (allCompleted) {
      unit.isCompleted = true;
      await unit.save();
    }

    return { lesson, unitCompleted: unit.isCompleted };
  }

  // === HEARTS ===
  async getUserHearts(userId) {
    const progress = await UserProgress.findOne({ user: userId });
    return {
      hearts: progress?.hearts || 0,
      maxHearts: progress?.isPro ? Infinity : MAX_HEARTS,
      isPro: progress?.isPro || false,
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
      avatar: u.user?.avatar || '/default-avatar.svg',
      points: u.points,
      streak: u.streak || 0,
    }));
  }
}

module.exports = new DuolingoService();
```

#### 3. Tạo `server/src/modules/duolingo/duolingo.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const duolingoController = require('./duolingo.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Courses
router.get('/courses', duolingoController.getCourses);
router.get('/courses/:courseId', duolingoController.getCourse);
router.post('/courses/select', duolingoController.selectCourse);

// Units & Lessons
router.get('/units', duolingoController.getUnits);
router.get('/lessons/:lessonId', duolingoController.getLesson);
router.get('/lessons/next', duolingoController.getNextLesson);
router.post('/lessons/:lessonId/complete', duolingoController.completeLesson);

// Quiz
router.post('/quiz/answer', duolingoController.submitAnswer);

// Hearts
router.get('/hearts', duolingoController.getHearts);
router.post('/hearts/refill', duolingoController.refillHearts);
router.post('/hearts/reduce', duolingoController.reduceHearts);

// Practice
router.post('/lessons/:lessonId/practice', duolingoController.practiceLesson);

// Leaderboard
router.get('/leaderboard', duolingoController.getLeaderboard);

module.exports = router;
```

#### 4. Cập nhật `server/src/app.js`
```javascript
// Thêm route mới
app.use('/api/duolingo', require('./modules/duolingo/duolingo.routes'));
```

### ✅ Deliverable
Backend API hoàn chỉnh: Courses, Units, Lessons, Challenges, Quiz, Hearts, Practice, Leaderboard. Tất cả endpoints RESTful với authentication.

---

## 📆 NGÀY 4 — Frontend: Course Selection + Learn Page

### 1. Tạo `client/src/services/duolingoService.js`
```javascript
import api from '../api/axiosClient';

export const duolingoService = {
  getCourses: () => api.get('/duolingo/courses'),
  selectCourse: (courseId) => api.post('/duolingo/courses/select', { courseId }),
  getUnits: () => api.get('/duolingo/units'),
  getLesson: (lessonId) => api.get(`/duolingo/lessons/${lessonId}`),
  getNextLesson: () => api.get('/duolingo/lessons/next'),
  submitAnswer: (challengeId, selectedOptionId, userAnswer) =>
    api.post('/duolingo/quiz/answer', { challengeId, selectedOptionId, userAnswer }),
  completeLesson: (lessonId) => api.post(`/duolingo/lessons/${lessonId}/complete`),
  practiceLesson: (lessonId) => api.post(`/duolingo/lessons/${lessonId}/practice`),
  getHearts: () => api.get('/duolingo/hearts'),
  refillHearts: () => api.post('/duolingo/hearts/refill'),
  reduceHearts: () => api.post('/duolingo/hearts/reduce'),
  getLeaderboard: (type) => api.get('/duolingo/leaderboard', { params: { type } }),
};
```

### 2. Tạo `client/src/pages/Duolingo/CoursesPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import { duolingoService } from '../../services/duolingoService';
import { useNavigate } from 'react-router-dom';
import './CoursesPage.css';

const COURSE_ICONS = {
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  de: '🇩🇪',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  pt: '🇧🇷',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data } = await duolingoService.getCourses();
      setCourses(data.data);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (courseId) => {
    try {
      await duolingoService.selectCourse(courseId);
      navigate('/duolingo/learn');
    } catch (err) {
      console.error('Failed to select course', err);
    }
  };

  if (loading) {
    return (
      <div className="courses-loading">
        <div className="spinner" />
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="courses-page">
      <div className="courses-header">
        <h1>Choose a language</h1>
        <p>Start your journey to fluency</p>
      </div>
      
      <div className="courses-grid">
        {courses.map((course) => (
          <div
            key={course._id}
            className="course-card"
            onClick={() => handleSelectCourse(course._id)}
          >
            <div className="course-icon">
              {COURSE_ICONS[course.language] || '🌍'}
            </div>
            <div className="course-info">
              <h3>{course.title}</h3>
              <span className={`difficulty ${course.difficulty}`}>
                {course.difficulty}
              </span>
            </div>
            {course.isActive && (
              <div className="active-badge">✓ Active</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Tạo `client/src/pages/Duolingo/LearnPage.jsx`
```javascript
import { useState, useEffect } from 'react';
import { duolingoService } from '../../services/duolingoService';
import { useNavigate } from 'react-router-dom';
import './LearnPage.css';

export default function LearnPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const { data } = await duolingoService.getUnits();
      setUnits(data.data);
    } catch (err) {
      console.error('Failed to load units', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lesson) => {
    if (lesson.completed) {
      // Offer practice mode
      navigate(`/duolingo/lesson/${lesson._id}/practice`);
    } else {
      navigate(`/duolingo/lesson/${lesson._id}`);
    }
  };

  if (loading) {
    return <div className="learn-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="learn-page">
      <div className="learn-header">
        <h1>Learning Spanish</h1>
        <div className="header-stats">
          <div className="stat hearts">
            <span className="icon">❤️</span>
            <span>5/5</span>
          </div>
          <div className="stat xp">
            <span className="icon">⚡</span>
            <span>1,250 XP</span>
          </div>
        </div>
      </div>

      <div className="units-list">
        {units.map((unit, unitIndex) => (
          <div key={unit._id} className="unit-section">
            <div className="unit-banner">
              <span className="unit-number">Unit {unitIndex + 1}</span>
              <h2>{unit.title}</h2>
              <p>{unit.description}</p>
            </div>

            <div className="lessons-grid">
              {unit.lessons.map((lesson, lessonIndex) => (
                <div
                  key={lesson._id}
                  className={`lesson-button ${lesson.completed ? 'completed' : ''} ${lessonIndex === 0 && !lesson.completed ? 'current' : ''}`}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <div className="lesson-progress-ring">
                    {lesson.completed ? (
                      <span className="check">✓</span>
                    ) : (
                      <span className="lesson-number">{lessonIndex + 1}</span>
                    )}
                  </div>
                  <span className="lesson-title">{lesson.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### ✅ Deliverable
Course Selection page và Learn Page với Unit Banner và Lesson Path UI. Kế thừa từ `duolingo-clone/app/(main)/courses/` và `duolingo-clone/app/(main)/learn/`.

---

## 📆 NGÀY 5 — Frontend: Quiz Lesson System + Hearts

### 1. Tạo `client/src/pages/Duolingo/LessonPage.jsx`
```javascript
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { duolingoService } from '../../services/duolingoService';
import { useHeartsModal } from '../../context/HeartsModalContext';
import Confetti from 'react-confetti';
import './LessonPage.css';

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { open: openHeartsModal } = useHeartsModal();

  const [lesson, setLesson] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [status, setStatus] = useState('idle'); // idle | correct | wrong | complete
  const [hearts, setHearts] = useState(5);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadLesson();
    loadHearts();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const { data } = await duolingoService.getLesson(lessonId);
      setLesson(data.data);
    } catch (err) {
      console.error('Failed to load lesson', err);
    }
  };

  const loadHearts = async () => {
    try {
      const { data } = await duolingoService.getHearts();
      setHearts(data.data.hearts);
    } catch (err) {
      console.error('Failed to load hearts', err);
    }
  };

  const currentChallenge = lesson?.challenges?.[currentIndex];
  const progress = lesson ? ((currentIndex + 1) / lesson.totalChallenges) * 100 : 0;

  const handleOptionSelect = useCallback(async (optionId) => {
    if (status !== 'idle') return;
    setSelectedOption(optionId);

    try {
      const { data } = await duolingoService.submitAnswer(
        currentChallenge._id,
        optionId,
        null
      );

      if (data.data.isCorrect) {
        setStatus('correct');
        setTimeout(() => {
          nextChallenge();
        }, 1000);
      } else {
        setStatus('wrong');
        // Reduce hearts
        const heartsResult = await duolingoService.reduceHearts();
        if (heartsResult.data.error === 'no_hearts') {
          openHeartsModal();
        } else {
          setHearts(heartsResult.data.hearts);
        }
        setTimeout(() => {
          setStatus('idle');
          setSelectedOption(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Submit failed', err);
    }
  }, [currentChallenge, status]);

  // Keyboard shortcuts (1-9 for options, Enter to continue)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (status !== 'idle') return;
      
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const option = currentChallenge?.options[num - 1];
        if (option) handleOptionSelect(option._id);
      }
      if (e.key === 'Enter' && selectedOption) {
        // Submit selected
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChallenge, selectedOption, status]);

  const nextChallenge = () => {
    setSelectedOption(null);
    setStatus('idle');
    if (currentIndex < lesson.totalChallenges - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    try {
      await duolingoService.completeLesson(lessonId);
      setStatus('complete');
      setShowConfetti(true);
      setTimeout(() => {
        navigate('/duolingo/learn');
      }, 2000);
    } catch (err) {
      console.error('Complete lesson failed', err);
    }
  };

  if (!lesson) {
    return <div className="lesson-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="lesson-page">
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="lesson-header">
        <button className="exit-btn" onClick={() => navigate('/duolingo/learn')}>
          ✕
        </button>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="hearts-display">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`heart ${i < hearts ? 'active' : 'empty'}`}>
              ❤️
            </span>
          ))}
        </div>
      </header>

      {/* Challenge Area */}
      <main className="lesson-content">
        {currentChallenge?.type === 'SELECT' ? (
          <div className="select-challenge">
            <div className="challenge-question">
              {currentChallenge.imageSrc && (
                <img src={currentChallenge.imageSrc} alt="Question" />
              )}
              {currentChallenge.audioSrc && (
                <button className="play-audio">🔊</button>
              )}
              <p>{currentChallenge.question}</p>
            </div>
            <div className="options-grid">
              {currentChallenge.options.map((option, index) => (
                <button
                  key={option._id}
                  className={`option-card ${selectedOption === option._id ? 'selected' : ''} ${status === 'correct' && option.correct ? 'correct' : ''} ${status === 'wrong' && selectedOption === option._id ? 'wrong' : ''}`}
                  onClick={() => handleOptionSelect(option._id)}
                  disabled={status !== 'idle'}
                >
                  {option.imageSrc ? (
                    <img src={option.imageSrc} alt={option.text} />
                  ) : (
                    <span className="option-text">{option.text}</span>
                  )}
                  <span className="keyboard-hint">{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="assist-challenge">
            <div className="question-bubble">
              <img src="/mascot.svg" alt="Mascot" className="mascot" />
              <div className="bubble">{currentChallenge?.question}</div>
            </div>
            <div className="options-list">
              {currentChallenge?.options.map((option, index) => (
                <button
                  key={option._id}
                  className={`option-item ${selectedOption === option._id ? 'selected' : ''} ${status === 'correct' && option.correct ? 'correct' : ''} ${status === 'wrong' && selectedOption === option._id ? 'wrong' : ''}`}
                  onClick={() => handleOptionSelect(option._id)}
                  disabled={status !== 'idle'}
                >
                  <span className="keyboard-hint">{index + 1}</span>
                  <span className="option-text">{option.text}</span>
                  {status !== 'idle' && option.correct && <span className="check">✓</span>}
                  {status === 'wrong' && selectedOption === option._id && <span className="x">✗</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="lesson-footer">
        {status === 'correct' && (
          <div className="feedback correct">
            <span className="icon">✨</span>
            <span>Correct! +10 XP</span>
          </div>
        )}
        {status === 'wrong' && (
          <div className="feedback wrong">
            <span className="icon">💔</span>
            <span>Incorrect</span>
          </div>
        )}
        {status === 'complete' && (
          <div className="result-card">
            <h2>Lesson Complete!</h2>
            <p>You earned 40 XP</p>
            <button onClick={() => navigate('/duolingo/learn')}>Continue</button>
          </div>
        )}
      </footer>
    </div>
  );
}
```

### 2. Tạo `client/src/components/duolingo/ExitModal.jsx`
```javascript
export default function ExitModal({ isOpen, onClose, onContinue }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content exit-modal">
        <img src="/mascot-sad.svg" alt="Mascot" className="mascot" />
        <h2>Wait, don't go!</h2>
        <p>You haven't finished this lesson yet.</p>
        <p>Are you sure you want to leave?</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onContinue}>
            Keep Going
          </button>
          <button className="btn-danger" onClick={onClose}>
            Exit Lesson
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Tạo `client/src/components/duolingo/HeartsModal.jsx`
```javascript
export default function HeartsModal({ isOpen, onClose, onRefill }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content hearts-modal">
        <img src="/mascot-broken.svg" alt="Mascot" className="mascot" />
        <h2>Out of Hearts!</h2>
        <p>You ran out of hearts. You can't start new lessons without hearts.</p>
        <div className="hearts-options">
          <button className="btn-primary" onClick={onRefill}>
            🩷 Refill Hearts (10 XP)
          </button>
          <button className="btn-pro" onClick={onClose}>
            ⭐ Upgrade to Pro (Unlimited Hearts)
          </button>
        </div>
        <button className="btn-text" onClick={onClose}>
          Practice to earn hearts
        </button>
      </div>
    </div>
  );
}
```

### 4. Cập nhật `client/src/routes.jsx`
```javascript
// Thêm routes mới
<Route path="/duolingo/courses" element={<CoursesPage />} />
<Route path="/duolingo/learn" element={<LearnPage />} />
<Route path="/duolingo/lesson/:lessonId" element={<LessonPage />} />
<Route path="/duolingo/lesson/:lessonId/practice" element={<LessonPage isPractice />} />
```

### ✅ Deliverable
Quiz Lesson System hoàn chỉnh với Hearts System, Keyboard Shortcuts, Confetti, và tất cả 3 challenge types (SELECT, ASSIST, TYPE).

---

## 📆 NGÀY 6 — Media Support + Animations

### 1. Cập nhật `CardEditor` để hỗ trợ Audio
```javascript
// client/src/components/flashcard/CardEditor/CardEditor.jsx
// Thêm:
// - Audio file upload cho mỗi option
// - Speech synthesis preview (Web Speech API)
```

### 2. Tạo `client/src/components/duolingo/AudioPlayer.jsx`
```javascript
export default function AudioPlayer({ src, autoPlay = false }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play();
    }
  }, [autoPlay, src]);

  return (
    <audio ref={audioRef} src={src} preload="auto">
      Your browser does not support audio.
    </audio>
  );
}
```

### 3. Tạo `client/src/components/duolingo/ImageChallenge.jsx`
```javascript
// Challenge với images thay vì text
export default function ImageChallenge({ challenge, onSelect }) {
  return (
    <div className="image-challenge">
      <div className="challenge-prompt">
        <p>{challenge.question}</p>
        {challenge.audioSrc && (
          <button className="play-btn" onClick={() => playAudio(challenge.audioSrc)}>
            🔊
          </button>
        )}
      </div>
      <div className="image-grid">
        {challenge.options.map((option) => (
          <button
            key={option._id}
            className="image-option"
            onClick={() => onSelect(option._id)}
          >
            <img src={option.imageSrc} alt={option.text} />
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 4. Cập nhật Challenge Model để lưu Audio
```javascript
// server/src/models/challenge.model.js
challengeSchema.add({
  audioSrc: { type: String, default: null },      // AI voice file URL
});

// server/src/models/challengeOption.model.js
challengeOptionSchema.add({
  audioSrc: { type: String, default: null },       // Option audio (for SELECT)
});
```

### 5. Tích hợp `react-confetti` vào LessonPage
```javascript
import Confetti from 'react-confetti';

const [showConfetti, setShowConfetti] = useState(false);
// On lesson complete:
setShowConfetti(true);
setTimeout(() => setShowConfetti(false), 5000);
```

### ✅ Deliverable
Media support hoàn chỉnh: images + audio trong challenges. Animations (confetti) khi hoàn thành bài. Speech synthesis cho pronunciation.

---

## 📆 NGÀY 7 — Polish + Integration Testing

### Tasks
- [ ] Kiểm tra tất cả challenge types hoạt động (SELECT, ASSIST, TYPE)
- [ ] Test keyboard shortcuts (1-9, Enter)
- [ ] Test hearts system (reduce, refill, block)
- [ ] Test progress tracking (lessons completed)
- [ ] Responsive design cho mobile
- [ ] E2E test: Complete a full lesson
- [ ] Fix any bugs found

### Integration với SmartEnglish hiện tại
```
┌─────────────────────────────────────────────────────────────┐
│                    SMARTENGLISH APP                        │
├─────────────────────────────────────────────────────────────┤
│  Quizlet Mode (Tuần 2-3)        │  Duolingo Mode (Tuần 4)  │
│  ─────────────────────         │  ───────────────────     │
│  Set → Cards → Study           │  Course → Unit → Lesson   │
│  Flashcards/Test/Match         │  → Challenge → Options    │
│  SM-2 Spaced Repetition        │  Hearts System            │
│  Folders/Tags/Share            │  XP/Leaderboard           │
│  Achievements/Streaks          │  Practice Mode            │
│                                │                           │
│  ┌──────────────────────┐     │  ┌──────────────────────┐ │
│  │ Quizlet Navbar       │     │  │ Duolingo Navbar      │ │
│  │ Dashboard | My Sets  │     │  │ Learn | Leaderboard   │ │
│  └──────────────────────┘     │  └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    SHARED FEATURES                          │
│  ✅ Auth (JWT/Google OAuth)    ✅ Notifications              │
│  ✅ Gamification (XP/Streaks)  ✅ Dark Mode                  │
│  ✅ Achievements System        ✅ Settings                   │
│  ✅ User Profile               ✅ Mobile Responsive          │
└─────────────────────────────────────────────────────────────┘
```

### Cập nhật Navigation
```javascript
// client/src/components/Layout/Layout.jsx
// Thêm Duolingo mode vào navigation
const NAV_ITEMS = [
  // Quizlet Mode
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/sets', label: 'My Sets', icon: '📚' },
  { path: '/explore', label: 'Explore', icon: '🔍' },
  // Duolingo Mode
  { path: '/duolingo/courses', label: 'Courses', icon: '🌍' },
  { path: '/duolingo/learn', label: 'Learn', icon: '📖' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
];
```

### ✅ Deliverable
Week 4 hoàn chỉnh. SmartEnglish có đầy đủ cả 2 chế độ: Quizlet Mode (Tuần 2-3) và Duolingo Mode (Tuần 4).

---

## 📋 Week 4 Checklist

| # | Checkpoint | Status |
|---|---|---|
| 1 | Database: Course, Unit, Lesson, Challenge models | ⬜ |
| 2 | Database: ChallengeOption, ChallengeProgress models | ⬜ |
| 3 | Backend: duolingo.controller.js | ⬜ |
| 4 | Backend: duolingo.service.js (SM-2 logic) | ⬜ |
| 5 | Backend: duolingo.routes.js | ⬜ |
| 6 | Backend: duolingo.seeder.js | ⬜ |
| 7 | Frontend: duolingoService.js | ⬜ |
| 8 | Frontend: CoursesPage.jsx | ⬜ |
| 9 | Frontend: LearnPage.jsx (Unit Banner + Lesson Path) | ⬜ |
| 10 | Frontend: LessonPage.jsx (Quiz + Hearts + Keyboard) | ⬜ |
| 11 | Frontend: ExitModal.jsx | ⬜ |
| 12 | Frontend: HeartsModal.jsx | ⬜ |
| 13 | Frontend: Practice Modal | ⬜ |
| 14 | Media: Audio upload & playback | ⬜ |
| 15 | Media: Image challenge support | ⃝ |
| 16 | Animations: Confetti, feedback | ⬜ |
| 17 | Integration: Routes & Navigation | ⬜ |
| 18 | Testing: E2E test lesson flow | ⬜ |
| 19 | Testing: Hearts system test | ⬜ |

---

## 🎯 Reference Code Locations

| Feature | Source in duolingo-clone |
|---|---|
| Course selection | `app/(main)/courses/page.tsx`, `courses/card.tsx` |
| Learn page | `app/(main)/learn/page.tsx`, `unit.tsx`, `lesson-button.tsx` |
| Quiz lesson | `app/lesson/[lessonId]/page.tsx`, `quiz.tsx`, `challenge.tsx` |
| Hearts modal | `components/modals/hearts-modal.tsx` |
| Exit modal | `components/modals/exit-modal.tsx` |
| Challenge card | `app/lesson/card.tsx` |
| DB schema | `db/schema.ts` |
| Server actions | `actions/user-progress.ts`, `actions/challenge-progress.ts` |

---

## ✅ Week 4 Deliverables

### Database (6 new models)
- Course, Unit, Lesson, Challenge, ChallengeOption, ChallengeProgress
- Seed data: 5 courses, 1 unit per course, 5 lessons per unit, 4 challenges per lesson

### Backend (3 new files + routes)
- `duolingo.controller.js` - 12 endpoints
- `duolingo.service.js` - Business logic (quiz, hearts, XP)
- `duolingo.routes.js` - REST API routes
- `duolingo.seeder.js` - Seed data

### Frontend (6 new pages/components)
- `CoursesPage.jsx` - Language course selection
- `LearnPage.jsx` - Unit/Lesson path UI
- `LessonPage.jsx` - Full quiz experience
- `ExitModal.jsx` - Leave lesson confirmation
- `HeartsModal.jsx` - Out of hearts upsell
- `PracticeModal.jsx` - Practice mode info

### Features
- 3 Challenge Types: SELECT (image), ASSIST (translate), TYPE (type answer)
- Hearts System: 5 hearts, lose on wrong, refill with XP
- XP System: +10 per correct answer
- Keyboard Shortcuts: 1-9 to select, Enter to continue
- Confetti animation on completion
- Media support: Images + Audio
- Practice Mode: Re-do completed lessons for hearts
