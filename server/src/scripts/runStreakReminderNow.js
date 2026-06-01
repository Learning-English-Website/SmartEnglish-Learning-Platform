/*
  Manual runner for streak reminder system.

  Usage:
    node src/scripts/runStreakReminderNow.js

  Notes:
  - Loads env from `.env.${NODE_ENV}` like src/server.js
  - Connects to MongoDB
  - Registers event handlers (email sender listens on eventBus)
  - Runs streak reminder check once and exits
*/

const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, `../../.env.${process.env.NODE_ENV || 'development'}`),
});

require('../config/env');
require('../models');

const connectDB = require('../config/database');

// Register event handlers (includes streak:reminder email sender)
require('../shared/events/eventHandlers');

const streakReminderService = require('../shared/services/streakReminder.service');

async function main() {
  await connectDB();
  const result = await streakReminderService.runDailyCheck(new Date());
  console.log('[runStreakReminderNow] result:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('[runStreakReminderNow] failed:', err);
  process.exit(1);
});
