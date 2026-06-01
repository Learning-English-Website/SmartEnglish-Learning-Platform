require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Validate environment variables first
require('./config/env');

require('./models');

const app = require('./app');
const connectDB = require('./config/database');

// Initialize Redis (connect event logged inside)
require('./config/redis');

  // Register all event handlers (Node EventEmitter — no HTTP needed)
  require('./shared/events/eventHandlers');

  // ── Schedulers ───────────────────────────────────────────────────────────────
  // Streak reminder email/in-app notification at 20:00 daily
  require('./shared/schedulers/streakReminder.scheduler').start();

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Run automatic database seeding (safe because seeders check for existing data)
  try {
    const { seedAll } = require('./seeders');
    await seedAll();
  } catch (error) {
    console.error('⚠️ Automatic seeding failed:', error.message);
  }

  const httpServer = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });

  // ── Socket.IO initialization ──────────────────────────────────────────────────
  const { initSocketIO } = require('./config/socketIO');
  const { registerSocketHandlers } = require('./shared/events/socketHandlers');
  const io = initSocketIO(httpServer);
  registerSocketHandlers();

  // Make io accessible globally for convenience (e.g., in services)
  app.set('io', io);
});
