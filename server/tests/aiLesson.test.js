const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const signature = require('cookie-signature');

// Mock event bus and redis to align with existing test suite configuration
jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

// Mock the Gemini Provider to test API logic without making real network calls to Google
const geminiProvider = require('../src/modules/ai/providers/gemini.provider');
jest.mock('../src/modules/ai/providers/gemini.provider', () => ({
  generateStructuredData: jest.fn()
}));

const User = require('../src/modules/user/user.model');
const Unit = require('../src/models/unit.model');
const Course = require('../src/models/course.model');
const Lesson = require('../src/models/lesson.model');
const Challenge = require('../src/models/challenge.model');
const ChallengeOption = require('../src/models/challengeOption.model');
const UserProgress = require('../src/models/userProgress.model');
const AiUsageLog = require('../src/models/aiUsageLog.model');
const cryptoHelper = require('../src/modules/ai/helpers/crypto');
const aiRoutes = require('../src/modules/ai/ai.routes');
const teacherRoutes = require('../src/modules/teacher/teacher.routes');
const duolingoRoutes = require('../src/modules/duolingo/duolingo.routes');

describe('AI Lesson & Teacher Save API', () => {
  let app;
  let teacherUser, studentUser;
  let teacherToken, studentToken;
  let course, unit;
  const mockClientUrl = 'http://localhost:5173';

  // Helper to generate a valid Express signed cookie string
  const getSignedCookieHeader = (value) => {
    const signed = 's:' + signature.sign(value, process.env.COOKIE_SECRET);
    return `byok_gemini_key=${encodeURIComponent(signed)}`;
  };

  beforeEach(() => {
    process.env.CLIENT_URL = mockClientUrl;
    process.env.COOKIE_SECRET = 'test_cookie_secret_key_long_enough_for_jest_tests';
    process.env.AI_KEY_ENCRYPTION_SECRET = 'test_encryption_secret_key_32_bytes_long';

    app = express();
    app.use(express.json());
    app.use(cookieParser(process.env.COOKIE_SECRET));
    
    // Attach test user middleware mock to simulate authentication
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
          req.userId = decoded.sub;
          // Set role on req.user for authorize middleware
          req.user = { _id: decoded.sub, role: decoded.role };
        } catch (err) {}
      }
      next();
    });

    app.use('/api/ai', aiRoutes);
    app.use('/api/teacher', teacherRoutes);
    app.use('/api/duolingo', duolingoRoutes);

    // Global error handler
    app.use((err, req, res, next) => {
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    });
  });

  beforeEach(async () => {
    // Seed test users
    teacherUser = await User.create({
      email: 'teacher@example.com',
      username: 'teacher',
      password: 'password123',
      isVerified: true,
      role: 'teacher'
    });

    studentUser = await User.create({
      email: 'student@example.com',
      username: 'student',
      password: 'password123',
      isVerified: true,
      role: 'student'
    });

    // Seed token strings
    teacherToken = jwt.sign(
      { sub: teacherUser._id.toString(), role: teacherUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    studentToken = jwt.sign(
      { sub: studentUser._id.toString(), role: studentUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Seed course and unit
    course = await Course.create({
      title: 'English course',
      slug: 'english-course',
      description: 'Course description',
      level: 'beginner',
      order: 1,
      isPublished: true,
      isActive: true
    });

    unit = await Unit.create({
      course: course._id,
      title: 'Unit 1',
      summary: 'Summary 1',
      description: 'Description 1',
      order: 1
    });
  });

  afterEach(async () => {
    // Cleanup databases
    await User.deleteMany({});
    await Course.deleteMany({});
    await Unit.deleteMany({});
    await Lesson.deleteMany({});
    await Challenge.deleteMany({});
    await ChallengeOption.deleteMany({});
    await UserProgress.deleteMany({});
    await AiUsageLog.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/ai/lessons/generate', () => {
    it('should return 403 if request is made by a student role', async () => {
      const res = await request(app)
        .post('/api/ai/lessons/generate')
        .set('Origin', mockClientUrl)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ topic: 'Present Simple', level: 'A1-A2', count: 5 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 428 if key cookie is missing', async () => {
      const res = await request(app)
        .post('/api/ai/lessons/generate')
        .set('Origin', mockClientUrl)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ topic: 'Present Simple', level: 'A1-A2', count: 5 });

      expect(res.status).toBe(428);
      expect(res.body.message).toContain('Gemini API Key');
    });

    it('should generate lesson drafts successfully for teacher and clean up challenges', async () => {
      const encryptedKey = cryptoHelper.encrypt('mock-gemini-api-key');
      const cookieHeader = getSignedCookieHeader(encryptedKey);

      const mockAiResponse = {
        title: 'Present Simple Tense',
        subtitle: 'Learn about daily routines',
        grammarFocus: ['Present Simple'],
        vocabFocus: ['eat', 'sleep'],
        challenges: [
          {
            type: 'ASSIST',
            question: 'What does "he eats" mean?',
            correctAnswer: 'anh ấy ăn',
            options: [
              { text: 'anh ấy ăn', correct: true },
              { text: 'cô ấy ăn', correct: false }
            ]
          },
          {
            type: 'TRANSLATE',
            question: 'Translate: Tôi đi học',
            correctAnswer: 'I go to school',
            sourceLang: 'vi',
            targetLang: 'en'
          },
          {
            type: 'ORDER',
            question: 'Sort the words',
            wordBank: ['I', 'am', 'a', 'teacher'],
            correctOrder: [0, 1, 2, 3],
            correctAnswer: 'I am a teacher'
          },
          {
            type: 'FILL',
            question: 'Complete the sentence',
            sentence: 'She ___ a student.',
            correctAnswer: 'is',
            options: [
              { text: 'is', correct: true },
              { text: 'are', correct: false }
            ]
          }
        ]
      };

      geminiProvider.generateStructuredData.mockResolvedValueOnce(mockAiResponse);

      const res = await request(app)
        .post('/api/ai/lessons/generate')
        .set('Origin', mockClientUrl)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('Cookie', [cookieHeader])
        .send({ topic: 'Present Simple', level: 'A1-A2', count: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lesson.challenges.length).toBe(4);
      expect(res.body.lesson.title).toBe('Present Simple Tense');

      // Check log
      const logs = await AiUsageLog.find({ user: teacherUser._id });
      expect(logs.length).toBe(1);
      expect(logs[0].feature).toBe('lesson_plan');
      expect(logs[0].status).toBe('success');
    });

    it('should throw 422 error if AI generates 0 valid challenges', async () => {
      const encryptedKey = cryptoHelper.encrypt('mock-gemini-api-key');
      const cookieHeader = getSignedCookieHeader(encryptedKey);

      const mockAiResponse = {
        title: 'Empty lesson',
        subtitle: 'Invalid exercises',
        grammarFocus: [],
        vocabFocus: [],
        challenges: [
          {
            type: 'ASSIST',
            question: 'Invalid choices',
            correctAnswer: 'none',
            options: [] // Invalid: needs options
          }
        ]
      };

      geminiProvider.generateStructuredData.mockResolvedValueOnce(mockAiResponse);

      const res = await request(app)
        .post('/api/ai/lessons/generate')
        .set('Origin', mockClientUrl)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('Cookie', [cookieHeader])
        .send({ topic: 'Invalid Topic', level: 'A1-A2', count: 5 });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('không thể tạo được bất kỳ câu hỏi/bài tập hợp lệ nào');
    });
  });

  describe('POST /api/teacher/units/:unitId/lessons/ai-save', () => {
    it('should return 403 if save request is made by a student role', async () => {
      const res = await request(app)
        .post(`/api/teacher/units/${unit._id}/lessons/ai-save`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          lesson: { title: 'Test Lesson' },
          challenges: [{ type: 'TRANSLATE', question: 'Dịch', correctAnswer: 'Translate' }]
        });

      expect(res.status).toBe(403);
    });

    it('should successfully save lesson with challenges and auto-increment order', async () => {
      // Seed first lesson to verify maxOrder + 1 logic
      await Lesson.create({
        unit: unit._id,
        title: 'First Lesson',
        order: 5
      });

      const res = await request(app)
        .post(`/api/teacher/units/${unit._id}/lessons/ai-save`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lesson: {
            title: 'AI Generated Lesson',
            subtitle: 'Goal',
            grammarFocus: ['Present simple'],
            vocabFocus: ['run'],
            xpReward: 15,
            estimatedMinutes: 6,
            type: 'challenge'
          },
          challenges: [
            {
              type: 'TRANSLATE',
              question: 'Dịch: Tôi chạy',
              correctAnswer: 'I run',
              sourceLang: 'vi',
              targetLang: 'en'
            },
            {
              type: 'ASSIST',
              question: 'Select: run',
              options: [
                { text: 'chạy', correct: true },
                { text: 'đi', correct: false }
              ]
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      
      const savedLesson = await Lesson.findOne({ title: 'AI Generated Lesson' });
      expect(savedLesson).toBeDefined();
      expect(savedLesson.order).toBe(6); // max (5) + 1 = 6
      expect(savedLesson.isLocked).toBe(false); // AI lessons should be playable after saving

      const savedChallenges = await Challenge.find({ lesson: savedLesson._id });
      expect(savedChallenges.length).toBe(2);

      const savedOptions = await ChallengeOption.find({ challenge: savedChallenges[1]._id });
      expect(savedOptions.length).toBe(2);
    });

    it('should make a single AI-saved lesson playable for students in that zone', async () => {
      const res = await request(app)
        .post(`/api/teacher/units/${unit._id}/lessons/ai-save`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lesson: {
            title: 'Only AI Lesson',
            subtitle: 'Playable immediately',
            grammarFocus: ['Greeting'],
            vocabFocus: ['hello'],
            type: 'challenge'
          },
          challenges: [
            {
              type: 'TRANSLATE',
              question: 'Translate: Xin chao',
              correctAnswer: 'Hello',
              sourceLang: 'vi',
              targetLang: 'en'
            }
          ]
        });

      expect(res.status).toBe(201);

      const savedLesson = await Lesson.findOne({ title: 'Only AI Lesson' });
      await UserProgress.create({
        user: studentUser._id,
        activeCourse: course._id
      });

      const unitsRes = await request(app)
        .get('/api/duolingo/units')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(unitsRes.status).toBe(200);
      const lessonFromTree = unitsRes.body.data[0].lessons.find(
        lesson => lesson._id.toString() === savedLesson._id.toString()
      );
      expect(lessonFromTree.isLocked).toBe(false);

      const lessonRes = await request(app)
        .get(`/api/duolingo/lessons/${savedLesson._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(lessonRes.status).toBe(200);
      expect(lessonRes.body.success).toBe(true);
    });

    it('should roll back and delete created lesson and challenges if a challenge option insertion fails', async () => {
      // Mock ChallengeOption.insertMany to throw an error
      jest.spyOn(ChallengeOption, 'insertMany').mockRejectedValueOnce(new Error('Mock DB insert error'));

      const res = await request(app)
        .post(`/api/teacher/units/${unit._id}/lessons/ai-save`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          lesson: {
            title: 'Failed Lesson Rollback',
            type: 'challenge'
          },
          challenges: [
            {
              type: 'ASSIST',
              question: 'Should trigger option insert error',
              options: [
                { text: 'Option A', correct: true },
                { text: 'Option B', correct: false }
              ]
            }
          ]
        });

      expect(res.status).toBe(500);
      
      // Verify no Lesson was left behind in DB
      const failedLesson = await Lesson.findOne({ title: 'Failed Lesson Rollback' });
      expect(failedLesson).toBeNull();

      // Verify no Challenge was left behind in DB
      const failedChallenges = await Challenge.find({});
      expect(failedChallenges.length).toBe(0);

      // Restore mock
      ChallengeOption.insertMany.mockRestore();
    });
  });
});
