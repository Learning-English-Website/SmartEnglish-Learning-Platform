require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');
const FlashcardSet = require('../models/flashcardSet.model');
const Flashcard = require('../models/flashcard.model');
const User = require('../modules/user/user.model');

const sampleSet = {
  title: 'English Greetings & Introductions',
  description: 'Learn essential English greetings and how to introduce yourself confidently.',
  isPublic: true,
  cardCount: 10,
};

const sampleCards = [
  {
    front: 'Hello',
    back: 'Xin chào',
    pronunciation: '/həˈloʊ/',
    example: 'Hello, how are you?',
    difficulty: 1,
  },
  {
    front: 'Good morning',
    back: 'Chào buổi sáng',
    pronunciation: '/ɡʊd ˈmɔːrnɪŋ/',
    example: 'Good morning! Did you sleep well?',
    difficulty: 1,
  },
  {
    front: 'Nice to meet you',
    back: 'Rất vui được gặp bạn',
    pronunciation: '/naɪs tuː miːt juː/',
    example: "Nice to meet you! I'm Sarah.",
    difficulty: 2,
  },
  {
    front: 'What is your name?',
    back: 'Tên bạn là gì?',
    pronunciation: '/wɒt ɪz jɔːr neɪm/',
    example: 'Hi! What is your name?',
    difficulty: 1,
  },
  {
    front: 'My name is...',
    back: 'Tên tôi là...',
    pronunciation: '/maɪ neɪm ɪz/',
    example: 'My name is John. Nice to meet you!',
    difficulty: 1,
  },
  {
    front: 'Where are you from?',
    back: 'Bạn đến từ đâu?',
    pronunciation: '/weər ɑːr juː frɒm/',
    example: "Where are you from? I'm from Vietnam.",
    difficulty: 2,
  },
  {
    front: 'I am from Vietnam',
    back: 'Tôi đến từ Việt Nam',
    pronunciation: '/aɪ æm frɒm ˌviːetˈnɑːm/',
    example: 'I am from Vietnam. It is a beautiful country.',
    difficulty: 2,
  },
  {
    front: 'Goodbye',
    back: 'Tạm biệt',
    pronunciation: '/ɡʊdˈbaɪ/',
    example: 'Goodbye! See you tomorrow!',
    difficulty: 1,
  },
  {
    front: 'See you later',
    back: 'Hẹn gặp lại',
    pronunciation: '/siː juː ˈleɪtər/',
    example: 'See you later, have a great day!',
    difficulty: 2,
  },
  {
    front: 'Thank you',
    back: 'Cảm ơn',
    pronunciation: '/θæŋk juː/',
    example: 'Thank you for your help!',
    difficulty: 1,
  },
];

async function seedFlashcards() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.warn('⚠️ No admin user found, skipping flashcard seeding');
    return;
  }

  const existing = await FlashcardSet.findOne({
    user: admin._id,
    title: sampleSet.title,
  });
  if (existing) {
    console.log('ℹ️ Sample flashcard set already exists, skipping');
    return;
  }

  const flashcardSet = await FlashcardSet.create({
    ...sampleSet,
    user: admin._id,
  });

  const cardsWithSet = sampleCards.map(card => ({
    ...card,
    set: flashcardSet._id,
  }));
  await Flashcard.insertMany(cardsWithSet);

  flashcardSet.cardCount = cardsWithSet.length;
  await flashcardSet.save();

  console.log(`✅ Seeded 1 flashcard set with ${cardsWithSet.length} cards`);
}

async function run() {
  try {
    await connectDB();
    await seedFlashcards();
    console.log('✅ Flashcard seeder completed');
  } catch (error) {
    console.error('❌ Flashcard seeder failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
