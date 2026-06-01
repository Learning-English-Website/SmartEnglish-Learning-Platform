/*
  Prepare a specific user for streak reminder testing.

  Usage:
    node src/scripts/setupStreakReminderTestUser.js --email someone@gmail.com

  What it does:
  - Sets streak.current = 3
  - Sets streak.lastStudyDate = yesterday
  - Sets emailReminderEnabled = true
  - Clears lastStreakReminderSentAt so reminder can send today
*/

const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, `../../.env.${process.env.NODE_ENV || 'development'}`),
});

require('../config/env');
require('../models');

const connectDB = require('../config/database');
const User = require('../modules/user/user.model');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[i + 1];
  }
  return out;
}

async function main() {
  const { email } = parseArgs(process.argv.slice(2));
  if (!email) {
    console.error('Missing --email');
    process.exit(1);
  }

  await connectDB();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);

  const updated = await User.findOneAndUpdate(
    { email: String(email).toLowerCase().trim() },
    {
      $set: {
        emailReminderEnabled: true,
        lastStreakReminderSentAt: null,
        'streak.current': 3,
        'streak.lastStudyDate': yesterday,
      },
    },
    { new: true }
  ).select('email username emailReminderEnabled lastStreakReminderSentAt streak');

  if (!updated) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  console.log('[setupStreakReminderTestUser] Updated user:', {
    email: updated.email,
    username: updated.username,
    emailReminderEnabled: updated.emailReminderEnabled,
    lastStreakReminderSentAt: updated.lastStreakReminderSentAt,
    streak: updated.streak,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('[setupStreakReminderTestUser] failed:', err);
  process.exit(1);
});
