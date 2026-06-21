const aiService = require('./ai.service');
const cryptoHelper = require('./helpers/crypto');
const FlashcardSet = require('../../models/flashcardSet.model');
const AiUsageLog = require('../../models/aiUsageLog.model');
const AiChatSession = require('../../models/aiChatSession.model');
const AiChatMessage = require('../../models/aiChatMessage.model');

// Helper to construct cookie options dynamically based on environment
const getCookieOptions = (rememberMe = false) => {
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    signed: true,
    path: '/api'
  };
  if (rememberMe) {
    options.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  }
  return options;
};

// Helper to construct clear cookie options
const getClearCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    signed: true,
    path: '/api'
  };
};

exports.getAiKeyStatus = (req, res) => {
  // If the cookie is not present at all in either parsed container, return false
  if (req.cookies.byok_gemini_key === undefined && req.signedCookies.byok_gemini_key === undefined) {
    return res.json({ hasGeminiKey: false });
  }

  const encryptedKey = req.signedCookies.byok_gemini_key;
  if (!encryptedKey || encryptedKey === false) {
    // Cookie was sent but signature check failed (tampered or wrong secret)
    res.clearCookie('byok_gemini_key', getClearCookieOptions());
    return res.json({ hasGeminiKey: false });
  }

  const decrypted = cryptoHelper.decrypt(encryptedKey);
  if (!decrypted) {
    res.clearCookie('byok_gemini_key', getClearCookieOptions());
    return res.json({ hasGeminiKey: false });
  }

  return res.json({ hasGeminiKey: true });
};

/**
 * Validates a raw API Key in-memory without setting cookies.
 */
exports.validateAiKey = async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Yêu cầu cung cấp API Key để xác thực." });
    }

    await aiService.validateKeyConnectivity(apiKey);
    return res.json({ success: true, message: "API Key hợp lệ và kết nối thành công." });
  } catch (error) {
    return res.status(error.status || 400).json({ 
      success: false, 
      message: error.message || "Xác thực API Key thất bại." 
    });
  }
};

/**
 * Validates key, encrypts it, and registers the signed byok_gemini_key cookie.
 */
exports.setAiKey = async (req, res, next) => {
  try {
    const { apiKey, rememberMe } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Yêu cầu cung cấp API Key." });
    }

    // Force validation before encrypting and saving to prevent bad configurations
    await aiService.validateKeyConnectivity(apiKey);

    const ciphertext = cryptoHelper.encrypt(apiKey);
    const options = getCookieOptions(!!rememberMe);

    res.cookie('byok_gemini_key', ciphertext, options);
    return res.json({ success: true, hasGeminiKey: true });
  } catch (error) {
    return res.status(error.status || 400).json({ 
      success: false, 
      message: error.message || "Không thể cấu hình API Key." 
    });
  }
};

/**
 * Clears the byok_gemini_key cookie.
 */
exports.clearAiKey = (req, res) => {
  res.clearCookie('byok_gemini_key', getClearCookieOptions());
  return res.json({ success: true, hasGeminiKey: false });
};

/**
 * Enforces set ownership, reads & decrypts cookie, performs the AI content generation call, and logs usage metrics.
 */
