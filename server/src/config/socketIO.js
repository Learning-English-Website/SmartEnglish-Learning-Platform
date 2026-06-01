const { Server } = require('socket.io');
const { verifyAccessToken } = require('../shared/utils/jwt');

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
      ].filter(Boolean),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Authentication middleware ───────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        // Allow unauthenticated connections for public events (e.g., public leaderboard)
        socket.userId = null;
        return next();
      }
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      next();
    } catch {
      // Invalid token → allow as guest
      socket.userId = null;
      next();
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}, userId: ${socket.userId}`);

    // Join user-specific private room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);

      // Notify others (if implementing presence/friends list later)
      socket.broadcast.emit('user:online', { userId: socket.userId });
    }

    // ── Client → Server events ───────────────────────────────────────────────

    // Request leaderboard refresh
    socket.on('leaderboard:request', async () => {
      // Will be handled by emitting leaderboard:update back
      socket.emit('leaderboard:request_ack', { received: true });
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

module.exports = { initSocketIO, getIO, emitToUser, broadcast };
