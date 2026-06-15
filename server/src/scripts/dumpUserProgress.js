const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const CardProgress = require('../models/cardProgress.model');
const Flashcard = require('../models/flashcard.model');
const User = require('../modules/user/user.model');

async function dumpProgress() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('Connected.');

    const now = new Date();
    console.log('Current system time (UTC):', now.toISOString());
    console.log('Current system time (Local):', now.toString());

    const progressRecords = await CardProgress.find({}).populate('card');
    console.log(`\nFound ${progressRecords.length} CardProgress records in the database:`);

    for (const record of progressRecords) {
      const cardFront = record.card ? record.card.front : 'Unknown card';
      const user = await User.findById(record.user).select('email username');
      const userEmail = user ? user.email : 'Unknown user';

      console.log(`\n- User: ${userEmail} (${record.user})`);
      console.log(`  Card: "${cardFront}" (${record.card?._id})`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Repetitions: ${record.repetitions}`);
      console.log(`  Interval: ${record.interval} days`);
      console.log(`  EaseFactor: ${record.easeFactor}`);
      console.log(`  nextReview: ${record.nextReview.toISOString()} (${record.nextReview.toString()})`);
      console.log(`  lastReview: ${record.lastReview ? record.lastReview.toISOString() : 'never'}`);
      console.log(`  Is due now? ${new Date(record.nextReview) <= now ? '✅ YES' : '❌ NO'}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected.');
  } catch (error) {
    console.error('Error dumping progress:', error);
    process.exit(1);
  }
}

dumpProgress();
