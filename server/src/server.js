require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Validate environment variables first
require('./config/env');

require('./models');

const app = require('./app');
const connectDB = require('./config/database');

// Initialize Redis (connect event logged inside)
require('./config/redis');

// Register all event handlers
require('./shared/events/eventHandlers');

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Run automatic database seeding (safe because seeders check for existing data)
  try {
    const { seedAll } = require('./seeders');
    await seedAll();
  } catch (error) {
    console.error('⚠️ Automatic seeding failed:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
});
