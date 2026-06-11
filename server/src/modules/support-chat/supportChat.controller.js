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
      // Send message to student's room
      io.to(`user:${studentId}`).emit('support:message:receive', message);
      // Send message & updated session details to CSKH agents
      io.to('cskh-agents').emit('support:message:receive', { message, session });
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
      .sort({ createdAt: 1 })
      .lean();

    res.json(ApiResponse.success({ session, messages }, 'Chat history fetched'));
  });

  // Student: Send message
  sendStudentMessage = asyncHandler(async (req, res) => {
    const studentId = req.userId;
    const { text } = req.body;
    if (!text || !text.trim()) {
      throw new AppError('Message text is required', 400);
    }

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      session = await SupportSession.create({ student: studentId });
    }

    session.lastMessage = text.trim();
    session.lastMessageAt = new Date();
    session.unreadCount += 1;
    session.status = 'open'; // Re-open if closed
    await session.save();

    const message = await SupportMessage.create({
      session: session._id,
      sender: studentId,
      text: text.trim()
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

  // CSKH: Send message to student
  sendCSKHMessage = asyncHandler(async (req, res) => {
    const cskhId = req.userId;
    const { studentId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      throw new AppError('Message text is required', 400);
    }

    let session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      session = await SupportSession.create({ student: studentId, cskh: cskhId });
    } else {
      session.cskh = cskhId; // Auto-assign to current replier if not already assigned
    }

    session.lastMessage = text.trim();
    session.lastMessageAt = new Date();
    session.unreadCount = 0; // CSKH has read the messages
    session.status = 'open';
    await session.save();

    const message = await SupportMessage.create({
      session: session._id,
      sender: cskhId,
      text: text.trim()
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
    const { status = 'open' } = req.query; // can filter by open/closed
    const sessions = await SupportSession.find({ status })
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

    session.cskh = cskhId;
    await session.save();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    // Broadcast the updated session detail
    try {
      getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
    } catch {}

    res.json(ApiResponse.success(populatedSession, 'Session assigned to agent'));
  });

  // CSKH: Close session
  closeSession = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    const session = await SupportSession.findOne({ student: studentId });
    if (!session) {
      throw new AppError('Support session not found', 404);
    }

    session.status = 'closed';
    await session.save();

    const populatedSession = await SupportSession.findById(session._id)
      .populate('student', 'username email avatar premium')
      .populate('cskh', 'username email avatar')
      .lean();

    try {
      getIO().to('cskh-agents').emit('support:session:updated', populatedSession);
      getIO().to(`user:${studentId}`).emit('support:session:closed', populatedSession);
    } catch {}

    res.json(ApiResponse.success(populatedSession, 'Session closed'));
  });
}

module.exports = new SupportChatController();
