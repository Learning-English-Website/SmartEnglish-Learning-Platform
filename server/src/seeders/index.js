require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');

const User = require('../modules/user/user.model');
const Course = require('../models/course.model');
const Unit = require('../models/unit.model');
const Lesson = require('../models/lesson.model');
const Achievement = require('../models/achievement.model');
const FlashcardSet = require('../models/flashcardSet.model');
const Flashcard = require('../models/flashcard.model');
const { seedDuolingo } = require('./duolingo.seeder');

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
  console.log('✅ Seeded users');
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
  console.log('✅ Seeded learning content');
}

async function seedAchievements() {
  const achievements = [
    { key: 'first_login', title: 'Welcome Aboard', description: 'Logged in for the first time', xpReward: 10 },
    { key: 'first_50_xp', title: 'Rising Star', description: 'Earned your first 50 XP', requiredXP: 50, xpReward: 25 },
    { key: 'first_500_xp', title: 'Eager Learner', description: 'Earned 500 XP', requiredXP: 500, xpReward: 50 },
    { key: 'first_1000_xp', title: 'Knowledge Seeker', description: 'Earned 1000 XP', requiredXP: 1000, xpReward: 100 },
    { key: 'streak_3', title: 'On Fire', description: '3-day learning streak', requiredStreak: 3, xpReward: 20 },
    { key: 'streak_7', title: 'Week Warrior', description: '7-day learning streak', requiredStreak: 7, xpReward: 50 },
    { key: 'streak_30', title: 'Unstoppable', description: '30-day learning streak', requiredStreak: 30, xpReward: 200 },
    { key: 'first_flashcard', title: 'Card Collector', description: 'Created your first flashcard', requiredReviews: 1, xpReward: 15 },
    { key: 'cards_50', title: 'Deck Builder', description: 'Created 50 flashcards', requiredReviews: 50, xpReward: 75 },
    { key: 'cards_100', title: 'Master Builder', description: 'Created 100 flashcards', requiredReviews: 100, xpReward: 150 },
  ];
  for (const data of achievements) {
    await Achievement.findOneAndUpdate({ key: data.key }, data, { upsert: true, new: true });
  }
  console.log(`✅ Seeded ${achievements.length} achievements`);
}

async function seedFlashcards() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { console.warn('⚠️ No admin user found, skipping flashcard seeding'); return; }

  const existing = await FlashcardSet.findOne({ user: admin._id, title: 'English Greetings & Introductions' });
  if (existing) { console.log('ℹ️ Sample flashcard set already exists, skipping'); return; }

  const sampleCards = [
    { front: 'Hello', back: 'Xin chào', pronunciation: '/həˈloʊ/', example: 'Hello, how are you?', difficulty: 1 },
    { front: 'Good morning', back: 'Chào buổi sáng', pronunciation: '/ɡʊd ˈmɔːrnɪŋ/', example: 'Good morning! Did you sleep well?', difficulty: 1 },
    { front: 'Nice to meet you', back: 'Rất vui được gặp bạn', pronunciation: '/naɪs tuː miːt juː/', example: "Nice to meet you! I'm Sarah.", difficulty: 2 },
    { front: 'What is your name?', back: 'Tên bạn là gì?', pronunciation: '/wɒt ɪz jɔːr neɪm/', example: 'Hi! What is your name?', difficulty: 1 },
    { front: 'My name is...', back: 'Tên tôi là...', pronunciation: '/maɪ neɪm ɪz/', example: 'My name is John. Nice to meet you!', difficulty: 1 },
    { front: 'Where are you from?', back: 'Bạn đến từ đâu?', pronunciation: '/weər ɑːr juː frɒm/', example: "Where are you from? I'm from Vietnam.", difficulty: 2 },
    { front: 'I am from Vietnam', back: 'Tôi đến từ Việt Nam', pronunciation: '/aɪ æm frɒm ˌviːetˈnɑːm/', example: 'I am from Vietnam.', difficulty: 2 },
    { front: 'Goodbye', back: 'Tạm biệt', pronunciation: '/ɡʊdˈbaɪ/', example: 'Goodbye! See you tomorrow!', difficulty: 1 },
    { front: 'See you later', back: 'Hẹn gặp lại', pronunciation: '/siː juː ˈleɪtər/', example: 'See you later, have a great day!', difficulty: 2 },
    { front: 'Thank you', back: 'Cảm ơn', pronunciation: '/θæŋk juː/', example: 'Thank you for your help!', difficulty: 1 },
  ];

  const flashcardSet = await FlashcardSet.create({
    title: 'English Greetings & Introductions',
    description: 'Learn essential English greetings and how to introduce yourself confidently.',
    user: admin._id,
    isPublic: true,
    cardCount: sampleCards.length,
  });

  const cardsWithSet = sampleCards.map(card => ({ ...card, set: flashcardSet._id }));
  await Flashcard.insertMany(cardsWithSet);
  console.log(`✅ Seeded 1 flashcard set with ${cardsWithSet.length} cards`);
}

async function seedAll() {
  console.log('🌱 Starting automatic database seeding...');
  await seedUsers();
  await seedLearningContent();
  await seedAchievements();
  await seedFlashcards();
  await seedDuolingo();
  console.log('✅ Automatic database seeding completed!');
}

async function run() {
  try {
    await connectDB();
    await seedAll();
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  seedAll,
  seedUsers,
  seedLearningContent,
  seedAchievements,
  seedFlashcards,
  seedDuolingo
};
