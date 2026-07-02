const aiService = require('./ai.service');
const cryptoHelper = require('./helpers/crypto');
const FlashcardSet = require('../../models/flashcardSet.model');
const Flashcard = require('../../models/flashcard.model');
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
    // 1. Ownership & Existence checks when drafts are generated for an existing set.
    // Create-set flow can generate drafts before the set exists, so setId is optional.
    const flashcardSet = setId ? await FlashcardSet.findById(setId) : null;
    if (setId && !flashcardSet) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bộ thẻ từ vựng yêu cầu." });
    }

    if (setId && flashcardSet.user.toString() !== userId.toString()) {
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
 * Auto-enhances a single flashcard based on term, translation, level, and context.
 */
exports.enhanceFlashcard = async (req, res, next) => {
  const startTime = Date.now();
  const { front, back, level, context } = req.body;
  const userId = req.userId;

  try {
    // 1. Validate inputs
    if (!front || typeof front !== 'string' || !front.trim()) {
      return res.status(400).json({ success: false, message: "Thuật ngữ tiếng Anh (front) không được để trống." });
    }
    if (front.length > 120) {
      return res.status(400).json({ success: false, message: "Thuật ngữ không được vượt quá 120 ký tự." });
    }
    if (back && (typeof back !== 'string' || back.length > 300)) {
      return res.status(400).json({ success: false, message: "Nghĩa tiếng Việt không được vượt quá 300 ký tự." });
    }
    if (context && (typeof context !== 'string' || context.length > 500)) {
      return res.status(400).json({ success: false, message: "Ngữ cảnh không được vượt quá 500 ký tự." });
    }
    if (level && !['A1-A2', 'B1-B2', 'C1-C2'].includes(level)) {
      return res.status(400).json({ success: false, message: "Trình độ ngôn ngữ không hợp lệ." });
    }

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

    // 3. Request enhanced flashcard draft from AI service
    const enhancedCard = await aiService.enhanceFlashcard(apiKey, { front, back, level, context });

    // 4. Log successful usage metrics
    const latencyMs = Date.now() - startTime;
    const inputSize = (front || '').length + (back || '').length + (context || '').length;
    const outputSize = JSON.stringify(enhancedCard).length;

    await AiUsageLog.create({
      user: userId,
      feature: 'flashcard_enhance',
      status: 'success',
      latencyMs,
      inputSize,
      outputSize
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.json({ 
      success: true, 
      enhancedCard 
    });
  } catch (error) {
    // Log error metrics
    const latencyMs = Date.now() - startTime;
    await AiUsageLog.create({
      user: userId,
      feature: 'flashcard_enhance',
      status: 'error',
      latencyMs,
      errorCode: error.status ? `HTTP_${error.status}` : error.name || 'UNKNOWN_ERROR'
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.status(error.status || 500).json({ 
      success: false, 
      message: error.message || "Đã xảy ra lỗi trong quá trình phân tích và bổ sung thẻ bằng AI." 
    });
  }
};

/**
 * Decrypts cookie key, generates a lesson plan with challenges, and logs performance metrics.
 */
exports.generateLesson = async (req, res, next) => {
  const startTime = Date.now();
  const { topic, level, count, challengeTypes } = req.body;
  const userId = req.userId;

  try {
    // 1. Validate inputs
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu chủ đề bài học." });
    }

    const challengeCount = Math.min(Math.max(parseInt(count, 10) || 8, 5), 10); // enforce limit: 5-10
    const safeLessonTypes = ['ASSIST', 'TYPE', 'TRANSLATE', 'COMPLETE', 'ORDER', 'MATCH', 'FILL'];
    let selectedChallengeTypes;
    if (challengeTypes !== undefined) {
      if (!Array.isArray(challengeTypes)) {
        return res.status(400).json({ success: false, message: "Danh sách dạng câu hỏi không hợp lệ." });
      }
      selectedChallengeTypes = challengeTypes
        .map(type => String(type || '').trim().toUpperCase())
        .filter((type, index, arr) => safeLessonTypes.includes(type) && arr.indexOf(type) === index);

      if (selectedChallengeTypes.length === 0) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một dạng câu hỏi hợp lệ." });
      }
    }

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
      count: challengeCount,
      challengeTypes: selectedChallengeTypes
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
  },
  doctor: {
    'A1-A2': "Hello, I am Doctor Kelly. What is the problem today? Where does it hurt?",
    'B1-B2': "Hello, I'm Doctor Kelly. How can I help you today? What symptoms have you been experiencing lately?",
    'C1-C2': "Good morning. I'm Doctor Kelly. What seems to be the medical concern that brought you in today? Let's discuss your symptoms."
  },
  customs_officer: {
    'A1-A2': "Hello. Passport please. What is the purpose of your visit?",
    'B1-B2': "Good day. Please present your passport and declaration form. How long do you intend to stay in the country?",
    'C1-C2': "Good day, officer speaking. May I inspect your passport, visa, and declaration document? What is the duration and primary objective of your stay?"
  },
  server: {
    'A1-A2': "Welcome! I am your server today. Would you like a drink to start?",
    'B1-B2': "Welcome! I will be your server today. Can I start you off with some drinks or appetizers while you look over the menu?",
    'C1-C2': "Good evening, welcome to the restaurant. I am your server tonight. May I introduce our daily specials, or would you prefer to start with a selection from our wine list?"
  },
  ielts_examiner: {
    'A1-A2': "Good afternoon. Welcome to the test. What is your name? Can I see your ID?",
    'B1-B2': "Good afternoon. Welcome to this Speaking session. Could you tell me your full name, please? And where are you from?",
    'C1-C2': "Good day. This is the IELTS Speaking examination. I am your examiner. Can you state your full name and show me your identification? Thank you. Let's begin Part 1."
  },
  support_agent: {
    'A1-A2': "Hello! Thanks for contacting support. What is your issue?",
    'B1-B2': "Hello. Thank you for reaching out to customer support. Could you describe the issue you are facing with your account?",
    'C1-C2': "Welcome to customer support. My name is Alex. How can I assist you in resolving your technical query or account issue today? Please provide details."
  },
  recruiter: {
    'A1-A2': "Hello, nice to meet you. I am the recruiter. Let's start the interview.",
    'B1-B2': "Hello, nice to meet you. Thank you for coming in today. Can we discuss your past work experience and qualifications?",
    'C1-C2': "Good morning. It's a pleasure to meet you. Thank you for attending this interview. To begin, could you walk me through your professional achievements and explain why you're a fit for this role?"
  },
  custom: {
    'A1-A2': "Hello! I am ready for our custom roleplay practice. Let's start speaking English.",
    'B1-B2': "Hello! I am ready to begin our custom conversation practice. Let's start our conversation now.",
    'C1-C2': "Welcome. I am prepared for our custom conversation scenario practice. Please initiate the dialogue whenever you're ready."
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
  },
  doctor: {
    'A1-A2': "Xin chào, tôi là Bác sĩ Kelly. Hôm nay bạn gặp vấn đề gì? Bạn đau ở đâu?",
    'B1-B2': "Xin chào, tôi là Bác sĩ Kelly. Tôi có thể giúp gì cho bạn hôm nay? Gần đây bạn gặp những triệu chứng gì?",
    'C1-C2': "Chào buổi sáng, tôi là Bác sĩ Kelly. Vấn đề sức khỏe nào đưa bạn đến khám hôm nay? Chúng ta cùng thảo luận về triệu chứng của bạn."
  },
  customs_officer: {
    'A1-A2': "Xin chào. Cho tôi xem hộ chiếu. Mục đích chuyến đi của bạn là gì?",
    'B1-B2': "Xin chào. Vui lòng xuất trình hộ chiếu và tờ khai. Bạn dự định ở lại đất nước này trong bao lâu?",
    'C1-C2': "Xin chào, tôi là nhân viên hải quan. Tôi có thể kiểm tra hộ chiếu, thị thực và tờ khai của bạn không? Thời gian và mục đích chính của chuyến đi là gì?"
  },
  server: {
    'A1-A2': "Chào mừng! Tôi là người phục vụ của bạn hôm nay. Bạn muốn đồ uống gì trước không?",
    'B1-B2': "Chào mừng! Tôi sẽ là người phục vụ của bạn hôm nay. Tôi có thể lấy đồ uống hoặc món khai vị gì trước trong lúc bạn xem thực đơn không?",
    'C1-C2': "Chào buổi tối, chào mừng đến nhà hàng. Tôi là người phục vụ của quý khách tối nay. Tôi có thể giới thiệu các món đặc biệt hôm nay, hay quý khách muốn bắt đầu chọn rượu?"
  },
  ielts_examiner: {
    'A1-A2': "Chào buổi chiều. Chào mừng đến cuộc thi. Tên bạn là gì? Cho tôi xem căn cước?",
    'B1-B2': "Chào buổi chiều. Chào mừng đến với bài thi Nói này. Bạn có thể cho tôi biết tên đầy đủ không? Bạn đến từ đâu?",
    'C1-C2': "Xin chào. Đây là bài thi Nói IELTS. Tôi là giám khảo của bạn. Bạn có thể cho biết tên đầy đủ và xuất trình giấy tờ tùy thân không? Cảm ơn. Chúng ta bắt đầu phần 1."
  },
  support_agent: {
    'A1-A2': "Xin chào! Cảm ơn bạn đã liên hệ hỗ trợ. Vấn đề của bạn là gì?",
    'B1-B2': "Xin chào. Cảm ơn bạn đã liên hệ bộ phận chăm sóc khách hàng. Bạn có thể mô tả sự cố bạn đang gặp phải với tài khoản của mình không?",
    'C1-C2': "Chào mừng đến bộ phận hỗ trợ khách hàng. Tôi tên là Alex. Tôi có thể giúp gì cho bạn để giải quyết thắc mắc kỹ thuật hoặc sự cố tài khoản hôm nay?"
  },
  recruiter: {
    'A1-A2': "Xin chào, rất vui được gặp bạn. Tôi là người tuyển dụng. Hãy bắt đầu phỏng vấn nhé.",
    'B1-B2': "Xin chào, rất vui được gặp bạn. Cảm ơn bạn đã đến hôm nay. Chúng ta thảo luận về kinh nghiệm làm việc và năng lực của bạn nhé?",
    'C1-C2': "Chào buổi sáng. Rất vui được gặp bạn. Cảm ơn bạn đã tham gia buổi phỏng vấn này. Hãy bắt đầu bằng cách giới thiệu các thành tựu nghề nghiệp của bạn."
  },
  custom: {
    'A1-A2': "Xin chào! Tôi đã sẵn sàng cho buổi nhập vai tự chọn. Hãy bắt đầu nói tiếng Anh nhé.",
    'B1-B2': "Xin chào! Tôi đã sẵn sàng thực hành hội thoại theo tình huống tự chọn của bạn. Chúng ta bắt đầu trò chuyện nhé.",
    'C1-C2': "Xin chào. Tôi đã chuẩn bị sẵn sàng cho kịch bản hội thoại tự chọn của bạn. Vui lòng bắt đầu cuộc đối thoại khi bạn sẵn sàng."
  }
};

/**
 * Creates a new AI conversation session and posts a local template initial message.
 */
exports.createChatSession = async (req, res, next) => {
  const { persona, topic, level } = req.body;
  const userId = req.userId;

  try {
    const validPersonas = [
      'barista', 'receptionist', 'interviewer', 'friend', 'professor', 
      'doctor', 'customs_officer', 'server', 'ielts_examiner', 'support_agent', 'recruiter', 'custom'
    ];
    if (!persona || !validPersonas.includes(persona)) {
      return res.status(400).json({ success: false, message: "Nhân vật nhập vai không hợp lệ." });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu chủ đề trò chuyện." });
    }
    if (!level || !['A1-A2', 'B1-B2', 'C1-C2'].includes(level)) {
      return res.status(400).json({ success: false, message: "Trình độ ngôn ngữ không hợp lệ." });
    }

    let sanitizedCustomScenario = "";
    if (persona === 'custom') {
      const { customScenario } = req.body;
      if (!customScenario || !customScenario.trim()) {
        return res.status(400).json({ success: false, message: "Yêu cầu cung cấp mô tả kịch bản tự chọn." });
      }
      
      const forbiddenKeywords = ['ignore', 'bypass', 'system prompt', 'jailbreak', 'developer mode', 'reset', 'rule', 'override', 'hacker'];
      const lowercaseScenario = customScenario.toLowerCase();
      const hasInjection = forbiddenKeywords.some(keyword => lowercaseScenario.includes(keyword));
      
      if (hasInjection) {
        return res.status(400).json({ success: false, message: "Mô tả kịch bản chứa từ khóa không hợp lệ hoặc không an toàn." });
      }
      
      sanitizedCustomScenario = customScenario.trim().slice(0, 500);
    }

    const sanitizedTopic = topic.trim().slice(0, 100);

    // 1. Create session record
    const session = await AiChatSession.create({
      user: userId,
      persona,
      topic: sanitizedTopic,
      level,
      customScenario: sanitizedCustomScenario
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

    // Check if session is already completed
    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: "Phòng hội thoại này đã kết thúc. Bạn không thể gửi thêm tin nhắn." });
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

      // Check limit of 30 user messages
      const userMessageCount = await AiChatMessage.countDocuments({ session: session._id, sender: 'user' });
      if (userMessageCount >= 30) {
        return res.status(400).json({ success: false, message: "Bạn đã đạt giới hạn tối đa 30 lượt tin nhắn cho cuộc hội thoại này." });
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
        newMessage: userMsg.text,
        customScenario: session.customScenario
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
      feedback: reply.feedback && reply.feedback.hasMistake ? reply.feedback : ''
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

/**
 * Ends a chat session, generates a summary card using Gemini, and saves it.
 */
exports.endChatSession = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;
  const startTime = Date.now();

  try {
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền kết thúc phòng này." });
    }

    // Idempotency: Return existing summary if already completed
    if (session.status === 'completed' && session.summary) {
      return res.json({
        success: true,
        session,
        summary: session.summary
      });
    }

    // Get signed HttpOnly cookie BYOK API Key
    const encryptedKey = req.signedCookies.byok_gemini_key;
    if (!encryptedKey) {
      return res.status(401).json({ 
        success: false, 
        message: "Yêu cầu cung cấp Gemini API Key (BYOK) để tạo báo cáo tổng kết." 
      });
    }

    let apiKey;
    try {
      apiKey = cryptoHelper.decrypt(encryptedKey);
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: "Gemini API Key không hợp lệ hoặc bị lỗi mã hóa." 
      });
    }

    // Fetch all messages in the session
    const messages = await AiChatMessage.find({ session: session._id }).sort({ createdAt: 1 });
    if (messages.length <= 1) {
      // Only initial greeting, no user interaction
      session.status = 'completed';
      session.summary = {
        grammarScore: 100,
        vocabularyScore: 100,
        pronunciationScore: 100,
        overallFeedback: "Bạn chưa gửi tin nhắn nào trong buổi hội thoại này.",
        commonMistakes: [],
        recommendedExpressions: [],
        vocabularyHighlight: []
      };
      await session.save();
      return res.json({
        success: true,
        session,
        summary: session.summary
      });
    }

    // Generate summary report
    const summary = await aiService.generateChatSummary(apiKey, {
      persona: session.persona,
      topic: session.topic,
      level: session.level,
      messages
    });

    // Save summary to session and change status
    session.status = 'completed';
    session.summary = summary;
    await session.save();

    // Log usage
    const latencyMs = Date.now() - startTime;
    await AiUsageLog.create({
      user: userId,
      feature: 'chat_summary',
      status: 'success',
      latencyMs
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.json({
      success: true,
      session,
      summary
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await AiUsageLog.create({
      user: userId,
      feature: 'chat_summary',
      status: 'error',
      latencyMs,
      errorCode: error.name || 'UNKNOWN_ERROR'
    }).catch(err => console.error("Error creating AiUsageLog:", err));

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tạo báo cáo tổng kết phòng hội thoại."
    });
  }
};

/**
 * Gets the summary of a completed chat session.
 */
exports.getChatSummary = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;

  try {
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập báo cáo này." });
    }

    return res.json({
      success: true,
      status: session.status,
      summary: session.summary
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tải báo cáo tổng kết."
    });
  }
};

/**
 * Saves highlighted session vocabulary words directly to user flashcard set.
 */
exports.saveVocabToFlashcard = async (req, res, next) => {
  const sessionId = req.params.id;
  const userId = req.userId;
  const { vocab, setId, newSetName } = req.body;

  try {
    // 1. Verify session ownership
    const session = await AiChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng hội thoại." });
    }
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Quyền truy cập bị từ chối." });
    }

    // 2. Validate input vocab
    if (!Array.isArray(vocab) || vocab.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách từ vựng trống hoặc không hợp lệ." });
    }

    if (vocab.length > 30) {
      return res.status(400).json({ success: false, message: "Không thể lưu quá 30 từ cùng một lúc." });
    }

    for (let i = 0; i < vocab.length; i++) {
      const item = vocab[i];
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ success: false, message: `Mục từ vựng thứ ${i + 1} không hợp lệ.` });
      }
      if (!item.word || typeof item.word !== 'string' || !item.word.trim()) {
        return res.status(400).json({ success: false, message: `Mục từ vựng thứ ${i + 1} thiếu từ tiếng Anh.` });
      }
      if (!item.definition || typeof item.definition !== 'string' || !item.definition.trim()) {
        return res.status(400).json({ success: false, message: `Mục từ vựng thứ ${i + 1} thiếu định nghĩa.` });
      }
    }

    let targetSetId = setId;

    if (!targetSetId && newSetName && newSetName.trim()) {
      const trimmedTitle = newSetName.trim();
      if (trimmedTitle.length > 200) {
        return res.status(400).json({ success: false, message: "Tên bộ thẻ mới không được vượt quá 200 ký tự." });
      }

      // Create new set
      const newSet = await FlashcardSet.create({
        user: userId,
        title: trimmedTitle,
        description: `Từ vựng tích lũy từ kịch bản AI: ${session.topic}`,
        cardCount: 0
      });
      targetSetId = newSet._id;
    }

    if (!targetSetId) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng chọn bộ thẻ từ vựng hiện có hoặc tạo mới." 
      });
    }

    // Verify ownership of the target flashcard set
    const flashcardSet = await FlashcardSet.findById(targetSetId);
    if (!flashcardSet) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bộ thẻ từ vựng." });
    }
    if (flashcardSet.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền sửa đổi bộ thẻ từ vựng này." });
    }

    // Insert cards
    const startOrder = flashcardSet.cardCount || 0;
    const cardsToInsert = vocab.map((v, index) => ({
      set: targetSetId,
      front: String(v.word || '').trim(),
      back: String(v.definition || '').trim(),
      pronunciation: v.ipa ? String(v.ipa).trim() : null,
      example: v.example ? String(v.example).trim() : null,
      order: startOrder + index
    }));

    await Flashcard.create(cardsToInsert);

    // Update card count
    flashcardSet.cardCount += vocab.length;
    await flashcardSet.save();

    return res.json({
      success: true,
      message: `Đã lưu thành công ${vocab.length} từ vào bộ thẻ: ${flashcardSet.title}`,
      flashcardSet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể lưu từ vựng vào bộ thẻ."
    });
  }
};

