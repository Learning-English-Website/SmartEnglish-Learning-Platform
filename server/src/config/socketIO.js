const { Server } = require('socket.io');
const cookie = require('cookie');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { verifyAccessToken } = require('../shared/utils/jwt');
const { getDateKey } = require('../shared/utils/dateKey');
const SupportSession = require('../models/supportSession.model');
const SupportMessage = require('../models/supportMessage.model');
const User = require('../modules/user/user.model');

let io = null;
const CALL_TIMEOUT_MS = 45000;

const serializeUser = (user) => {
  if (!user) return null;
  return {
    _id: String(user._id || user.id),
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
};

/**
 * Initialize Socket.IO server attached to the Express HTTP server.
 * Called once from server.js after app.listen().
 */
const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'https://localhost:5173',
        'https://localhost:5174',
        'https://localhost:5175',
        'https://smart-english-learning-platform.vercel.app',
        'https://memoris.site',
        'https://www.memoris.site',
      ].filter(Boolean),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const activeCalls = new Map();

  const getRoomSize = (room) => io.sockets.adapter.rooms.get(room)?.size || 0;

  const findActiveCallForUser = (userId) => {
    const normalizedUserId = String(userId);
    return Array.from(activeCalls.values()).find(call =>
      call.status !== 'ended' &&
      (call.agentId === normalizedUserId || call.studentId === normalizedUserId)
    );
  };

  const clearCallTimeout = (call) => {
    if (call?.timeoutId) {
      clearTimeout(call.timeoutId);
      call.timeoutId = null;
    }
  };

  const getCallSystemText = (reason, callType = 'video') => {
    const callLabel = callType === 'audio' ? 'thoại' : 'video';
    switch (reason) {
      case 'rejected':
        return `Học viên đã từ chối cuộc gọi ${callLabel}`;
      case 'timeout':
        return `Cuộc gọi ${callLabel} đã hết hạn do học viên không phản hồi`;
      case 'disconnect':
        return `Cuộc gọi ${callLabel} đã kết thúc do mất kết nối`;
      case 'media_error':
        return callType === 'audio'
          ? 'Cuộc gọi thoại không thể kết nối microphone'
          : 'Cuộc gọi video không thể kết nối camera hoặc microphone';
      default:
        return `Cuộc gọi ${callLabel} đã kết thúc`;
    }
  };

  const recordCallSystemMessage = async (call, reason, endedBy) => {
    try {
      if (!call?.sessionId) return;

      const text = getCallSystemText(reason, call.callType);
      const sender = endedBy || call.agentId;
      const session = await SupportSession.findByIdAndUpdate(
        call.sessionId,
        {
          lastMessage: text,
          lastMessageAt: new Date(),
        },
        { new: true }
      )
        .populate('student', 'username email avatar premium')
        .populate('cskh', 'username email avatar')
        .lean();

      if (!session) return;

      const message = await SupportMessage.create({
        session: call.sessionId,
        sender,
        text,
        isSystem: true,
      });

      const populatedMessage = await SupportMessage.findById(message._id)
        .populate('sender', 'username email avatar')
        .lean();

      io.to(`user:${call.studentId}`).emit('support:message:receive', {
        message: populatedMessage,
        session,
      });

      const isCskhActive = session.status === 'waiting' || (session.status === 'open' && session.cskh);
      if (isCskhActive) {
        io.to('cskh-agents').emit('support:message:receive', {
          message: populatedMessage,
          session,
        });
      }
    } catch (err) {
      console.warn('[Socket.IO] Failed to record call system message:', err.message);
    }
  };

  const endCall = (callId, reason = 'ended', endedBy = null) => {
    const call = activeCalls.get(callId);
    if (!call) return null;

    clearCallTimeout(call);
    activeCalls.delete(callId);

    const payload = { callId, reason, endedBy };
    io.to(`user:${call.agentId}`).emit('call:ended', payload);
    io.to(`user:${call.studentId}`).emit('call:ended', payload);
    recordCallSystemMessage(call, reason, endedBy);
    return call;
  };

  const emitCallError = (socket, message, code = 'call_error', callId = null) => {
    socket.emit('call:error', { callId, code, message });
  };

  // ── Authentication middleware ───────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const authHeaderToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      const cookieHeader = socket.request.headers.cookie || socket.handshake.headers.cookie;
      const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
      const cookieToken = cookies.accessToken;
      const token = cookieToken || authHeaderToken;

      if (!token) {
        // Allow unauthenticated connections for public events (e.g., public leaderboard)
        socket.userId = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      console.warn('[Socket.IO] Auth failed, continuing as guest:', err.message);
      socket.userId = null;
      socket.userRole = null;
      next();
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}, userId: ${socket.userId}, role: ${socket.userRole}, rooms: ${Array.from(socket.rooms).join(',')}`);

    // Join user-specific private room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);

      if (socket.userRole === 'admin' || socket.userRole === 'cskh') {
        socket.join('cskh-agents');
        console.log(`[Socket.IO] Agent ${socket.userId} joined room cskh-agents`);
      }

      // Notify others (if implementing presence/friends list later)
      socket.broadcast.emit('user:online', { userId: socket.userId });

      // Tell client that auth succeeded
      socket.emit('auth:status', { isAuthenticated: true, userId: socket.userId, role: socket.userRole });
    } else {
      // Tell client that auth failed (guest connection)
      socket.emit('auth:status', { isAuthenticated: false });
    }

    // ── Client → Server events ───────────────────────────────────────────────

    socket.on('dailyChallenge:subscribe', async (payload = {}) => {
      try {
        const requestedDateKey = typeof payload.dateKey === 'string' && payload.dateKey.trim()
          ? payload.dateKey.trim()
          : getDateKey(new Date());
        const room = `dailyChallenge:${requestedDateKey}`;

        socket.data.dailyChallengeRoom = room;
        socket.join(room);

        const dailyChallengeService = require('../modules/quest/dailyChallenge.service');
        const leaderboard = await dailyChallengeService.getLeaderboard(requestedDateKey, { limit: payload.limit || 20 });

        console.log(`[Socket.IO] dailyChallenge:subscribe → socket=${socket.id} userId=${socket.userId} joined room=${room}`);

        socket.emit('dailyChallenge:leaderboard:snapshot', {
          date: requestedDateKey,
          leaderboard,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[Socket.IO] Failed to subscribe daily challenge room:', err.message);
        socket.emit('dailyChallenge:leaderboard:error', {
          message: 'Không thể tải bảng xếp hạng realtime',
        });
      }
    });

    socket.on('dailyChallenge:unsubscribe', (payload = {}) => {
      const requestedDateKey = typeof payload.dateKey === 'string' && payload.dateKey.trim()
        ? payload.dateKey.trim()
        : getDateKey(new Date());
      const room = `dailyChallenge:${requestedDateKey}`;
      socket.leave(room);
      if (socket.data.dailyChallengeRoom === room) {
        socket.data.dailyChallengeRoom = null;
      }
    });

    socket.on('dailyChallenge:join', async (payload = {}, callback) => {
      try {
        if (!socket.userId) {
          return callback({ error: 'unauthorized', message: 'Vui lòng đăng nhập để tham gia Thử thách hằng ngày.' });
        }

        const { challengeId } = payload;
        if (!challengeId) {
          return callback({ error: 'invalid_payload', message: 'Thiếu challengeId.' });
        }

        const dailyChallengeService = require('../modules/quest/dailyChallenge.service');
        const challenge = await dailyChallengeService.joinChallenge(socket.userId, challengeId);

        if (!challenge) {
          return callback({ error: 'not_found', message: 'Thử thách hằng ngày không tìm thấy.' });
        }

        callback(null, {
          success: true,
          challenge,
          lessonId: String(challenge.lesson?._id || challenge.lesson),
          date: challenge.date,
        });
      } catch (err) {
        console.error('[Socket.IO] dailyChallenge:join error:', err.message);
        callback({ error: 'server_error', message: 'Không thể tham gia Thử thách hằng ngày. Vui lòng thử lại.' });
      }
    });

    // Request leaderboard refresh
    socket.on('leaderboard:request', async () => {
      // Will be handled by emitting leaderboard:update back
      socket.emit('leaderboard:request_ack', { received: true });
    });

    // Support typing status
    socket.on('support:typing:send', (payload) => {
      const { isTyping, studentId } = payload || {};
      
      if (socket.userRole === 'admin' || socket.userRole === 'cskh') {
        if (studentId) {
          socket.to(`user:${studentId}`).emit('support:typing:receive', {
            isTyping
          });
        }
      } else {
        if (socket.userId) {
          socket.to('cskh-agents').emit('support:typing:receive', {
            studentId: socket.userId,
            isTyping
          });
        }
      }
    });

    socket.on('call:request', async (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};

      try {
        if (!socket.userId || !['admin', 'cskh'].includes(socket.userRole)) {
          emitCallError(socket, 'Bạn không có quyền bắt đầu cuộc gọi.', 'unauthorized');
          return reply({ success: false, code: 'unauthorized', message: 'Bạn không có quyền bắt đầu cuộc gọi.' });
        }

        const targetUserId = String(payload.targetUserId || payload.studentId || '').trim();
        const sessionId = String(payload.sessionId || '').trim();
        const callType = payload.callType === 'audio' ? 'audio' : 'video';
        if (!targetUserId || !sessionId) {
          emitCallError(socket, 'Thiếu thông tin học viên hoặc phiên hỗ trợ.', 'invalid_payload');
          return reply({ success: false, code: 'invalid_payload', message: 'Thiếu thông tin học viên hoặc phiên hỗ trợ.' });
        }

        if (!mongoose.Types.ObjectId.isValid(targetUserId) || !mongoose.Types.ObjectId.isValid(sessionId)) {
          emitCallError(socket, 'Thông tin cuộc gọi không hợp lệ.', 'invalid_payload');
          return reply({ success: false, code: 'invalid_payload', message: 'Thông tin cuộc gọi không hợp lệ.' });
        }

        const session = await SupportSession.findOne({ _id: sessionId, student: targetUserId })
          .populate('student', 'username email avatar role')
          .populate('cskh', 'username email avatar role');

        if (!session) {
          emitCallError(socket, 'Không tìm thấy phiên hỗ trợ hợp lệ.', 'session_not_found');
          return reply({ success: false, code: 'session_not_found', message: 'Không tìm thấy phiên hỗ trợ hợp lệ.' });
        }

        if (session.status === 'closed') {
          emitCallError(socket, 'Phiên hỗ trợ đã đóng.', 'session_closed');
          return reply({ success: false, code: 'session_closed', message: 'Phiên hỗ trợ đã đóng.' });
        }

        if (socket.userRole !== 'admin' && String(session.cskh?._id || session.cskh) !== String(socket.userId)) {
          emitCallError(socket, 'Bạn cần nhận hỗ trợ phiên này trước khi gọi.', 'not_assigned');
          return reply({ success: false, code: 'not_assigned', message: 'Bạn cần nhận hỗ trợ phiên này trước khi gọi.' });
        }

        const student = session.student?.role ? session.student : await User.findById(targetUserId).select('username email avatar role');
        if (!student || student.role !== 'student') {
          emitCallError(socket, 'Người nhận cuộc gọi không phải học viên hợp lệ.', 'invalid_target');
          return reply({ success: false, code: 'invalid_target', message: 'Người nhận cuộc gọi không phải học viên hợp lệ.' });
        }

        if (getRoomSize(`user:${targetUserId}`) === 0) {
          socket.emit('call:unavailable', { targetUserId, message: 'Học viên hiện không trực tuyến.' });
          return reply({ success: false, code: 'unavailable', message: 'Học viên hiện không trực tuyến.' });
        }

        if (findActiveCallForUser(socket.userId) || findActiveCallForUser(targetUserId)) {
          socket.emit('call:busy', { targetUserId, message: 'Một trong hai bên đang có cuộc gọi khác.' });
          return reply({ success: false, code: 'busy', message: 'Một trong hai bên đang có cuộc gọi khác.' });
        }

        const agent = await User.findById(socket.userId).select('username email avatar role');
        const callId = randomUUID();
        const call = {
          callId,
          sessionId,
          agentId: String(socket.userId),
          studentId: targetUserId,
          agentSocketId: socket.id,
          studentSocketId: null,
          callType,
          status: 'ringing',
          createdAt: Date.now(),
          timeoutId: null,
        };

        call.timeoutId = setTimeout(() => {
          if (!activeCalls.has(callId)) return;
          io.to(`user:${socket.userId}`).emit('call:timeout', { callId, targetUserId, message: 'Học viên không phản hồi cuộc gọi.' });
          io.to(`user:${targetUserId}`).emit('call:timeout', { callId, message: 'Cuộc gọi đã hết hạn.' });
          endCall(callId, 'timeout', null);
        }, CALL_TIMEOUT_MS);

        activeCalls.set(callId, call);

        io.to(`user:${targetUserId}`).emit('call:incoming', {
          callId,
          sessionId,
          callType,
          fromUser: serializeUser(agent),
          student: serializeUser(student),
        });

        reply({ success: true, callId, callType });
      } catch (err) {
        console.error('[Socket.IO] call:request error:', err.message);
        emitCallError(socket, 'Không thể bắt đầu cuộc gọi.', 'server_error');
        reply({ success: false, code: 'server_error', message: 'Không thể bắt đầu cuộc gọi.' });
      }
    });

    socket.on('call:response', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const callId = String(payload.callId || '').trim();
      const accepted = Boolean(payload.accepted);
      const call = activeCalls.get(callId);

      if (!call || call.studentId !== String(socket.userId)) {
        emitCallError(socket, 'Cuộc gọi không còn hợp lệ.', 'invalid_call', callId || null);
        return reply({ success: false, code: 'invalid_call', message: 'Cuộc gọi không còn hợp lệ.' });
      }

      if (call.status !== 'ringing') {
        return reply({ success: false, code: 'call_already_answered', message: 'Cuộc gọi đã được xử lý.' });
      }

      if (!accepted) {
        io.to(`user:${call.agentId}`).emit('call:rejected', { callId, byUserId: socket.userId });
        endCall(callId, 'rejected', socket.userId);
        return reply({ success: true });
      }

      clearCallTimeout(call);
      call.status = 'accepted';
      call.studentSocketId = socket.id;
      io.to(call.agentSocketId).emit('call:accepted', { callId, byUserId: socket.userId });
      socket.to(`user:${call.studentId}`).emit('call:answered_elsewhere', {
        callId,
        answeredBySocketId: socket.id,
      });
      reply({ success: true });
    });

    socket.on('call:signal', (payload = {}) => {
      const callId = String(payload.callId || '').trim();
      const signal = payload.signal || payload.signalData;
      const call = activeCalls.get(callId);

      if (!call || !signal) {
        return emitCallError(socket, 'Tín hiệu cuộc gọi không hợp lệ.', 'invalid_signal', callId || null);
      }

      if (call.status !== 'accepted') {
        return emitCallError(socket, 'Cuộc gọi chưa được chấp nhận.', 'call_not_accepted', callId);
      }

      const fromUserId = String(socket.userId);
      const isAgent = call.agentId === fromUserId;
      const isStudent = call.studentId === fromUserId;
      if (!isAgent && !isStudent) {
        return emitCallError(socket, 'Bạn không thuộc cuộc gọi này.', 'forbidden', callId);
      }

      const targetSocketId = isAgent ? call.studentSocketId : call.agentSocketId;
      if (!targetSocketId) {
        return emitCallError(socket, 'Thiếu thiết bị nhận tín hiệu cuộc gọi.', 'missing_target_socket', callId);
      }

      io.to(targetSocketId).emit('call:signal', {
        callId,
        fromUserId,
        signal,
      });
    });

    socket.on('call:hangup', (payload = {}, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const callId = String(payload.callId || '').trim();
      const call = activeCalls.get(callId);

      if (!call) {
        return reply({ success: true });
      }

      const userId = String(socket.userId);
      if (call.agentId !== userId && call.studentId !== userId) {
        emitCallError(socket, 'Bạn không thuộc cuộc gọi này.', 'forbidden', callId);
        return reply({ success: false, code: 'forbidden' });
      }

      endCall(callId, payload.reason || 'hangup', userId);
      reply({ success: true });
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.userId) {
        const activeCall = findActiveCallForUser(socket.userId);
        const isCallMediaSocket = activeCall &&
          (activeCall.agentSocketId === socket.id || activeCall.studentSocketId === socket.id);
        if (activeCall && (isCallMediaSocket || getRoomSize(`user:${socket.userId}`) <= 1)) {
          endCall(activeCall.callId, 'disconnect', socket.userId);
        }
        socket.broadcast.emit('user:offline', { userId: socket.userId });
      }
    });
  });

  console.log('[Socket.IO] Initialized and ready');
  return io;
};

/**
 * Get the Socket.IO instance (for use in services/controllers).
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO() first.');
  }
  return io;
};

/**
 * Emit an event to a specific user's private room.
 * Coerces userId to string to handle both ObjectId and string inputs.
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${String(userId)}`).emit(event, data);
};

/**
 * Broadcast an event to all connected clients.
 */
const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Emit an event to a named room.
 */
const broadcastToRoom = (room, event, data) => {
  if (!io) return;
  console.log(`[Socket.IO] broadcastToRoom → room="${room}" event="${event}" clients=${io.sockets.adapter.rooms.get(room)?.size ?? '?'}`);
  io.to(room).emit(event, data);
};

module.exports = { initSocketIO, getIO, emitToUser, broadcast, broadcastToRoom };
