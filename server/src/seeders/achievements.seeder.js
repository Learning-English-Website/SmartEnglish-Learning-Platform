require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');
const Achievement = require('../models/achievement.model');

const achievements = [
  {
    key: 'first_login',
    title: 'Welcome Aboard',
    description: 'Logged in for the first time',
    xpReward: 10,
  },
  {
    key: 'first_50_xp',
    title: 'Rising Star',
    description: 'Earned your first 50 XP',
    requiredXP: 50,
    xpReward: 25,
  },
  {
    key: 'first_500_xp',
    title: 'Eager Learner',
    description: 'Earned 500 XP',
    requiredXP: 500,
    xpReward: 50,
  },
  {
    key: 'first_1000_xp',
    title: 'Knowledge Seeker',
    description: 'Earned 1000 XP',
    requiredXP: 1000,
    xpReward: 100,
  },
  {
    key: 'streak_3',
    title: 'On Fire',
    description: '3-day learning streak',
    requiredStreak: 3,
    xpReward: 20,
  },
  {
    key: 'streak_7',
    title: 'Week Warrior',
    description: '7-day learning streak',
    requiredStreak: 7,
    xpReward: 50,
  },
  {
    key: 'streak_30',
    title: 'Unstoppable',
    description: '30-day learning streak',
    requiredStreak: 30,
    xpReward: 200,
  },
  {
    key: 'first_flashcard',
    title: 'Card Collector',
    description: 'Created your first flashcard',
    requiredReviews: 1,
    xpReward: 15,
  },
  {
    key: 'cards_50',
    title: 'Deck Builder',
    description: 'Created 50 flashcards',
    requiredReviews: 50,
    xpReward: 75,
  },
  {
    key: 'cards_100',
    title: 'Master Builder',
    description: 'Created 100 flashcards',
    requiredReviews: 100,
    xpReward: 150,
  },
];

async function seedAchievements() {
  for (const data of achievements) {
    await Achievement.findOneAndUpdate(
      { key: data.key },
      data,
      { upsert: true, new: true }
    );
  }
  console.log(`✅ Seeded ${achievements.length} achievements`);
}

async function run() {
  try {
    await connectDB();
    await seedAchievements();
    console.log('✅ Achievement seeder completed');
  } catch (error) {
    console.error('❌ Achievement seeder failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
