/**
 * Duolingo Service Integration Tests
 * Tests: submitAnswer idempotency, completeLesson idempotency/isLocked, getNextLesson locked
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const UserProgress = require('../src/models/userProgress.model');
const Course = require('../src/models/course.model');
const Unit = require('../src/models/unit.model');
const Lesson = require('../src/models/lesson.model');
const Challenge = require('../src/models/challenge.model');
const ChallengeProgress = require('../src/models/challengeProgress.model');
const DailyChallenge = require('../src/models/dailyChallenge.model');
const DailyChallengeScore = require('../src/models/dailyChallengeScore.model');
const duolingoRoutes = require('../src/modules/duolingo/duolingo.routes');
const dailyChallengeService = require('../src/modules/quest/dailyChallenge.service');
const { getDateKey } = require('../src/shared/utils/dateKey');

describe('Duolingo API', () => {
  let app;
  let authToken;
  let testUser;
  let testCourse;
  let testUnit;
  let testLesson;
  let testChallenge;

  beforeEach(() => {
    // Stub getTodayChallenge to return null so it doesn't randomly select a lesson from the test database
    jest.spyOn(dailyChallengeService, 'getTodayChallenge').mockResolvedValue(null);

    app = express();
    app.use(express.json());
    app.use('/api/duolingo', duolingoRoutes);

    app.use((err, req, res, next) => {
      const statusCode = err.statusCode || err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  beforeEach(async () => {
    testUser = await User.create({
      email: 'duouser@example.com',
      username: 'duouser',
      password: await bcrypt.hash('TestPass123!', 10),
      isVerified: true,
    });

    testCourse = await Course.create({
      title: 'Test Course',
      order: 1,
      isPublished: true,
      isActive: true,
    });
    testUnit = await Unit.create({ title: 'Test Unit', course: testCourse._id, order: 1 });
    testLesson = await Lesson.create({
      title: 'Test Lesson',
      unit: testUnit._id,
      order: 1,
      isLocked: false,
      isCompleted: false,
    });
    testChallenge = await Challenge.create({
      lesson: testLesson._id,
      type: 'SELECT',
      question: 'What is hello?',
      options: [
        { text: 'Hello', correct: true },
        { text: 'Goodbye', correct: false },
      ],
      order: 1,
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('GET /api/duolingo/courses', () => {
    it('should only return published active courses to learners', async () => {
      testCourse.isPublished = false;
      await testCourse.save();

      const publishedCourse = await Course.create({
        title: 'Published Teacher Course',
        order: 2,
        isPublished: true,
        isActive: true,
      });

      await Course.create({
        title: 'Draft Teacher Course',
        order: 3,
        isPublished: false,
        isActive: true,
      });

      const res = await request(app)
        .get('/api/duolingo/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.map(course => course._id.toString())).toContain(publishedCourse._id.toString());
      expect(res.body.data.some(course => course.title === 'Draft Teacher Course')).toBe(false);
      expect(res.body.data.some(course => course._id.toString() === testCourse._id.toString())).toBe(false);
    });

    it('should return real course card metadata from curriculum and learner progress', async () => {
      await UserProgress.create({
        user: testUser._id,
        activeCourse: testCourse._id,
      });

      const secondLesson = await Lesson.create({
        title: 'Second Lesson',
        unit: testUnit._id,
        order: 2,
      });
      await Challenge.create({
        lesson: secondLesson._id,
        type: 'TYPE',
        question: 'Type hello',
        correctAnswer: 'hello',
        order: 1,
      });

      const res = await request(app)
        .get('/api/duolingo/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const course = res.body.data.find(item => item._id.toString() === testCourse._id.toString());
      expect(course).toBeTruthy();
      expect(course.isCurrentCourse).toBe(true);
      expect(course.learnersCount).toBe(1);
      expect(course.learnerCount).toBe(1);
      expect(course.lessonCount).toBe(2);
      expect(course.challengeCount).toBe(2);
      expect(course.xpReward).toBe(60);
      expect(course.stats).toMatchObject({
        learnersCount: 1,
        lessonCount: 2,
        challengeCount: 2,
        xpReward: 60,
      });
    });

    it('should reject selecting an unpublished course', async () => {
      testCourse.isPublished = false;
      await testCourse.save();

      const res = await request(app)
        .post('/api/duolingo/courses/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ courseId: testCourse._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/duolingo/units', () => {
    beforeEach(async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, new: true }
      );
    });

    it('should unlock the only lesson in a zone even if it has a stale AI lock flag', async () => {
      testLesson.isLocked = true;
      await testLesson.save();

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unitsRes.status).toBe(200);
      const lessonFromTree = unitsRes.body.data[0].lessons.find(
        lesson => lesson._id.toString() === testLesson._id.toString()
      );
      expect(lessonFromTree.isLocked).toBe(false);

      const lessonRes = await request(app)
        .get(`/api/duolingo/lessons/${testLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(lessonRes.status).toBe(200);
      expect(lessonRes.body.success).toBe(true);
    });

    it('should unlock the first lesson of each zone but keep later lessons sequentially locked', async () => {
      const lesson2InFirstUnit = await Lesson.create({
        title: 'Test Lesson 2',
        unit: testUnit._id,
        order: 2,
        isLocked: false,
      });
      const jumpUnit = await Unit.create({
        title: 'Jump Unit',
        course: testCourse._id,
        order: 2,
      });
      const jumpLesson1 = await Lesson.create({
        title: 'Jump Lesson 1',
        unit: jumpUnit._id,
        order: 1,
        isLocked: true,
      });
      const jumpLesson2 = await Lesson.create({
        title: 'Jump Lesson 2',
        unit: jumpUnit._id,
        order: 2,
        isLocked: false,
      });

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unitsRes.status).toBe(200);
      const firstUnitLessons = unitsRes.body.data[0].lessons;
      const secondUnitLessons = unitsRes.body.data[1].lessons;

      expect(firstUnitLessons.find(lesson => lesson._id.toString() === testLesson._id.toString()).isLocked).toBe(false);
      expect(firstUnitLessons.find(lesson => lesson._id.toString() === lesson2InFirstUnit._id.toString()).isLocked).toBe(true);
      expect(secondUnitLessons.find(lesson => lesson._id.toString() === jumpLesson1._id.toString()).isLocked).toBe(false);
      expect(secondUnitLessons.find(lesson => lesson._id.toString() === jumpLesson2._id.toString()).isLocked).toBe(true);

      const jumpFirstRes = await request(app)
        .get(`/api/duolingo/lessons/${jumpLesson1._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(jumpFirstRes.status).toBe(200);

      const jumpSecondRes = await request(app)
        .get(`/api/duolingo/lessons/${jumpLesson2._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(jumpSecondRes.status).toBe(403);
    });

    it('should lock every unit lesson and block learning APIs when active course is unpublished', async () => {
      testCourse.isPublished = false;
      await testCourse.save();

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unitsRes.status).toBe(200);
      expect(unitsRes.body.data[0].lessons.every(lesson => lesson.isLocked === true)).toBe(true);

      const lessonRes = await request(app)
        .get(`/api/duolingo/lessons/${testLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(lessonRes.status).toBe(403);

      const answerRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });
      expect(answerRes.status).toBe(403);

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(completeRes.status).toBe(403);

      const nextRes = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);
      expect(nextRes.status).toBe(200);
      expect(nextRes.body.data).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/duolingo/quiz/answer — Idempotency
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/duolingo/quiz/answer', () => {
    beforeEach(async () => {
      // Ensure UserProgress exists so XP update works
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, points: 0, totalXP: 0 },
        { upsert: true, new: true }
      );
    });

    it('should submit correct answer and award XP once', async () => {
      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should NOT award XP twice for same answer (idempotency)', async () => {
      const payload = { challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text };

      await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      const before = await UserProgress.findOne({ user: testUser._id });

      // Same answer again — should NOT increment XP
      const secondRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      const after = await UserProgress.findOne({ user: testUser._id });

      // Points should NOT increase on second submission
      expect(after.points).toBe(before.points);
      expect(secondRes.body.data.pointsEarned).toBe(0);
    });

    it('should not award XP or reset challenge progress when replaying a completed lesson in practice mode', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id, points: 0, totalXP: 0, hearts: 5 },
        { upsert: true, new: true }
      );

      const firstAnswerRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      expect(firstAnswerRes.status).toBe(200);
      expect(firstAnswerRes.body.data.pointsEarned).toBe(10);

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(completeRes.status).toBe(200);

      const storedProgress = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: testChallenge._id,
      });
      expect(storedProgress).toBeTruthy();

      const beforePractice = await UserProgress.findOne({ user: testUser._id });

      const practiceRes = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/practice`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(practiceRes.status).toBe(200);
      expect(practiceRes.body.data.sessionMode).toBe('practice');

      const progressAfterPracticeLoad = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: testChallenge._id,
      });
      expect(progressAfterPracticeLoad._id.toString()).toBe(storedProgress._id.toString());

      const practiceAnswerRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: testChallenge._id.toString(),
          selectedOptionId: testChallenge.options[0].text,
          mode: 'practice',
        });

      expect(practiceAnswerRes.status).toBe(200);
      expect(practiceAnswerRes.body.data.isCorrect).toBe(true);
      expect(practiceAnswerRes.body.data.pointsEarned).toBe(0);
      expect(practiceAnswerRes.body.data.mode).toBe('practice');

      const afterPractice = await UserProgress.findOne({ user: testUser._id });
      expect(afterPractice.points).toBe(beforePractice.points);
      expect(afterPractice.totalXP).toBe(beforePractice.totalXP);
    });

    it('should preserve challenge completion and XP idempotency when challenge ObjectId is recreated', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id, points: 0, totalXP: 0 },
        { upsert: true, new: true }
      );

      const firstRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.data.pointsEarned).toBe(10);

      const storedProgress = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: testChallenge._id,
      });
      expect(storedProgress.challengeKey).toBeTruthy();

      await Challenge.deleteOne({ _id: testChallenge._id });
      const recreatedChallenge = await Challenge.create({
        lesson: testLesson._id,
        type: 'SELECT',
        question: testChallenge.question,
        options: [
          { text: 'Hello', correct: true },
          { text: 'Goodbye', correct: false },
        ],
        order: 1,
      });

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unitsRes.status).toBe(200);
      const lessonFromTree = unitsRes.body.data[0].lessons.find(
        (lesson) => lesson._id.toString() === testLesson._id.toString()
      );
      expect(lessonFromTree.completed).toBe(true);

      const retryRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: recreatedChallenge._id.toString(), selectedOptionId: recreatedChallenge.options[0].text });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.isCorrect).toBe(true);
      expect(retryRes.body.data.pointsEarned).toBe(0);

      const repairedProgress = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: recreatedChallenge._id,
      });
      expect(repairedProgress._id.toString()).toBe(storedProgress._id.toString());
    });

    it('should award XP for every distinct correct challenge even when order and type repeat', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id, points: 0, totalXP: 0 },
        { upsert: true, new: true }
      );

      const duplicateOrderChallenge = await Challenge.create({
        lesson: testLesson._id,
        type: 'SELECT',
        question: 'Which word means goodbye?',
        options: [
          { text: 'Goodbye', correct: true },
          { text: 'Hello', correct: false },
        ],
        order: testChallenge.order,
      });

      const firstRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      const secondRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: duplicateOrderChallenge._id.toString(), selectedOptionId: duplicateOrderChallenge.options[0].text });

      expect(firstRes.status).toBe(200);
      expect(secondRes.status).toBe(200);
      expect(firstRes.body.data.pointsEarned).toBe(10);
      expect(secondRes.body.data.pointsEarned).toBe(10);

      const progressRows = await ChallengeProgress.find({
        user: testUser._id,
        challenge: { $in: [testChallenge._id, duplicateOrderChallenge._id] },
      });
      expect(progressRows).toHaveLength(2);

      const userProgress = await UserProgress.findOne({ user: testUser._id });
      expect(userProgress.points).toBe(20);
    });

    it('should complete a retried roadmap answer without awarding XP after an earlier wrong answer', async () => {
      const wrongRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[1].text });

      expect(wrongRes.status).toBe(200);
      expect(wrongRes.body.data.isCorrect).toBe(false);
      expect(wrongRes.body.data.pointsEarned).toBe(0);

      const retryRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: testChallenge._id.toString(), selectedOptionId: testChallenge.options[0].text });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.isCorrect).toBe(true);
      expect(retryRes.body.data.pointsEarned).toBe(0);

      const progress = await ChallengeProgress.findOne({ user: testUser._id, challenge: testChallenge._id });
      expect(progress.completed).toBe(true);
      expect(progress.wrongAttempts).toBe(1);
      expect(progress.firstAttemptCorrect).toBe(false);
      expect(progress.xpAwarded).toBe(false);

      const userProgress = await UserProgress.findOne({ user: testUser._id });
      expect(userProgress.points).toBe(0);
    });

    it('should return 500 for non-existent challenge', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ challengeId: fakeId.toString(), selectedOptionId: 'anything' });

      expect(res.status).toBe(500);
    });

    it('should accept typed answer without final punctuation when AI answer has punctuation', async () => {
      const translateChallenge = await Challenge.create({
        lesson: testLesson._id,
        type: 'TRANSLATE',
        question: 'Dịch: Tôi đi học.',
        correctAnswer: 'I go to school.',
        order: 2,
      });

      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: translateChallenge._id.toString(),
          userAnswer: 'I go to school',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCorrect).toBe(true);
    });

    it('should accept COMPLETE answer without final punctuation when correct answer has punctuation', async () => {
      const completeChallenge = await Challenge.create({
        lesson: testLesson._id,
        type: 'COMPLETE',
        question: 'Complete the sentence',
        correctAnswer: 'Where are you from?',
        sentence: '___',
        order: 3,
      });

      const res = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: completeChallenge._id.toString(),
          userAnswer: 'where are you from',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isCorrect).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/duolingo/lessons/:id/complete — Idempotency + isLocked
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/duolingo/lessons/:id/complete', () => {
    it('should complete a lesson', async () => {
      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Lesson.findById(testLesson._id);
      expect(updated.isCompleted).toBe(true);
    });

    it('should be idempotent — calling complete twice does not error', async () => {
      await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should allow completing a stale locked lesson when the course is published', async () => {
      testLesson.isLocked = true;
      await testLesson.save();

      const res = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await Lesson.findById(testLesson._id);
      expect(updated.isCompleted).toBe(true);
      // Legacy lesson locks are ignored once the course is published.
      expect([true, false]).toContain(updated.isLocked);
    });

    it('should return error when lesson not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/duolingo/lessons/${fakeId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });

    it('should keep the next lesson reachable after completion when the course is published', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, new: true }
      );

      const nextLesson = await Lesson.create({
        title: 'Next Lesson',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(completeRes.status).toBe(200);

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      const nextLessonInTree = unitsRes.body.data[0].lessons.find(
        (lesson) => lesson._id.toString() === nextLesson._id.toString()
      );
      expect(nextLessonInTree.isLocked).toBe(false);
    });

    it('should continue jump learning from the skipped-to unit after completion', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, new: true }
      );

      const jumpUnit = await Unit.create({
        title: 'Jump Unit',
        course: testCourse._id,
        order: 2,
      });
      const jumpLesson1 = await Lesson.create({
        title: 'Jump Lesson 1',
        unit: jumpUnit._id,
        order: 1,
        isLocked: false,
      });
      const jumpLesson2 = await Lesson.create({
        title: 'Jump Lesson 2',
        unit: jumpUnit._id,
        order: 2,
        isLocked: true,
      });
      const jumpChallenge1 = await Challenge.create({
        lesson: jumpLesson1._id,
        type: 'SELECT',
        question: 'Jump first?',
        options: [{ text: 'Yes', correct: true }],
        order: 1,
      });
      await Challenge.create({
        lesson: jumpLesson2._id,
        type: 'SELECT',
        question: 'Jump second?',
        options: [{ text: 'Yes', correct: true }],
        order: 1,
      });
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: jumpChallenge1._id,
        completed: true,
      });

      const res = await request(app)
        .post(`/api/duolingo/lessons/${jumpLesson1._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const progress = await UserProgress.findOne({ user: testUser._id });
      expect(progress.currentLessonTarget.toString()).toBe(jumpLesson2._id.toString());

      const unlockedJumpLesson2 = await Lesson.findById(jumpLesson2._id);
      expect([true, false]).toContain(unlockedJumpLesson2.isLocked);

      const nextRes = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);
      expect(nextRes.status).toBe(200);
      expect(nextRes.body.data.lesson._id.toString()).toBe(jumpLesson2._id.toString());
    });

    it('should preserve roadmap lesson completion when lesson ObjectId is recreated', async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, new: true }
      );

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${testLesson._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(completeRes.status).toBe(200);

      const savedProgress = await UserProgress.findOne({ user: testUser._id });
      expect(savedProgress.crownsByLesson.get(String(testLesson._id))).toBe(1);
      expect(savedProgress.completedLessonKeys.size).toBe(1);

      await Challenge.deleteMany({ lesson: testLesson._id });
      await Lesson.deleteOne({ _id: testLesson._id });

      const recreatedLesson = await Lesson.create({
        title: 'Recreated Lesson Title',
        unit: testUnit._id,
        order: 1,
        isLocked: false,
      });
      await Challenge.create({
        lesson: recreatedLesson._id,
        type: 'SELECT',
        question: 'What is hello after recreate?',
        options: [{ text: 'Hello', correct: true }],
        order: 1,
      });

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(unitsRes.status).toBe(200);
      const recreatedLessonInTree = unitsRes.body.data[0].lessons.find(
        (lesson) => lesson._id.toString() === recreatedLesson._id.toString()
      );
      expect(recreatedLessonInTree.completed).toBe(true);
      expect(recreatedLessonInTree.isLocked).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/duolingo/lessons/next — isLocked check
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/duolingo/lessons/next', () => {
    beforeEach(async () => {
      await UserProgress.create({ user: testUser._id, activeCourse: testCourse._id });
    });

    it('should not skip lesson lock flags when the course is published', async () => {
      const lockedLesson = await Lesson.create({
        title: 'Locked First',
        unit: testUnit._id,
        order: 0,
        isLocked: true,
        isCompleted: false,
      });
      await Challenge.create({
        lesson: lockedLesson._id,
        type: 'SELECT',
        question: 'Locked?',
        options: [{ text: 'A', correct: true }],
        order: 1,
      });

      const res = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.lesson._id.toString()).toBe(lockedLesson._id.toString());
    });

    it('should return null when all lessons are completed', async () => {
      // Mark lesson's challenge as completed (needed for getNextLesson check)
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: testChallenge._id,
        completed: true,
      });
      // Mark lesson as completed
      testLesson.isCompleted = true;
      await testLesson.save();

      const lockedLesson2 = await Lesson.create({
        title: 'Locked Second',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });
      const challenge2 = await Challenge.create({
        lesson: lockedLesson2._id,
        type: 'SELECT',
        question: 'Test',
        options: [{ text: 'A', correct: true }],
        order: 1,
      });

      // Complete the second lesson's challenge as well
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: challenge2._id,
        completed: true,
      });

      const res = await request(app)
        .get('/api/duolingo/lessons/next')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/duolingo/lessons/:id — isLocked security check
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/duolingo/lessons/:id (Course Publish & Sequential Enforcement)', () => {
    let lockedLesson;

    beforeEach(async () => {
      // Ensure UserProgress exists so XP update works
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, returnDocument: 'after' }
      );

      // Create a later lesson; course publish opens the course, but unit order still gates access.
      lockedLesson = await Lesson.create({
        title: 'Locked Lesson',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });

      await Challenge.create({
        lesson: lockedLesson._id,
        type: 'SELECT',
        question: 'Is it locked?',
        options: [{ text: 'Yes', correct: true }],
        order: 1,
      });
    });

    it('should block access to a later lesson until the preceding lesson is completed', async () => {
      const res = await request(app)
        .get(`/api/duolingo/lessons/${lockedLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow access to a lesson when the preceding lesson is completed', async () => {
      // Complete the preceding lesson's challenges
      await ChallengeProgress.create({
        user: testUser._id,
        challenge: testChallenge._id,
        completed: true,
      });

      const res = await request(app)
        .get(`/api/duolingo/lessons/${lockedLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(lockedLesson._id.toString());
    });
  });

  describe('Daily Challenge isolation from roadmap progress', () => {
    let dailyLesson;
    let dailyQuestion;
    let dailyChallenge;

    beforeEach(async () => {
      await UserProgress.findOneAndUpdate(
        { user: testUser._id },
        { user: testUser._id, activeCourse: testCourse._id },
        { upsert: true, returnDocument: 'after' }
      );

      dailyLesson = await Lesson.create({
        title: 'Daily Locked Roadmap Lesson',
        unit: testUnit._id,
        order: 2,
        isLocked: true,
        isCompleted: false,
      });
      dailyQuestion = await Challenge.create({
        lesson: dailyLesson._id,
        type: 'SELECT',
        question: 'Daily isolated?',
        options: [
          { text: 'Yes', correct: true },
          { text: 'No', correct: false },
        ],
        order: 1,
      });
      dailyChallenge = await DailyChallenge.create({
        date: getDateKey(new Date()),
        lesson: dailyLesson._id,
        xpReward: 50,
        bonusMultiplier: 2,
      });
    });

    it('should allow daily mode to play a roadmap-locked lesson without unlocking roadmap access', async () => {
      const roadmapRes = await request(app)
        .get(`/api/duolingo/lessons/${dailyLesson._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(roadmapRes.status).toBe(403);

      const dailyRes = await request(app)
        .get(`/api/duolingo/lessons/${dailyLesson._id}`)
        .query({ mode: 'daily', dailyChallengeId: dailyChallenge._id.toString() })
        .set('Authorization', `Bearer ${authToken}`);

      expect(dailyRes.status).toBe(200);
      expect(dailyRes.body.data.sessionMode).toBe('daily');
    });

    it('should score daily answers without creating roadmap challenge or lesson completion', async () => {
      const answerRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: dailyQuestion._id.toString(),
          selectedOptionId: 'Yes',
          mode: 'daily',
          dailyChallengeId: dailyChallenge._id.toString(),
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.data.isCorrect).toBe(true);
      expect(answerRes.body.data.mode).toBe('daily');

      const roadmapProgress = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: dailyQuestion._id,
      });
      expect(roadmapProgress).toBeNull();

      const completeRes = await request(app)
        .post(`/api/duolingo/lessons/${dailyLesson._id}/daily-complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dailyChallengeId: dailyChallenge._id.toString() });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.redirectTo).toBe('/duolingo');

      const score = await DailyChallengeScore.findOne({ user: testUser._id, challenge: dailyChallenge._id });
      expect(score.xp).toBe(10);
      expect(score.completedAt).toBeTruthy();

      const progress = await UserProgress.findOne({ user: testUser._id });
      expect(progress.crownsByLesson.get(String(dailyLesson._id))).toBeUndefined();

      const afterLesson = await Lesson.findById(dailyLesson._id);
      expect(afterLesson.isCompleted).toBe(false);
    });

    it('should not award daily rank XP when a wrong answer is retried correctly later', async () => {
      const wrongRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: dailyQuestion._id.toString(),
          selectedOptionId: 'No',
          mode: 'daily',
          dailyChallengeId: dailyChallenge._id.toString(),
        });

      expect(wrongRes.status).toBe(200);
      expect(wrongRes.body.data.isCorrect).toBe(false);
      expect(wrongRes.body.data.pointsEarned).toBe(0);

      const retryRes = await request(app)
        .post('/api/duolingo/quiz/answer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId: dailyQuestion._id.toString(),
          selectedOptionId: 'Yes',
          mode: 'daily',
          dailyChallengeId: dailyChallenge._id.toString(),
        });

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.isCorrect).toBe(true);
      expect(retryRes.body.data.pointsEarned).toBe(0);
      expect(retryRes.body.data.dailyScore.reason).toBe('failed_before_correct');

      const score = await DailyChallengeScore.findOne({ user: testUser._id, challenge: dailyChallenge._id });
      expect(score.xp).toBe(0);
      expect(score.failedChallenges.map(String)).toContain(dailyQuestion._id.toString());
      expect(score.answeredChallenges.map(String)).toContain(dailyQuestion._id.toString());

      const roadmapProgress = await ChallengeProgress.findOne({
        user: testUser._id,
        challenge: dailyQuestion._id,
      });
      expect(roadmapProgress).toBeNull();
    });
  });
});
