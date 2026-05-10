require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');

const User = require('../modules/user/user.model');
const Course = require('../models/course.model');
const Unit = require('../models/unit.model');
const Lesson = require('../models/lesson.model');

async function seedUsers() {
  const users = [
    {
      email: 'admin@gmail.com',
      username: 'adminmemoris',
      password: 'Memoris123',
      role: 'admin',
      isVerified: true,
      premium: 'premium',
    },
    {
      email: 'student@gmail.com',
      username: 'studentmemoris',
      password: 'Memoris123',
      role: 'student',
      isVerified: true,
      premium: 'free',
    },
  ];

  for (const input of users) {
    let existing = await User.findOne({ username: input.username }).select('+password');
    if (!existing) existing = await User.findOne({ email: input.email }).select('+password');
    if (!existing) existing = await User.findOne({ role: input.role }).select('+password');
    if (!existing) {
      await User.create(input);
      continue;
    }
    existing.email = input.email;
    existing.username = input.username;
    existing.role = input.role;
    existing.isVerified = true;
    existing.premium = input.premium;
    existing.password = input.password;
    await existing.save();
  }
}

async function seedLearningContent() {
  const course = await Course.findOneAndUpdate(
    { slug: 'english-beginner-core' },
    {
      slug: 'english-beginner-core',
      title: 'English Beginner Core',
      description: 'Starter course for daily English practice.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'beginner',
      order: 1,
      isPublished: true,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const unit = await Unit.findOneAndUpdate(
    { course: course._id, order: 1 },
    {
      course: course._id,
      title: 'Greetings & Introductions',
      summary: 'Learn basic greetings and self-introduction patterns.',
      order: 1,
      xpReward: 20,
      isLockedDefault: false,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  await Lesson.findOneAndUpdate(
    { unit: unit._id, order: 1 },
    {
      unit: unit._id,
      title: 'Say Hello Naturally',
      subtitle: 'Hi, hello, good morning, and friendly responses.',
      order: 1,
      xpReward: 10,
      estimatedMinutes: 6,
      grammarFocus: ['be verb'],
      vocabFocus: ['hello', 'hi', 'good morning'],
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

async function run() {
  try {
    await connectDB();
    await seedUsers();
    await seedLearningContent();
    console.log('✅ Seed completed');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