exports.generateFlashcards = async (req, res, next) => {
  const startTime = Date.now();
  const { setId, mode, topic, text, level, count } = req.body;
  const userId = req.userId;

  try {
    // 1. Ownership & Existence checks
    if (!setId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin setId." });
    }

    const flashcardSet = await FlashcardSet.findById(setId);
    if (!flashcardSet) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bộ thẻ từ vựng yêu cầu." });
    }

    if (flashcardSet.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện trên bộ thẻ từ vựng này." });
    }

    // 2. Read and decrypt API key from signed cookie
    const hasCookie = req.cookies.byok_gemini_key !== undefined || req.signedCookies.byok_gemini_key !== undefined;
    const encryptedKey = req.signedCookies.byok_gemini_key;

    if (hasCookie && (!encryptedKey || encryptedKey === false)) {
      // Cookie exists but verification failed (tampered or wrong secret)
      res.clearCookie('byok_gemini_key', getClearCookieOptions());
      return res.status(428).json({ 
        success: false, 
        message: "Cấu hình bảo mật API Key của bạn không còn hợp lệ. Vui lòng thiết lập lại." 
      });
    }

    if (!encryptedKey || encryptedKey === false) {
      return res.status(428).json({ 
        success: false, 
        message: "Vui lòng cấu hình Gemini API Key cá nhân trong phần Cài đặt để sử dụng." 
      });
    }

    const apiKey = cryptoHelper.decrypt(encryptedKey);
    if (!apiKey) {
      // Clear cookie immediately if decrypt fails
      res.clearCookie('byok_gemini_key', getClearCookieOptions());
      return res.status(428).json({ 
        success: false, 
        message: "Cấu hình bảo mật API Key của bạn không còn hợp lệ. Vui lòng thiết lập lại." 
      });
    }

    // Validate count parameter explicitly to protect server quota
    if (count !== undefined) {
      const parsedCount = parseInt(count, 10);
      if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 20) {
        return res.status(400).json({ 
          success: false, 
          message: "Giới hạn số lượng thẻ sinh ra trong một lần gọi là từ 1 đến 20 thẻ." 
        });
      }
    }

    // 3. Request draft flashcards array from AI service
    const flashcards = await aiService.generateFlashcardDrafts(apiKey, { mode, topic, text, level, count });

    // 4. Log successful usage metrics
    const latencyMs = Date.now() - startTime;
    const inputSize = (text || topic || '').length;
    const outputSize = JSON.stringify(flashcards).length;

    await AiUsageLog.create({
      user: userId,
      feature: 'flashcard',
      status: 'success',
      latencyMs,
      inputSize,
      outputSize
    });

    return res.json({ 
      success: true, 
      draftId: null, 
      flashcards 
    });
  } catch (error) {
    // Log error metrics
    const latencyMs = Date.now() - startTime;
    await AiUsageLog.create({
      user: userId,
      feature: 'flashcard',
      status: 'error',
      latencyMs,
      errorCode: error.status ? `HTTP_${error.status}` : error.name || 'UNKNOWN_ERROR'
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || "Đã xảy ra lỗi hệ thống trong quá trình sinh từ vựng." 
    });
  }
};

/**
 * Decrypts cookie key, generates a lesson plan with challenges, and logs performance metrics.
 */
