const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const CardProgress = require('../models/cardProgress.model');
const Flashcard = require('../models/flashcard.model');
const FlashcardSet = require('../models/flashcardSet.model');
const User = require('../modules/user/user.model');

async function checkUser() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('Connected.');

    const user = await User.findOne({ email: 'hocitthoii@gmail.com' });
    if (!user) {
      console.log('User hocitthoii@gmail.com not found!');
      await mongoose.disconnect();
      return;
    }

    console.log(`User found: ${user.username} (${user._id}), Role: ${user.role}, Premium: ${user.premium}`);

    const sets = await FlashcardSet.find({ user: user._id });
    console.log(`\nUser has ${sets.length} flashcard sets:`);
    for (const set of sets) {
      const cards = await Flashcard.find({ set: set._id });
      console.log(`- Set: "${set.title}" (${set._id}) with ${cards.length} cards`);
    }

    const progressRecords = await CardProgress.find({ user: user._id }).populate('card');
    console.log(`\nUser has ${progressRecords.length} progress records:`);
    for (const record of progressRecords) {
      const cardFront = record.card ? record.card.front : 'Unknown card';
      console.log(`- Card: "${cardFront}" (${record.card?._id})`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Repetitions: ${record.repetitions}`);
      console.log(`  Interval: ${record.interval}`);
      console.log(`  EaseFactor: ${record.easeFactor}`);
      console.log(`  NextReview: ${record.nextReview.toISOString()}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUser();
