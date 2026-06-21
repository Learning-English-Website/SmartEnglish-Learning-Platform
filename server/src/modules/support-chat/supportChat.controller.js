const SupportSession = require('../../models/supportSession.model');
const SupportMessage = require('../../models/supportMessage.model');
const User = require('../user/user.model');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { AppError } = require('../../shared/errors/AppError');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { getIO } = require('../../config/socketIO');

class SupportChatController {
  // Helper to emit socket events
  _emitSocketMessage(studentId, message, session) {
    try {
      const io = getIO();
      // Send message & updated session details to student's room
      io.to(`user:${studentId}`).emit('support:message:receive', { message, session });
      // Send message & updated session details to CSKH agents only if active
      const isCskhActive = session.status === 'waiting' || (session.status === 'open' && session.cskh);
      if (isCskhActive) {
        io.to('cskh-agents').emit('support:message:receive', { message, session });
      }
    } catch (err) {
      console.warn('[Socket.IO] Support message emit failed:', err.message);
    }
  }

  // Student: Get chat history
  getStudentMessages = asyncHandler(async (req, res) => {
    const studentId = req.userId;

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      // Create a session for them if it doesn't exist yet
      session = await SupportSession.create({ student: studentId });
    }

    const messages = await SupportMessage.find({ session: session._id })
      .populate('sender', 'username email avatar')
      .sort({ createdAt: 1 })
      .lean();

    res.json(ApiResponse.success({ session, messages }, 'Chat history fetched'));
  });

  // Student: Send message
  sendStudentMessage = asyncHandler(async (req, res) => {
    const studentId = req.userId;
    const { text, image } = req.body;
    if ((!text || !text.trim()) && !image) {
      throw new AppError('Message text or image is required', 400);
    }

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      session = await SupportSession.create({ student: studentId });
    }

    const trimmedText = text ? text.trim().slice(0, 1000) : '';
    session.lastMessage = trimmedText || '[Hình ảnh]';
    session.lastMessageAt = new Date();
    session.unreadCount += 1;
    if (session.status !== 'waiting') {
      session.status = 'open'; // Re-open if closed
    }
    await session.save();

    const message = await SupportMessage.create({
      session: session._id,
      sender: studentId,
      text: trimmedText || undefined,
      image: image || undefined
    });

    const populatedMessage = await SupportMessage.findById(message._id)
      .populate('sender', 'username email avatar')
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar')
      .populate('cskh', 'username email avatar')
      .lean();

    this._emitSocketMessage(studentId, populatedMessage, populatedSession);

    // Asynchronously trigger AI support assistant reply in the background
    this._triggerAiReply(studentId, session, trimmedText, message._id, req);

    res.status(201).json(ApiResponse.success(populatedMessage, 'Message sent'));
  });

  // CSKH: Send message to student
  sendCSKHMessage = asyncHandler(async (req, res) => {
    const cskhId = req.userId;
    const { studentId } = req.params;
    const { text, image } = req.body;

    if ((!text || !text.trim()) && !image) {
      throw new AppError('Message text or image is required', 400);
    }

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      throw new AppError('Support session not found', 404);
    }
    if (session.status === 'closed') {
      throw new AppError('Phiên hỗ trợ đã đóng. Bạn không thể gửi tin nhắn.', 400);
    }
    if (!session.cskh) {
      throw new AppError('Bạn cần nhận hỗ trợ phiên chat này trước khi gửi tin nhắn.', 403);
    }
    if (String(session.cskh) !== String(cskhId)) {
      throw new AppError('Phiên hỗ trợ đã được nhận bởi nhân viên khác.', 403);
    }

    const trimmedText = text ? text.trim() : '';
    session.lastMessage = trimmedText || '[Hình ảnh]';
    session.lastMessageAt = new Date();
    session.unreadCount = 0; // CSKH has read the messages
    session.status = 'open';
    await session.save();

    const message = await SupportMessage.create({
      session: session._id,
      sender: cskhId,
      text: trimmedText || undefined,
      image: image || undefined
    });

    const populatedMessage = await SupportMessage.findById(message._id)
      .populate('sender', 'username email avatar')
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar')
      .populate('cskh', 'username email avatar')
      .lean();

    this._emitSocketMessage(studentId, populatedMessage, populatedSession);

    res.status(201).json(ApiResponse.success(populatedMessage, 'Message sent'));
  });

  // CSKH: Get active sessions list
  getSupportSessions = asyncHandler(async (req, res) => {
    const { status = 'active' } = req.query;
    let query = {};
    if (status === 'active') {
      query = {
        $or: [
          { status: 'waiting' },
          { status: 'open', cskh: { $ne: null } }
        ]
      };
    } else {
      query = { status };
    }

    const sessions = await SupportSession.find(query)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json(ApiResponse.success(sessions, 'Support sessions fetched'));
  });

  // CSKH: Get message history for specific student
  getStudentMessagesForCSKH = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      session = await SupportSession.create({ student: studentId });
    }

    // Reset unread count since CSKH opened this session
    session.unreadCount = 0;
    await session.save();

    const messages = await SupportMessage.find({ session: session._id })
      .populate('sender', 'username email avatar')
      .sort({ createdAt: 1 })
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    // Broadcast session update to other CSKH agents so their unread indicators stay in sync only if active
    try {
      const isCskhActive = populatedSession.status === 'waiting' || (populatedSession.status === 'open' && populatedSession.cskh);
      if (isCskhActive) {
        getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
      }
    } catch (err) {
      console.warn('[Socket.IO] Support session read status emit failed:', err.message);
    }

    res.json(ApiResponse.success({ session: populatedSession, messages }, 'Messages fetched'));
  });

  // CSKH: Assign session to agent
  assignCSKH = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const cskhId = req.userId;

    const session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      throw new AppError('Support session not found', 404);
    }

    if (session.status === 'closed') {
      throw new AppError('Phiên hỗ trợ đã kết thúc. Vui lòng yêu cầu học viên kết nối lại.', 400);
    }

    session.cskh = cskhId;
    if (session.status === 'waiting') {
      session.status = 'open';
    }
    const cskhUser = await User.findById(cskhId);
    const systemText = `Hỗ trợ viên ${cskhUser ? cskhUser.username : 'CSKH'} đã tham gia phòng chat`;

    const systemMessage = await SupportMessage.create({
      session: session._id,
      sender: cskhId,
      text: systemText,
      isSystem: true
    });

    session.lastMessage = systemText;
    session.lastMessageAt = new Date();
    await session.save();

    const populatedMessage = await SupportMessage.findById(systemMessage._id)
      .populate('sender', 'username email avatar')
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    // Broadcast the updated session detail
    try {
      getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
    } catch {}

    this._emitSocketMessage(studentId, populatedMessage, populatedSession);

    res.json(ApiResponse.success(populatedSession, 'Session assigned to agent'));
  });

  // CSKH: Close session
  closeSession = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const closerId = req.userId;

    const session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      throw new AppError('Support session not found', 404);
    }

    const systemText = 'Phiên hỗ trợ đã kết thúc';

    const systemMessage = await SupportMessage.create({
      session: session._id,
      sender: closerId,
      text: systemText,
      isSystem: true
    });

    session.status = 'closed';
    session.cskh = null;
    session.lastMessage = systemText;
    session.lastMessageAt = new Date();
    await session.save();

    const populatedMessage = await SupportMessage.findById(systemMessage._id)
      .populate('sender', 'username email avatar')
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    try {
      getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
      getIO().to(`user:${studentId}`).emit('support:session:closed', populatedSession);
    } catch {}

    this._emitSocketMessage(studentId, populatedMessage, populatedSession);

    res.json(ApiResponse.success(populatedSession, 'Session closed'));
  });

  // Get or create dedicated AI Assistant bot user
  async _getOrCreateBotUser() {
    let bot = await User.findOne({ email: 'ai-assistant@smartenglish.com' });
    if (!bot) {
      bot = await User.create({
        username: 'AI Assistant',
        email: 'ai-assistant@smartenglish.com',
        password: 'ai-assistant-secure-password-123-random',
        role: 'cskh',
        isVerified: true
      });
    }
    return bot;
  }

  // Trigger AI assistant reply in the background
  async _triggerAiReply(studentId, session, userMessageText, currentMessageId, req) {
    // Only reply if there is no human CSKH assigned and session is active
    if (session.cskh || session.status === 'waiting' || session.status === 'closed') {
      return;
    }

    if (!userMessageText || !userMessageText.trim()) {
      // User sent an image only. Send a default bot template response without calling Gemini
      try {
        const latest = await SupportSession.findById(session._id);
        if (!latest || latest.cskh || latest.status === 'waiting' || latest.status === 'closed') {
          return;
        }
        const botUser = await this._getOrCreateBotUser();
        const botText = "Cảm ơn bạn đã gửi hình ảnh. Hỗ trợ viên CSKH sẽ xem hình ảnh và phản hồi cho bạn sớm nhất có thể!";
        
        // Prevent warning spam if last message was already this template
        const lastBotMsg = await SupportMessage.findOne({ session: session._id, sender: botUser._id }).sort({ createdAt: -1 });
        if (lastBotMsg && lastBotMsg.text === botText) {
          return;
        }

        const botMessage = await SupportMessage.create({
          session: session._id,
          sender: botUser._id,
          text: botText
        });

        session.lastMessage = botText;
        session.lastMessageAt = new Date();
        session.unreadCount = 0;
        await session.save();

        const populatedBotMsg = await SupportMessage.findById(botMessage._id)
          .populate('sender', 'username email avatar')
          .lean();

        const populatedSession = await SupportSession.findById(session._id)
          .populate('student', 'username email avatar')
          .populate('cskh', 'username email avatar')
          .lean();

        this._emitSocketMessage(studentId, populatedBotMsg, populatedSession);
      } catch (err) {
        console.error("[AI Support] Error sending image-only template message:", err);
      }
      return;
    }

    // Try to get API key from request signed cookies
    const encryptedKey = req.signedCookies.byok_gemini_key;
    if (!encryptedKey) {
      // Send a system bot notification advising them to configure API Key for AI support
      try {
        const latest = await SupportSession.findById(session._id);
        if (!latest || latest.cskh || latest.status === 'waiting' || latest.status === 'closed') {
          return;
        }
        const botUser = await this._getOrCreateBotUser();
        const botText = "Chào bạn! Hiện tại các hỗ trợ viên đang bận. Để trò chuyện tức thì với Trợ lý AI, bạn vui lòng cấu hình Gemini API Key cá nhân trong cài đặt nhé. Hệ thống sẽ tự động trả lời các câu hỏi của bạn ngay lập tức!";
        
        // Check if we already sent this key warning recently to prevent spamming
        const lastBotMsg = await SupportMessage.findOne({ session: session._id, sender: botUser._id }).sort({ createdAt: -1 });
        if (lastBotMsg && lastBotMsg.text.includes("Gemini API Key cá nhân")) {
          return; // Don't repeat key warning consecutively
        }

        const botMessage = await SupportMessage.create({
          session: session._id,
          sender: botUser._id,
          text: botText
        });

        // Update session
        session.lastMessage = botText;
        session.lastMessageAt = new Date();
        session.unreadCount = 0; // AI message read
        await session.save();

        const populatedBotMsg = await SupportMessage.findById(botMessage._id)
          .populate('sender', 'username email avatar')
          .lean();

        const populatedSession = await SupportSession.findById(session._id)
          .populate('student', 'username email avatar')
          .populate('cskh', 'username email avatar')
          .lean();

        this._emitSocketMessage(studentId, populatedBotMsg, populatedSession);
      } catch (err) {
        console.error("[AI Support] Error sending key warning bot message:", err);
      }
      return;
    }

    // Decrypt key
    const cryptoHelper = require('../ai/helpers/crypto');
    const apiKey = cryptoHelper.decrypt(encryptedKey);
    if (!apiKey) {
      return;
    }

    const aiService = require('../ai/ai.service');

    try {
      // Send typing status via Socket
      try {
        getIO().to(`user:${studentId}`).emit('support:typing:receive', { isTyping: true });
      } catch {}

      // Fetch last 9 messages before the new user message as context
      const history = await SupportMessage.find({
        session: session._id,
        _id: { $ne: currentMessageId },
        isSystem: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .limit(9);
      history.reverse();

      const startTime = Date.now();
      const replyText = await aiService.generateSupportReply(apiKey, {
        history,
        newMessage: userMessageText,
        studentId
      });

      // Refetch session to check if a human CSKH was assigned or session is waiting/closed during the AI call
      const latestSession = await SupportSession.findById(session._id);
      if (!latestSession || latestSession.cskh || latestSession.status === 'waiting' || latestSession.status === 'closed') {
        // CSKH agent has assigned the session or it became waiting/closed, abort saving AI response and clear typing status
        try {
          getIO().to(`user:${studentId}`).emit('support:typing:receive', { isTyping: false });
        } catch {}
        return;
      }

      // Clear typing status
      try {
        getIO().to(`user:${studentId}`).emit('support:typing:receive', { isTyping: false });
      } catch {}

      // Get/Create bot user
      const botUser = await this._getOrCreateBotUser();

      const slicedReply = replyText.trim().slice(0, 1000);
      // Save AI reply message
      const botMessage = await SupportMessage.create({
        session: session._id,
        sender: botUser._id,
        text: slicedReply
      });

      // Update session last message
      session.lastMessage = slicedReply;
      session.lastMessageAt = new Date();
      session.unreadCount = 0;
      await session.save();

      const populatedBotMsg = await SupportMessage.findById(botMessage._id)
        .populate('sender', 'username email avatar')
        .lean();

      const populatedSession = await SupportSession.findById(session._id)
        .populate('student', 'username email avatar')
        .populate('cskh', 'username email avatar')
        .lean();

      this._emitSocketMessage(studentId, populatedBotMsg, populatedSession);

      // Log AI usage metrics
      const latencyMs = Date.now() - startTime;
      const AiUsageLog = require('../../models/aiUsageLog.model');
      await AiUsageLog.create({
        user: studentId,
        feature: 'support',
        status: 'success',
        latencyMs,
        inputSize: userMessageText.length,
        outputSize: replyText.length
      }).catch(err => console.error("Error creating support AiUsageLog:", err));

    } catch (aiError) {
      // Clear typing status on error
      try {
        getIO().to(`user:${studentId}`).emit('support:typing:receive', { isTyping: false });
      } catch {}

      console.error("[AI Support] AI response failed:", aiError.message);
      
      // Log error usage
      const AiUsageLog = require('../../models/aiUsageLog.model');
      await AiUsageLog.create({
        user: studentId,
        feature: 'support',
        status: 'error',
        latencyMs: 0,
        errorCode: aiError.status ? `HTTP_${aiError.status}` : aiError.name || 'UNKNOWN_ERROR'
      }).catch(err => console.error("Error creating support AiUsageLog on error:", err));
    }
  }

  // Student: Request human CSKH agent support
  requestCSKH = asyncHandler(async (req, res) => {
    const studentId = req.userId;

    let wasCreatedNewSession = false;
    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      session = await SupportSession.create({ student: studentId, status: 'open' });
      wasCreatedNewSession = true;
    }

    // Idempotent checks
    if (!wasCreatedNewSession && session.status === 'waiting') {
      const populatedSession = await SupportSession.findById(session._id)
        .populate('student', 'username email avatar premium')
        .populate('cskh', 'username email avatar')
        .lean();
      return res.json(ApiResponse.success(populatedSession, 'CSKH connection requested already'));
    }

    if (session.cskh) {
      throw new AppError('Bạn đang được hỗ trợ bởi tư vấn viên.', 400);
    }

    let systemText = '';
    if (session.status === 'closed') {
      systemText = 'Học viên đã yêu cầu kết nối lại với tư vấn viên';
    } else {
      systemText = 'Học viên đã yêu cầu kết nối với tư vấn viên';
    }

    session.status = 'waiting';
    session.lastMessage = systemText;
    session.lastMessageAt = new Date();
    await session.save();

    const systemMessage = await SupportMessage.create({
      session: session._id,
      sender: studentId,
      text: systemText,
      isSystem: true
    });

    const populatedMessage = await SupportMessage.findById(systemMessage._id)
      .populate('sender', 'username email avatar')
      .lean();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    // Broadcast session update to other CSKH agents so they see the waiting session immediately
    try {
      getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
    } catch {}

    this._emitSocketMessage(studentId, populatedMessage, populatedSession);

    res.json(ApiResponse.success(populatedSession, 'CSKH connection requested'));
  });
}

module.exports = new SupportChatController();