exports.generateLesson = async (req, res, next) => {
  const startTime = Date.now();
  const { topic, level, count } = req.body;
  const userId = req.userId;

  try {
    // 1. Validate inputs
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu chủ đề bài học." });
    }

    const challengeCount = Math.min(Math.max(parseInt(count, 10) || 8, 5), 10); // enforce limit: 5-10

    // 2. Read and decrypt API key from signed cookie
    const hasCookie = req.cookies.byok_gemini_key !== undefined || req.signedCookies.byok_gemini_key !== undefined;
    const encryptedKey = req.signedCookies.byok_gemini_key;

    if (hasCookie && (!encryptedKey || encryptedKey === false)) {
      res.clearCookie('byok_gemini_key', getClearCookieOptions());
      return res.status(428).json({ 
        success: false, 
        message: "Cấu hình bảo mật API Key của bạn không còn hợp lệ. Vui lòng thiết lập lại." 
      });
    }

    if (!encryptedKey || encryptedKey === false) {
      return res.status(428).json({ 
        success: false, 
        message: "Vui lòng cấu hình Gemini API Key cá nhân trong phần Cài đặt để sử dụng." 
      });
    }

    const apiKey = cryptoHelper.decrypt(encryptedKey);
    if (!apiKey) {
      res.clearCookie('byok_gemini_key', getClearCookieOptions());
      return res.status(428).json({ 
        success: false, 
        message: "Cấu hình bảo mật API Key của bạn không còn hợp lệ. Vui lòng thiết lập lại." 
      });
    }

    // 3. Request draft lesson from AI service
    const lessonDraft = await aiService.generateLessonDraft(apiKey, { 
      topic: topic.trim(), 
      level: level ? level.trim() : 'B1-B2', 
      count: challengeCount 
    });

    // 4. Log successful usage metrics (do NOT log api key, prompt, or raw response)
    const latencyMs = Date.now() - startTime;
    const inputSize = (topic || '').length;
    const outputSize = JSON.stringify(lessonDraft).length;

    await AiUsageLog.create({
      user: userId,
      feature: 'lesson_plan',
      status: 'success',
      latencyMs,
      inputSize,
      outputSize
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.json({ 
      success: true, 
      lesson: lessonDraft 
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await AiUsageLog.create({
      user: userId,
      feature: 'lesson_plan',
      status: 'error',
      latencyMs,
      errorCode: error.status ? `HTTP_${error.status}` : error.name || 'UNKNOWN_ERROR'
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || "Đã xảy ra lỗi hệ thống trong quá trình thiết kế bài học." 
    });
  }
};

// ── AI Chatbot Scenarios & Local Greeting Templates ─────────────────────────────
const greetingTemplates = {
  barista: {
    'A1-A2': "Hi! Welcome to Starbucks. What can I get for you today?",
    'B1-B2': "Hello! Welcome to Starbucks. How can I help you today? Would you like to try our special seasonal blend?",
    'C1-C2': "Good morning, welcome to Starbucks. What can I craft for you today? We have some single-origin coffees available if you're interested."
  },
  receptionist: {
    'A1-A2': "Good afternoon! Welcome to the Grand Hotel. How can I assist you with your check-in today?",
    'B1-B2': "Welcome to the Grand Hotel. How can I help you today? Are you checking in, or do you have any questions about our amenities?",
    'C1-C2': "Good day, and welcome to the Grand Hotel. I would be delighted to assist you with your reservation or any concierge services you might require. How may I serve you today?"
  },
  interviewer: {
    'A1-A2': "Hello, welcome to Google. I am your interviewer today. Shall we begin by introducing yourself?",
    'B1-B2': "Hello, and welcome to Google. Thank you for taking the time to interview with us today. To start off, could you tell me a bit about your background and experience?",
    'C1-C2': "Good morning. Welcome to Google. I'm looking forward to our technical discussion today. Let's start with a brief overview of your professional trajectory, focusing on how you've handled architectural complexity in past projects."
  },
  friend: {
    'A1-A2': "Hey there! It's Alex. What's up? How is your day?",
    'B1-B2': "Hey! It's Alex. What's new? I was just thinking about what we should do this weekend. How has your week been?",
    'C1-C2': "Hey, what's going on? It's Alex. I've been reflecting on some interesting ideas lately and wanted to catch up with you. How have you been holding up with everything?"
  },
  professor: {
    'A1-A2': "Hello. I am Professor Sterling. Today we will talk about basic English grammar. Do you have any questions?",
    'B1-B2': "Welcome. I am Professor Sterling. Today, we will discuss academic writing styles. What are your thoughts on this topic?",
    'C1-C2': "Welcome to the seminar. I am Professor Sterling. Today, we will explore the nuances of critical discourse analysis. What research questions are you hoping to examine in your upcoming thesis?"
  }
};

const greetingTranslations = {
  barista: {
    'A1-A2': "Xin chào! Chào mừng bạn đến với Starbucks. Bạn muốn dùng nước gì hôm nay?",
    'B1-B2': "Xin chào! Chào mừng đến với Starbucks. Tôi có thể giúp gì cho bạn? Bạn có muốn thử món cà phê đặc biệt theo mùa của chúng tôi không?",
    'C1-C2': "Chào buổi sáng, chào mừng đến với Starbucks. Tôi có thể pha chế món nước nào cho bạn hôm nay? Chúng tôi có sẵn một số loại cà phê nguyên chất nếu bạn quan tâm."
  },
  receptionist: {
    'A1-A2': "Chào buổi chiều! Chào mừng đến với khách sạn Grand Hotel. Tôi có thể giúp bạn nhận phòng hôm nay không?",
    'B1-B2': "Chào mừng đến với Grand Hotel. Tôi có thể giúp gì cho bạn hôm nay? Bạn muốn nhận phòng hay có câu hỏi nào về dịch vụ của chúng tôi?",
    'C1-C2': "Xin chào và chào mừng đến với khách sạn Grand Hotel. Tôi rất hân hạnh được hỗ trợ bạn đặt phòng hoặc bất kỳ dịch vụ hỗ trợ khách hàng nào bạn cần. Tôi có thể phục vụ bạn như thế nào hôm nay?"
  },
  interviewer: {
    'A1-A2': "Xin chào, chào mừng đến với Google. Tôi là người phỏng vấn của bạn hôm nay. Chúng ta bắt đầu bằng việc giới thiệu bản thân nhé?",
    'B1-B2': "Xin chào và chào mừng đến với Google. Cảm ơn bạn đã dành thời gian phỏng vấn với chúng tôi hôm nay. Để bắt đầu, bạn có thể chia sẻ một chút về kinh nghiệm và quá trình làm việc của mình không?",
    'C1-C2': "Chào buổi sáng. Chào mừng đến với Google. Tôi rất mong chờ buổi thảo luận kỹ thuật của chúng ta hôm nay. Hãy bắt đầu bằng phần tóm tắt ngắn gọn về hành trình sự nghiệp của bạn, tập trung vào cách bạn xử lý cấu trúc phức tạp trong các dự án trước đây."
  },
  friend: {
    'A1-A2': "Chào cậu! Alex đây. Có chuyện gì thế? Ngày hôm nay của cậu thế nào?",
    'B1-B2': "Chào! Alex đây. Có tin gì mới không? Tớ đang nghĩ về kế hoạch cuối tuần này. Tuần này của cậu thế nào rồi?",
    'C1-C2': "Chào, có chuyện gì thế? Alex đây. Dạo gần đây tớ đang suy ngẫm về vài ý tưởng thú vị và muốn trò chuyện với cậu. Cậu thế nào rồi?"
  },
  professor: {
    'A1-A2': "Xin chào. Tôi là Giáo sư Sterling. Hôm nay chúng ta sẽ thảo luận về ngữ pháp tiếng Anh cơ bản. Bạn có câu hỏi nào không?",
    'B1-B2': "Chào mừng. Tôi là Giáo sư Sterling. Hôm nay, chúng ta sẽ thảo luận về các phong cách viết học thuật. Bạn nghĩ gì về chủ đề này?",
    'C1-C2': "Chào mừng đến với buổi chuyên đề. Tôi là Giáo sư Sterling. Hôm nay, chúng ta sẽ khám phá các sắc thái của phân tích diễn ngôn phê phán. Bạn muốn nghiên cứu câu hỏi nào trong luận văn sắp tới của mình?"
  }
};

/**
 * Creates a new AI conversation session and posts a local template initial message.
 */
exports.createChatSession = async (req, res, next) => {
  const { persona, topic, level } = req.body;
  const userId = req.userId;

  try {
    if (!persona || !['barista', 'receptionist', 'interviewer', 'friend', 'professor'].includes(persona)) {
      return res.status(400).json({ success: false, message: "Nhân vật nhập vai không hợp lệ." });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu chủ đề trò chuyện." });
    }
    if (!level || !['A1-A2', 'B1-B2', 'C1-C2'].includes(level)) {
      return res.status(400).json({ success: false, message: "Trình độ ngôn ngữ không hợp lệ." });
    }

    // Backend hardening: trim and limit topic to max 100 characters
    const sanitizedTopic = topic.trim().slice(0, 100);

    // 1. Create session record
    const session = await AiChatSession.create({
      user: userId,
      persona,
      topic: sanitizedTopic,
      level
    });

    // 2. Fetch local greeting template based on persona and level
    const greetingText = greetingTemplates[persona]?.[level] || "Hello, welcome to our conversation practice! Let's start speaking English.";
    const translationText = greetingTranslations[persona]?.[level] || "Xin chào, chào mừng đến với buổi thực hành hội thoại! Chúng ta hãy bắt đầu nói tiếng Anh.";

    // 3. Save initial message
    const greetingMsg = await AiChatMessage.create({
      session: session._id,
      sender: 'ai',
      text: greetingText,
      translation: translationText
    });

    return res.status(201).json({
      success: true,
      session,
      initialMessage: greetingMsg
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tạo phòng hội thoại mới."
    });
  }
};

/**
 * Gets all AI Chat sessions for the authenticated user.
 */
exports.getChatSessions = async (req, res, next) => {
  const userId = req.userId;

  try {
    const sessions = await AiChatSession.find({ user: userId }).sort({ updatedAt: -1 });
    return res.json({
      success: true,
      sessions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tải danh sách phòng hội thoại."
    });
  }
};

/**
 * Gets message history for a specific session with strict ownership check and pagination.
 */
exports.getChatMessages = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  try {
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }

    // Strict ownership verification
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập phòng hội thoại này." });
    }

    const messages = await AiChatMessage.find({ session: sessionId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Reverse to return in chronological order
    messages.reverse();

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tải lịch sử tin nhắn."
    });
  }
};

