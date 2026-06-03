/*
  Prepare a specific user for streak reminder testing.

  Usage:
    node src/scripts/prepareStreakReminderTestUser.js

  What it does:
  - Finds the user by email
  - Sets streak.current to 3 if needed
  - Sets streak.lastStudyDate to yesterday
  - Enables email reminders
  - Clears lastStreakReminderSentAt so today's run can send an email
*/

const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, `../../.env.${process.env.NODE_ENV || 'development'}`),
});

require('../config/env');
require('../models');

const connectDB = require('../config/database');
const User = require('../modules/user/user.model');

const TARGET_EMAIL = 'vothanhsangtv2017@gmail.com';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function yesterdayAtNoon() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  await connectDB();

  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    throw new Error(`User not found: ${TARGET_EMAIL}`);
  }

  user.emailReminderEnabled = true;
  user.streak = {
    ...(user.streak || {}),
    current: Math.max(3, user.streak?.current || 0),
    longest: Math.max(3, user.streak?.longest || 0),
    lastStudyDate: yesterdayAtNoon(),
  };
  user.lastStreakReminderSentAt = null;

  await user.save({ validateBeforeSave: false });

  console.log('[prepareStreakReminderTestUser] updated user:', {
    email: user.email,
    streak: user.streak,
    emailReminderEnabled: user.emailReminderEnabled,
    lastStreakReminderSentAt: user.lastStreakReminderSentAt,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('[prepareStreakReminderTestUser] failed:', err);
  process.exit(1);
});
