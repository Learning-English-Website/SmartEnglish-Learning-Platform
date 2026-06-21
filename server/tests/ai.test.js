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
const FlashcardSet = require('../src/models/flashcardSet.model');
const AiUsageLog = require('../src/models/aiUsageLog.model');
const cryptoHelper = require('../src/modules/ai/helpers/crypto');
const aiRoutes = require('../src/modules/ai/ai.routes');

describe('AI Module API', () => {
  let app;
  let userA, userB;
  let tokenA, tokenB;
  let setA, setB;
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
    app.use('/api/ai', aiRoutes);

    // Global error handler mock to match Express application
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
    userA = await User.create({
      email: 'usera@example.com',
      username: 'usera',
      password: 'password123',
      isVerified: true,
      role: 'student'
    });

    userB = await User.create({
      email: 'userb@example.com',
      username: 'userb',
      password: 'password123',
      isVerified: true,
      role: 'student'
    });

    // Seed token strings
    tokenA = jwt.sign(
      { sub: userA._id.toString(), role: userA.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    tokenB = jwt.sign(
      { sub: userB._id.toString(), role: userB.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Seed flashcard sets
    setA = await FlashcardSet.create({
      title: 'Set User A',
      description: 'Owned by User A',
      language: 'English',
      user: userA._id,
      cardCount: 0
    });

    setB = await FlashcardSet.create({
      title: 'Set User B',
      description: 'Owned by User B',
      language: 'English',
      user: userB._id,
      cardCount: 0
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. GET /api/ai/key/status
  // ─────────────────────────────────────────────────────────────────
  describe('GET /api/ai/key/status', () => {
    it('should return false if cookie is missing', async () => {
      const res = await request(app)
        .get('/api/ai/key/status')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.hasGeminiKey).toBe(false);
    });

    it('should return true if cookie is present and decrypted successfully', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const res = await request(app)
        .get('/api/ai/key/status')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader]);

      expect(res.status).toBe(200);
      expect(res.body.hasGeminiKey).toBe(true);
    });

    it('should return false and clear cookie if signature verification fails', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const unsignedCookie = 's:' + ciphertext; // missing signature extension

      const res = await request(app)
        .get('/api/ai/key/status')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [`byok_gemini_key=${encodeURIComponent(unsignedCookie)}`]);

      expect(res.status).toBe(200);
      expect(res.body.hasGeminiKey).toBe(false);
      const setCookieHeader = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookieHeader)).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('should return false and clear cookie if decryption fails', async () => {
      const badCiphertext = 'bad_iv_and_tag_and_ciphertext';
      const cookieHeader = getSignedCookieHeader(badCiphertext);

      const res = await request(app)
        .get('/api/ai/key/status')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader]);

      expect(res.status).toBe(200);
      expect(res.body.hasGeminiKey).toBe(false);
      // Ensure clear cookie header is sent (expired date 1970)
      const setCookieHeader = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookieHeader)).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. POST /api/ai/key/validate
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/ai/key/validate', () => {
    it('should return 400 if apiKey parameter is missing', async () => {
      const res = await request(app)
        .post('/api/ai/key/validate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 if api key passes connection check', async () => {
      geminiProvider.generateStructuredData.mockResolvedValueOnce({ status: 'OK' });

      const res = await request(app)
        .post('/api/ai/key/validate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send({ apiKey: 'valid_test_key' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(geminiProvider.generateStructuredData).toHaveBeenCalled();
    });

    it('should return 401 if provider returns auth error', async () => {
      const error = new Error('API_KEY_INVALID');
      error.status = 401;
      geminiProvider.generateStructuredData.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/api/ai/key/validate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send({ apiKey: 'invalid_test_key' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. POST /api/ai/key
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/ai/key', () => {
    it('should return 200 and set signed cookie on validation success', async () => {
      geminiProvider.generateStructuredData.mockResolvedValueOnce({ status: 'OK' });

      const res = await request(app)
        .post('/api/ai/key')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send({ apiKey: 'valid_key_to_save', rememberMe: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasGeminiKey).toBe(true);
      
      const setCookie = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookie)).toContain('byok_gemini_key=');
    });

    it('should fail and not set cookie if validation fails', async () => {
      const error = new Error('API_KEY_INVALID');
      error.status = 401;
      geminiProvider.generateStructuredData.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/api/ai/key')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send({ apiKey: 'invalid_key_to_save' });

      expect(res.status).toBe(401);
      const setCookie = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookie)).not.toContain('byok_gemini_key=');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. DELETE /api/ai/key
  // ─────────────────────────────────────────────────────────────────
  describe('DELETE /api/ai/key', () => {
    it('should return 200 and send clear cookie header', async () => {
      const res = await request(app)
        .delete('/api/ai/key')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl);

      expect(res.status).toBe(200);
      expect(res.body.hasGeminiKey).toBe(false);
      const setCookie = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookie)).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. POST /api/ai/flashcards/generate
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/ai/flashcards/generate', () => {
    const validParams = {
      setId: '', // Will populate before call
      mode: 'topic',
      topic: 'Vocabulary at the Zoo',
      level: 'A2',
      count: 10
    };

    beforeEach(() => {
      validParams.setId = setA._id.toString();
    });

    it('should return 403 Forbidden if mutation requests lack Origin header', async () => {
      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(validParams); // No Origin header

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('CSRF Blocked');
    });

    it('should return 403 Forbidden if user A tries to generate cards for user B\'s set', async () => {
      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`) // Authenticated as User A
        .set('Origin', mockClientUrl)
        .send({ ...validParams, setId: setB._id.toString() }); // Target set owned by User B

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Bạn không có quyền thực hiện');
    });

    it('should return 428 Precondition Required if key cookie is missing', async () => {
      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .send(validParams); // No byok_gemini_key cookie

      expect(res.status).toBe(428);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Vui lòng cấu hình Gemini API Key');
    });

    it('should return 428 Precondition Required and clear cookie if decrypt fails', async () => {
      const badCookieHeader = getSignedCookieHeader('bad_cookie_value');

      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .set('Cookie', [badCookieHeader])
        .send(validParams);

      expect(res.status).toBe(428);
      expect(res.body.success).toBe(false);
      const setCookie = res.headers['set-cookie'] || [];
      expect(JSON.stringify(setCookie)).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('should return 400 Bad Request if count exceeds quota limit of 20', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .set('Cookie', [cookieHeader])
        .send({ ...validParams, count: 50 }); // Exceeds quota (max 20)

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 429 Too Many Requests if user exceeds rate limit of 30 requests per window', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const cookieHeader = getSignedCookieHeader(ciphertext);
      const mockFlashcards = [
        { front: 'Lion', back: 'Sư tử', pronunciation: '/ˈlaɪ.ən/', example: 'The lion slept.', difficulty: 2 }
      ];

      // Setup 30 successful mock resolves
      for (let i = 0; i < 30; i++) {
        geminiProvider.generateStructuredData.mockResolvedValueOnce({
          flashcards: mockFlashcards
        });
      }

      // Send 30 successive requests (all should succeed)
      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .post('/api/ai/flashcards/generate')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('Origin', mockClientUrl)
          .set('Cookie', [cookieHeader])
          .send(validParams);
        expect(res.status).toBe(200);
      }

      // The 31st request should trigger rate limit and return 429
      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .set('Cookie', [cookieHeader])
        .send(validParams);

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('vượt quá giới hạn');
    });

    it('should return 200, draft results, and create AiUsageLog on validation and AI success', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const cookieHeader = getSignedCookieHeader(ciphertext);
      const mockFlashcards = [
        { front: 'Lion', back: 'Sư tử', pronunciation: '/ˈlaɪ.ən/', example: 'The lion slept.', difficulty: 2 }
      ];
      geminiProvider.generateStructuredData.mockResolvedValueOnce({
        flashcards: mockFlashcards
      });

      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .set('Cookie', [cookieHeader])
        .send(validParams);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.draftId).toBeNull();
      expect(res.body.flashcards).toHaveLength(1);
      expect(res.body.flashcards[0].front).toBe('Lion');

      // Verify that AiUsageLog record was written to the database
      const logs = await AiUsageLog.find({ user: userA._id });
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('success');
      expect(logs[0].feature).toBe('flashcard');
    });

    it('should return correct status code and write error logs on AI provider failure', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key');
      const cookieHeader = getSignedCookieHeader(ciphertext);
      
      // Mock safety violation
      const safetyError = new Error('Nội dung yêu cầu vi phạm chính sách an toàn của AI.');
      safetyError.status = 422;
      geminiProvider.generateStructuredData.mockRejectedValueOnce(safetyError);

      const res = await request(app)
        .post('/api/ai/flashcards/generate')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Origin', mockClientUrl)
        .set('Cookie', [cookieHeader])
        .send(validParams);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('vi phạm chính sách an toàn');

      // Verify that AiUsageLog record was written with status error
      const logs = await AiUsageLog.find({ user: userA._id });
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('error');
      expect(logs[0].errorCode).toBe('HTTP_422');
    });
  });
});