/**
 * Sends a message, saves it, fetches history context, calls Gemini, and saves AI response.
 */
exports.sendChatMessage = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;
  const { text, retryMessageId } = req.body;
  const startTime = Date.now();

  try {
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }

    // Strict ownership verification
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền gửi tin nhắn vào phòng này." });
    }

    let userMsg;

    // Support frontend retry using retryMessageId to prevent duplicate message entries
    if (retryMessageId) {
      userMsg = await AiChatMessage.findById(retryMessageId);
      if (!userMsg || userMsg.session.toString() !== session._id.toString() || userMsg.sender !== 'user') {
        return res.status(400).json({ success: false, message: "Tin nhắn retry không hợp lệ." });
      }
    } else {
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "Nội dung tin nhắn trống." });
      }
      // Save user message to database first
      userMsg = await AiChatMessage.create({
        session: session._id,
        sender: 'user',
        text: text.trim().slice(0, 500)
      });
    }

    // Read and decrypt API key from signed cookie
    const encryptedKey = req.signedCookies.byok_gemini_key;
    if (!encryptedKey || encryptedKey === false) {
      return res.status(428).json({
        success: false,
        message: "Vui lòng cấu hình Gemini API Key cá nhân để sử dụng tính năng."
      });
    }

    const apiKey = cryptoHelper.decrypt(encryptedKey);
    if (!apiKey) {
      res.clearCookie('byok_gemini_key', getClearCookieOptions());
      return res.status(428).json({
        success: false,
        message: "Cấu hình bảo mật API Key không còn hợp lệ. Vui lòng thiết lập lại."
      });
    }

    // Context Trimming: Fetch up to 9 messages immediately prior to this userMsg (ordering chronologically)
    const history = await AiChatMessage.find({
      session: session._id,
      createdAt: { $lte: userMsg.createdAt },
      _id: { $ne: userMsg._id }
    })
    .sort({ createdAt: -1 })
    .limit(9);
    history.reverse();

    // Call Gemini API service with history context
    let reply;
    try {
      reply = await aiService.generateChatReply(apiKey, {
        persona: session.persona,
        topic: session.topic,
        level: session.level,
        history,
        newMessage: userMsg.text
      });
    } catch (aiError) {
      // In case of AI provider failure, do NOT rollback userMsg. Log usage and return mapped error status code.
      const latencyMs = Date.now() - startTime;
      await AiUsageLog.create({
        user: userId,
        feature: 'chatbot',
        status: 'error',
        latencyMs,
        errorCode: aiError.status ? `HTTP_${aiError.status}` : aiError.name || 'UNKNOWN_ERROR'
      }).catch(err => console.error("Error creating AiUsageLog:", err));

      return res.status(aiError.status || 500).json({
        success: false,
        userMessage: userMsg,
        message: aiError.message || "AI tạm thời không phản hồi. Vui lòng thử lại."
      });
    }

    // Save AI response
    const aiMsg = await AiChatMessage.create({
      session: session._id,
      sender: 'ai',
      text: reply.response,
      translation: reply.translation,
      feedback: reply.feedback
    });

    // Update session timestamp
    await AiChatSession.findByIdAndUpdate(session._id, { updatedAt: Date.now() });

    // Log metrics
    const latencyMs = Date.now() - startTime;
    const inputSize = userMsg.text.length;
    const outputSize = reply.response.length;
    await AiUsageLog.create({
      user: userId,
      feature: 'chatbot',
      status: 'success',
      latencyMs,
      inputSize,
      outputSize
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.status(201).json({
      success: true,
      userMessage: userMsg,
      aiMessage: aiMsg
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gặp lỗi hệ thống khi xử lý tin nhắn."
    });
  }
};

/**
 * Deletes a chat session along with all associated messages.
 */
exports.deleteChatSession = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;

  try {
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }

    // Strict ownership verification
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa phòng này." });
    }

    // Delete all messages
    await AiChatMessage.deleteMany({ session: session._id });
    // Delete session
    await AiChatSession.findByIdAndDelete(session._id);

    return res.json({
      success: true,
      message: "Đã xóa phòng hội thoại và lịch sử tin nhắn thành công."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể xóa phòng hội thoại."
    });
  }
};
