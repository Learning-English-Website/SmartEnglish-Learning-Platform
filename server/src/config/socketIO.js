const { Server } = require('socket.io');
const cookie = require('cookie');
const { verifyAccessToken } = require('../shared/utils/jwt');
const { getDateKey } = require('../shared/utils/dateKey');

let io = null;

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
          return callback({ error: 'unauthorized', message: 'Vui lòng đăng nhập để tham gia Daily Challenge.' });
        }

        const { challengeId } = payload;
        if (!challengeId) {
          return callback({ error: 'invalid_payload', message: 'Thiếu challengeId.' });
        }

        const dailyChallengeService = require('../modules/quest/dailyChallenge.service');
        const challenge = await dailyChallengeService.joinChallenge(socket.userId, challengeId);

        if (!challenge) {
          return callback({ error: 'not_found', message: 'Daily Challenge không tìm thấy.' });
        }

        callback(null, {
          success: true,
          challenge,
          lessonId: String(challenge.lesson?._id || challenge.lesson),
          date: challenge.date,
        });
      } catch (err) {
        console.error('[Socket.IO] dailyChallenge:join error:', err.message);
        callback({ error: 'server_error', message: 'Không thể tham gia Daily Challenge. Vui lòng thử lại.' });
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

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.userId) {
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
