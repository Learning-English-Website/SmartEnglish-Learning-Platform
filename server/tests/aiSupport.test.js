const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const signature = require('cookie-signature');

// Mock event bus to align with existing test suite configuration
jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

// Mock socketIO config
const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};
jest.mock('../src/config/socketIO', () => ({
  getIO: () => mockIo,
  initSocketIO: () => mockIo
}));

// Mock the Gemini Provider to test API logic without making real network calls to Google
const geminiProvider = require('../src/modules/ai/providers/gemini.provider');
jest.mock('../src/modules/ai/providers/gemini.provider', () => ({
  generateText: jest.fn()
}));

const User = require('../src/modules/user/user.model');
const SupportSession = require('../src/models/supportSession.model');
const SupportMessage = require('../src/models/supportMessage.model');
const AiUsageLog = require('../src/models/aiUsageLog.model');
const cryptoHelper = require('../src/modules/ai/helpers/crypto');
const supportChatRoutes = require('../src/modules/support-chat/supportChat.routes');

describe('AI Support Chatbot API', () => {
  let app;
  let studentA, cskhAgent;
  let tokenA, tokenCskh;
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
    app.use('/api/support-chat', supportChatRoutes);

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
    studentA = await User.create({
      email: 'student_a@example.com',
      username: 'student_a',
      password: 'password123',
      isVerified: true,
      role: 'student'
    });

    cskhAgent = await User.create({
      email: 'cskh_agent@example.com',
      username: 'cskh_agent',
      password: 'password123',
      isVerified: true,
      role: 'cskh'
    });

    // Seed token strings
    tokenA = jwt.sign(
      { sub: studentA._id.toString(), role: studentA.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    tokenCskh = jwt.sign(
      { sub: cskhAgent._id.toString(), role: cskhAgent.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to wait for the background AI response to be written in DB
  const waitForAiMessage = async (sessionId, expectedCount = 2) => {
    let count = 0;
    while (count < 20) {
      const currentCount = await SupportMessage.countDocuments({ session: sessionId });
      if (currentCount >= expectedCount) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      count++;
    }
  };

  // Helper to wait for background AI usage log to be saved in DB
  const waitForAiLog = async (studentId) => {
    let count = 0;
    while (count < 20) {
      const log = await AiUsageLog.findOne({ user: studentId, feature: 'support' });
      if (log) {
        return log;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      count++;
    }
    return null;
  };

  describe('POST /api/support-chat/messages', () => {
    it('should send student message, save it, and since byok_gemini_key cookie is missing, trigger a system bot warning warning user to set API Key', async () => {
      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Hello, I need help with payment.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe('Hello, I need help with payment.');

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      // Wait for AI background execution
      await waitForAiMessage(session._id, 2);

      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBe('Hello, I need help with payment.');
      
      const botUser = await User.findOne({ email: 'ai-assistant@smartenglish.com' });
      expect(botUser).toBeDefined();
      expect(messages[1].sender.toString()).toBe(botUser._id.toString());
      expect(messages[1].text).toContain('Gemini API Key');

      // Check consecutive warnings: sending another message should not post the warning again
      const res2 = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Still waiting for help.' });

      expect(res2.status).toBe(201);
      
      // Wait a short duration
      await new Promise(resolve => setTimeout(resolve, 150));

      const messagesAfter = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      // Should be 3 (2 from user, 1 bot warning from the first message)
      expect(messagesAfter).toHaveLength(3);
    });

    it('should send student message, trigger AI, call Gemini API, save AI response, emit typing & messages events, and log success metrics', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      geminiProvider.generateText.mockResolvedValueOnce('Xin chao! Toi la tro ly AI ho tro hoc vien. Toi co the ho tro gi cho ban?');

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'Lam the nao de tao flashcard?' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      // Wait for AI background execution
      await waitForAiMessage(session._id, 2);

      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBe('Lam the nao de tao flashcard?');
      expect(messages[1].text).toBe('Xin chao! Toi la tro ly AI ho tro hoc vien. Toi co the ho tro gi cho ban?');

      const botUser = await User.findOne({ email: 'ai-assistant@smartenglish.com' });
      expect(messages[1].sender.toString()).toBe(botUser._id.toString());

      // Verify Gemini was called
      expect(geminiProvider.generateText).toHaveBeenCalled();
      const [calledKey, systemInstruction, contents] = geminiProvider.generateText.mock.calls[0];
      expect(calledKey).toBe('test_api_key_support');
      expect(systemInstruction).toContain('helpful customer support AI assistant');
      expect(contents[contents.length - 1].parts[0].text).toBe('Lam the nao de tao flashcard?');
      // Assert Gemini contents only contains the latest user message exactly once
      const userMsgsWithThatText = contents.filter(item => item.role === 'user' && item.parts[0].text === 'Lam the nao de tao flashcard?');
      expect(userMsgsWithThatText).toHaveLength(1);

      // Verify Socket.IO emissions
      // Check support:typing:receive typing true and typing false
      expect(mockIo.to).toHaveBeenCalledWith(`user:${studentA._id.toString()}`);
      expect(mockIo.emit).toHaveBeenCalledWith('support:typing:receive', { isTyping: true });
      expect(mockIo.emit).toHaveBeenCalledWith('support:typing:receive', { isTyping: false });

      // Ordinary AI-only chats should not appear in the CSKH realtime queue
      expect(mockIo.to).not.toHaveBeenCalledWith('cskh-agents');
      expect(mockIo.emit).toHaveBeenCalledWith('support:message:receive', expect.any(Object));

      // Verify AiUsageLog success log
      const log = await waitForAiLog(studentA._id);
      expect(log).toBeDefined();
      expect(log.status).toBe('success');
      expect(log.inputSize).toBe('Lam the nao de tao flashcard?'.length);
      expect(log.outputSize).toBe('Xin chao! Toi la tro ly AI ho tro hoc vien. Toi co the ho tro gi cho ban?'.length);
    });

    it('should tell students to press the human-agent button when they ask to contact CSKH', async () => {
      await SupportSession.deleteMany({ student: studentA._id });
      geminiProvider.generateText.mockClear();
      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'toi muon gap nhan vien CSKH' });

      expect(res.status).toBe(201);

      const session = await SupportSession.findOne({ student: studentA._id });
      await waitForAiMessage(session._id, 2);

      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[1].text).toContain('G\u1eb7p nh\u00e2n vi\u00ean');
      expect(messages[1].text).toContain('K\u1ebft n\u1ed1i l\u1ea1i');
      expect(messages[1].text).toContain('CSKH');
      expect(geminiProvider.generateText).not.toHaveBeenCalled();
    });

    it('should not reply with AI if cskh (human agent) is assigned to the session', async () => {
      const session = await SupportSession.create({
        student: studentA._id,
        cskh: cskhAgent._id,
        status: 'open'
      });

      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'Hello, human?' });

      expect(res.status).toBe(201);

      // Wait a short duration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only have 1 message (from the user), no AI response because cskh is not null
      const messages = await SupportMessage.find({ session: session._id });
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe('Hello, human?');

      expect(geminiProvider.generateText).not.toHaveBeenCalled();
    });

    it('should clear typing status and log error metric if Gemini API throws an error', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const error = new Error('AI Service Unavailable');
      error.status = 503;
      geminiProvider.generateText.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'Hello, error?' });

      expect(res.status).toBe(201);

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      // Wait a short duration for the background processing to finish
      await new Promise(resolve => setTimeout(resolve, 150));

      // User message is preserved, but no AI message is saved
      const messages = await SupportMessage.find({ session: session._id });
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe('Hello, error?');

      // Verify socket typing status was cleared
      expect(mockIo.emit).toHaveBeenCalledWith('support:typing:receive', { isTyping: false });

      // Verify AiUsageLog error log
      const log = await AiUsageLog.findOne({ user: studentA._id, feature: 'support' });
      expect(log).toBeDefined();
      expect(log.status).toBe('error');
      expect(log.errorCode).toBe('HTTP_503');
    });

    it('should slice user message input and AI output response to 1000 characters in the database', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      const longInputText = 'a'.repeat(1100);
      const longAiReply = 'b'.repeat(1200);
      geminiProvider.generateText.mockResolvedValueOnce(longAiReply);

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: longInputText });

      expect(res.status).toBe(201);
      expect(res.body.data.text).toHaveLength(1000); // Sliced in return payload

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      await waitForAiMessage(session._id, 2);

      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toHaveLength(1000);
      expect(messages[0].text).toBe('a'.repeat(1000));
      expect(messages[1].text).toHaveLength(1000);
      expect(messages[1].text).toBe('b'.repeat(1000));
    });

    it('should handle image-only messages without calling Gemini and reply with the default bot template', async () => {
      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ image: 'http://example.com/image.png' });

      expect(res.status).toBe(201);

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      await waitForAiMessage(session._id, 2);

      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBeUndefined();
      expect(messages[0].image).toBe('http://example.com/image.png');
      expect(messages[1].text).toContain('CSKH');

      // Verify Gemini was not called
      expect(geminiProvider.generateText).not.toHaveBeenCalled();
    });

    it('should abort saving AI reply if a human CSKH assigns the session while the AI call is in progress', async () => {
      const ciphertext = cryptoHelper.encrypt('test_api_key_support');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      // Mock Gemini with a 150ms delay
      geminiProvider.generateText.mockImplementationOnce(() => {
        return new Promise(resolve => setTimeout(() => resolve('Mock response after delay'), 150));
      });

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'Hello, is anyone there?' });

      expect(res.status).toBe(201);

      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();

      // Immediately assign CSKH before the 150ms delay resolves
      session.cskh = cskhAgent._id;
      await session.save();

      // Wait 250ms for the mock AI call to finish
      await new Promise(resolve => setTimeout(resolve, 250));

      // Assert that only the user message was saved, no bot message is created
      const messages = await SupportMessage.find({ session: session._id });
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe('Hello, is anyone there?');

      // Verify typing status is cleared
      expect(mockIo.emit).toHaveBeenCalledWith('support:typing:receive', { isTyping: false });
    });

    it('should reset cskh to null when closing a session, allow student messaging to reopen support, and allow student to request CSKH to reconnect', async () => {
      // 1. Setup session with human agent assigned
      const session = await SupportSession.create({
        student: studentA._id,
        cskh: cskhAgent._id,
        status: 'open'
      });

      // 2. CSKH agent closes the session
      const closeRes = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/close`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe('closed');
      expect(closeRes.body.data.cskh).toBeNull(); // verify cskh was reset to null in response

      // Check DB directly
      const dbSession = await SupportSession.findById(session._id);
      expect(dbSession.status).toBe('closed');
      expect(dbSession.cskh).toBeNull();

      // 3. Student sends a message directly after human support closes - should succeed and reopen
      const resDirectMessage = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Hello directly' });
      expect(resDirectMessage.status).toBe(201);

      // Reopened session check
      const dbSessionReopened = await SupportSession.findById(session._id);
      expect(dbSessionReopened.status).toBe('open');
      expect(dbSessionReopened.cskh).toBeNull();

      // Verify messages: close system message + new user message
      const messages = await SupportMessage.find({ session: session._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].isSystem).toBe(true);
      expect(messages[1].text).toBe('Hello directly');
    });
  });

  describe('System Messages and Sender Population', () => {
    it('GET /api/support-chat/messages of student should successfully populate sender details', async () => {
      let session = await SupportSession.findOne({ student: studentA._id });
      if (!session) {
        session = await SupportSession.create({ student: studentA._id });
      }

      await SupportMessage.create({
        session: session._id,
        sender: studentA._id,
        text: 'Student message'
      });

      const res = await request(app)
        .get('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toBeDefined();
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
      
      const lastMsg = res.body.data.messages[res.body.data.messages.length - 1];
      expect(lastMsg.sender).toBeDefined();
      expect(lastMsg.sender.username).toBe('student_a');
      expect(lastMsg.sender.email).toBe('student_a@example.com');
    });

    it('assignCSKH should create a system message with sender = cskhId and isSystem = true', async () => {
      let session = await SupportSession.findOne({ student: studentA._id });
      if (!session) {
        session = await SupportSession.create({ student: studentA._id });
      }

      const res = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/assign`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const dbMessages = await SupportMessage.find({ session: session._id, isSystem: true });
      expect(dbMessages).toHaveLength(1);
      expect(dbMessages[0].text).toContain('cskh_agent');
      expect(dbMessages[0].sender.toString()).toBe(cskhAgent._id.toString());
      expect(dbMessages[0].isSystem).toBe(true);
    });

    it('closeSession should create a system message with sender = closerId (cskhAgent) and isSystem = true', async () => {
      let session = await SupportSession.findOne({ student: studentA._id });
      if (!session) {
        session = await SupportSession.create({ student: studentA._id });
      }

      const res = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/close`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const dbMessages = await SupportMessage.find({ session: session._id, isSystem: true });
      const closeMsg = dbMessages.find(m => m.isSystem);
      expect(closeMsg).toBeDefined();
      expect(closeMsg.sender.toString()).toBe(cskhAgent._id.toString());
      expect(closeMsg.isSystem).toBe(true);
    });

    it('AI history query should not include system messages in generateSupportReply context', async () => {
      let session = await SupportSession.findOne({ student: studentA._id });
      if (!session) {
        session = await SupportSession.create({ student: studentA._id });
      }

      // Clear any prior messages to isolate this test
      await SupportMessage.deleteMany({ session: session._id });

      // Create a system message and a user message
      await SupportMessage.create({
        session: session._id,
        sender: cskhAgent._id,
        text: 'HÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â trÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ viÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªn cskh_agent ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ tham gia phÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²ng chat',
        isSystem: true
      });

      const ciphertext = cryptoHelper.encrypt('test_api_key_system_test');
      const cookieHeader = getSignedCookieHeader(ciphertext);

      geminiProvider.generateText.mockResolvedValueOnce('TrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ lÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ AI phÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£n hÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œi cÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢u hÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi.');

      const res = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('Cookie', [cookieHeader])
        .send({ text: 'CÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢u hÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âi mÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºi nhÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥t' });

      expect(res.status).toBe(201);

      await waitForAiMessage(session._id, 3); // 1 system, 1 user, 1 bot reply = 3 messages

      expect(geminiProvider.generateText).toHaveBeenCalled();
      const calledArgs = geminiProvider.generateText.mock.calls[geminiProvider.generateText.mock.calls.length - 1];
      const contents = calledArgs[2];

      const systemInContents = contents.some(item => 
        item.parts && item.parts.some(p => p.text && p.text.includes('ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£ tham gia phÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²ng chat'))
      );
      expect(systemInContents).toBe(false);
    });

    it('requestCSKH should be idempotent (calling twice generates only 1 system message)', async () => {
      // Clean up messages and sessions first
      await SupportSession.deleteMany({ student: studentA._id });
      let session = await SupportSession.create({ student: studentA._id, status: 'open' });
      await SupportMessage.deleteMany({ session: session._id });

      // Call 1
      const res1 = await request(app)
        .post('/api/support-chat/request-cskh')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);

      // Call 2
      const res2 = await request(app)
        .post('/api/support-chat/request-cskh')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);

      // Check sessions
      const updatedSession = await SupportSession.findOne({ student: studentA._id });
      expect(updatedSession.status).toBe('waiting');

      // Check system messages: should have exactly 1
      const systemMessages = await SupportMessage.find({ session: session._id, isSystem: true });
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].text).toBeTruthy();
    });

    it('_triggerAiReply should not send AI reply, key-warning or template bot if status is waiting', async () => {
      // 1. Waiting case
      await SupportSession.deleteMany({ student: studentA._id });
      let sessionWaiting = await SupportSession.create({ student: studentA._id, status: 'waiting' });
      await SupportMessage.deleteMany({ session: sessionWaiting._id });

      const resWaiting = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'I am waiting for CSKH' });
      expect(resWaiting.status).toBe(201);

      // Wait a bit to ensure AI has chance to execute (but it shouldn't write any message)
      await new Promise(resolve => setTimeout(resolve, 300));
      let messagesWaiting = await SupportMessage.find({ session: sessionWaiting._id });
      // Should only contain the user's message
      expect(messagesWaiting).toHaveLength(1);
      expect(messagesWaiting[0].text).toBe('I am waiting for CSKH');

      // 2. Closed sessions should reopen when student messages (returns 201)
      sessionWaiting.status = 'closed';
      await sessionWaiting.save();
      const resClosed = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ text: 'Hello when closed' });
      expect(resClosed.status).toBe(201);
    });

    it('sendCSKHMessage should fail with 403 when unassigned or assigned to someone else, and not auto-assign', async () => {
      await SupportSession.deleteMany({ student: studentA._id });
      // Case 1: Session unassigned (cskh = null)
      let sessionUnassigned = await SupportSession.create({ student: studentA._id, status: 'waiting', cskh: null });
      
      const res1 = await request(app)
        .post(`/api/support-chat/admin/sessions/${studentA._id}/messages`)
        .set('Authorization', `Bearer ${tokenCskh}`)
        .send({ text: 'Hello, I am here to help.' });
      
      expect(res1.status).toBe(403);
      expect(res1.body.message).toBeTruthy();

      // Case 2: Session assigned to another CSKH agent
      const otherCskhAgent = await User.create({
        email: 'other_cskh@example.com',
        username: 'other_cskh',
        password: 'password123',
        isVerified: true,
        role: 'cskh'
      });
      sessionUnassigned.cskh = otherCskhAgent._id;
      await sessionUnassigned.save();

      const res2 = await request(app)
        .post(`/api/support-chat/admin/sessions/${studentA._id}/messages`)
        .set('Authorization', `Bearer ${tokenCskh}`)
        .send({ text: 'Hello, I am other agent.' });
      
      expect(res2.status).toBe(403);
      expect(res2.body.message).toBeTruthy();
    });

    it('getSupportSessions with status=active should return waiting sessions and assigned open sessions only', async () => {
      await SupportSession.deleteMany({});
      
      const student1 = await User.create({ email: 's1@example.com', username: 'student1', password: 'password123', role: 'student' });
      const student2 = await User.create({ email: 's2@example.com', username: 'student2', password: 'password123', role: 'student' });
      const student3 = await User.create({ email: 's3@example.com', username: 'student3', password: 'password123', role: 'student' });
      const student4 = await User.create({ email: 's4@example.com', username: 'student4', password: 'password123', role: 'student' });

      await SupportSession.create({ student: student1._id, status: 'open' });
      await SupportSession.create({ student: student2._id, status: 'waiting' });
      await SupportSession.create({ student: student3._id, status: 'closed' });
      await SupportSession.create({ student: student4._id, status: 'open', cskh: cskhAgent._id });

      const res = await request(app)
        .get('/api/support-chat/admin/sessions?status=active')
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2); // waiting + assigned open, not AI-only open
      const statuses = res.body.data.map(s => s.status);
      expect(statuses).toContain('open');
      expect(statuses).toContain('waiting');
      expect(statuses).not.toContain('closed');
      const returnedStudentIds = res.body.data.map(s => s.student._id.toString());
      expect(returnedStudentIds).not.toContain(student1._id.toString());
      expect(returnedStudentIds).toContain(student2._id.toString());
      expect(returnedStudentIds).toContain(student4._id.toString());
    });

    it('assignCSKH should update status from waiting to open', async () => {
      await SupportSession.deleteMany({ student: studentA._id });
      let session = await SupportSession.create({ student: studentA._id, status: 'waiting', cskh: null });

      const res = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/assign`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.cskh._id.toString()).toBe(cskhAgent._id.toString());
    });

    it('closeSession should change status to closed and show up only in status=closed list', async () => {
      await SupportSession.deleteMany({});
      let session = await SupportSession.create({ student: studentA._id, status: 'open', cskh: cskhAgent._id });

      const res = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/close`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbSession = await SupportSession.findOne({ student: studentA._id });
      expect(dbSession.status).toBe('closed');

      // Query closed sessions
      const resClosedList = await request(app)
        .get('/api/support-chat/admin/sessions?status=closed')
        .set('Authorization', `Bearer ${tokenCskh}`);
      
      expect(resClosedList.body.data).toHaveLength(1);
      expect(resClosedList.body.data[0]._id.toString()).toBe(session._id.toString());
    });

    it('requestCSKH when student has no session yet should create session, log system message, and emit updates', async () => {
      // 1. Delete session first
      await SupportSession.deleteMany({ student: studentA._id });

      // Reset mockIo mock calls to verify socket emits
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      // 2. Call POST /api/support-chat/request-cskh
      const res = await request(app)
        .post('/api/support-chat/request-cskh')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 3. Assert session.status === waiting
      const session = await SupportSession.findOne({ student: studentA._id });
      expect(session).toBeDefined();
      expect(session.status).toBe('waiting');

      // 4. Assert exactly 1 SupportMessage isSystem
      const systemMessages = await SupportMessage.find({ session: session._id, isSystem: true });
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].text).toBeTruthy();

      // 5. Assert emit support:session:updated and support:message:receive
      expect(mockIo.to).toHaveBeenCalledWith('cskh-agents');
      expect(mockIo.emit).toHaveBeenCalledWith('support:session:updated', expect.any(Object));
      expect(mockIo.emit).toHaveBeenCalledWith('support:message:receive', expect.any(Object));
    });

    it('assignCSKH should fail with 400 when session is closed and not create join message', async () => {
      await SupportSession.deleteMany({ student: studentA._id });
      let session = await SupportSession.create({ student: studentA._id, status: 'closed', cskh: null });
      await SupportMessage.deleteMany({ session: session._id });

      const res = await request(app)
        .put(`/api/support-chat/admin/sessions/${studentA._id}/assign`)
        .set('Authorization', `Bearer ${tokenCskh}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBeTruthy();

      // Check DB directly: no join messages were created
      const joinMsg = await SupportMessage.findOne({ session: session._id, isSystem: true });
      expect(joinMsg).toBeNull();
    });

    it('should correctly filter queue and restrict socket emits based on session state (open+cskh=null vs waiting vs open+cskh!=null vs closed)', async () => {
      await SupportSession.deleteMany({});
      await SupportMessage.deleteMany({});

      const student1 = await User.create({ email: 'ts1@example.com', username: 'ts1', password: 'password123', role: 'student' });
      const tokenTs1 = jwt.sign({ sub: student1._id.toString(), role: student1.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

      // Reset mockIo mock calls
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      // 1. Case: open + cskh = null (Student chats with bot)
      const resSendBot = await request(app)
        .post('/api/support-chat/messages')
        .set('Authorization', `Bearer ${tokenTs1}`)
        .send({ text: 'Hello Bot' });
      expect(resSendBot.status).toBe(201);

      // Verify not in active queue
      const resQueue1 = await request(app)
        .get('/api/support-chat/admin/sessions?status=active')
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resQueue1.body.data.some(s => s.student._id.toString() === student1._id.toString())).toBe(false);

      // Verify socket emit: sent to student's room but NOT to cskh-agents room
      const studentRoom = `user:${student1._id.toString()}`;
      expect(mockIo.to).toHaveBeenCalledWith(studentRoom);
      const cskhAgentCalls = mockIo.to.mock.calls.filter(call => call[0] === 'cskh-agents');
      expect(cskhAgentCalls).toHaveLength(0);

      // Reset mockIo mock calls
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      // 2. Case: waiting (Student requests human agent)
      const resRequest = await request(app)
        .post('/api/support-chat/request-cskh')
        .set('Authorization', `Bearer ${tokenTs1}`)
        .send();
      expect(resRequest.status).toBe(200);

      // Verify in active queue
      const resQueue2 = await request(app)
        .get('/api/support-chat/admin/sessions?status=active')
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resQueue2.body.data.some(s => s.student._id.toString() === student1._id.toString())).toBe(true);

      // Verify socket emit: should emit to cskh-agents (realtime is enabled for waiting)
      expect(mockIo.to).toHaveBeenCalledWith('cskh-agents');
      expect(mockIo.emit).toHaveBeenCalledWith('support:message:receive', expect.any(Object));

      // Reset mockIo mock calls
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      // 3. Case: open + cskh !== null (CSKH assigns and chats)
      const resAssign = await request(app)
        .put(`/api/support-chat/admin/sessions/${student1._id}/assign`)
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resAssign.status).toBe(200);

      // Reset mockIo mock calls again to inspect message sending
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      const resSendCskh = await request(app)
        .post(`/api/support-chat/admin/sessions/${student1._id}/messages`)
        .set('Authorization', `Bearer ${tokenCskh}`)
        .send({ text: 'Hello, I am CSKH Agent.' });
      expect(resSendCskh.status).toBe(201);

      // Verify in active queue
      const resQueue3 = await request(app)
        .get('/api/support-chat/admin/sessions?status=active')
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resQueue3.body.data.some(s => s.student._id.toString() === student1._id.toString())).toBe(true);

      // Verify socket emit: should emit to cskh-agents and student room
      expect(mockIo.to).toHaveBeenCalledWith('cskh-agents');
      expect(mockIo.to).toHaveBeenCalledWith(studentRoom);

      // Reset mockIo mock calls
      mockIo.emit.mockClear();
      mockIo.to.mockClear();

      // 4. Case: closed
      const resClose = await request(app)
        .put(`/api/support-chat/admin/sessions/${student1._id}/close`)
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resClose.status).toBe(200);

      // Verify not in active queue, but appears in closed queue
      const resQueueActive = await request(app)
        .get('/api/support-chat/admin/sessions?status=active')
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resQueueActive.body.data.some(s => s.student._id.toString() === student1._id.toString())).toBe(false);

      const resQueueClosed = await request(app)
        .get('/api/support-chat/admin/sessions?status=closed')
        .set('Authorization', `Bearer ${tokenCskh}`);
      expect(resQueueClosed.body.data.some(s => s.student._id.toString() === student1._id.toString())).toBe(true);
    });
  });
});
