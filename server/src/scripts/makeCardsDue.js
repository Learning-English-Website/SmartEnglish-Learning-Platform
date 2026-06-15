const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const CardProgress = require('../models/cardProgress.model');
const Flashcard = require('../models/flashcard.model');
const User = require('../modules/user/user.model');

async function makeCardsDue() {
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

    const cardsToMakeDue = ['sun', 'moon', 'star', 'rain'];
    const cards = await Flashcard.find({ front: { $in: cardsToMakeDue } });
    console.log(`Found ${cards.length} cards in Flashcard collection.`);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3); // 3 days ago

    for (const card of cards) {
      let progress = await CardProgress.findOne({ user: user._id, card: card._id });
      if (!progress) {
        progress = new CardProgress({
          user: user._id,
          card: card._id,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 1,
          nextReview: pastDate,
          status: 'LEARNING'
        });
      } else {
        progress.nextReview = pastDate;
        progress.status = 'LEARNING';
        progress.repetitions = 1;
        progress.interval = 1;
        progress.easeFactor = 2.5;
        progress.lapses = 0;
      }
      await progress.save();
      console.log(`Updated progress for "${card.front}" to be due (nextReview: ${pastDate.toISOString()})`);
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  }
}

makeCardsDue();
