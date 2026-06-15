const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const progressService = require('../modules/progress/progress.service');
const CardProgress = require('../models/cardProgress.model');
const Flashcard = require('../models/flashcard.model');
const User = require('../modules/user/user.model');

async function runTests() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('Connected. readyState:', mongoose.connection.readyState);

    // 1. Get a test user and card
    const user = await User.findOne({});
    const card = await Flashcard.findOne({});
    
    if (!user || !card) {
      console.log('No user or card found to test. Skipping DB integration tests.');
      await mongoose.disconnect();
      return;
    }

    const userId = user._id;
    const cardId = card._id;

    console.log(`Testing with user: ${userId}, card: ${cardId}`);

    // Clean up existing progress for this test card & user
    await CardProgress.deleteOne({ user: userId, card: cardId });

    // 2. Test getNewCards - should return our test card because it has no progress
    console.log('\n--- Test getNewCards ---');
    const newCards = await progressService.getNewCards(userId, card.set, 10);
    const hasTestCard = newCards.some(c => c._id.toString() === cardId.toString());
    console.log('Is test card in new cards?', hasTestCard);

    // 3. Test completeLearning - first completion (NEW -> LEARNING)
    console.log('\n--- Test completeLearning (First time) ---');
    const progress1 = await progressService.completeLearning(userId, cardId);
    console.log('First progress state:');
    console.log(`  status: ${progress1.status}`);
    console.log(`  repetitions: ${progress1.repetitions}`);
    console.log(`  interval: ${progress1.interval}`);
    console.log(`  easeFactor: ${progress1.easeFactor}`);
    console.log(`  nextReview: ${progress1.nextReview}`);

    if (progress1.status !== 'LEARNING' || progress1.repetitions !== 1 || progress1.interval !== 1) {
      throw new Error('completeLearning (First time) did not set correct parameters');
    }

    // 4. Test completeLearning - second call (idempotent, already LEARNING)
    console.log('\n--- Test completeLearning (Idempotent second time) ---');
    const progress2 = await progressService.completeLearning(userId, cardId);
    console.log('Second progress state (should be unchanged):');
    console.log(`  status: ${progress2.status}`);
    console.log(`  repetitions: ${progress2.repetitions}`);
    
    if (progress2.repetitions !== 1 || progress2.status !== 'LEARNING') {
      throw new Error('completeLearning is not idempotent!');
    }

    // 5. Test getDueCards - should be due because nextReview is set to 1 day from now, but let's temporarily set nextReview to past
    console.log('\n--- Test getDueCards ---');
    // Set nextReview to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await CardProgress.updateOne({ user: userId, card: cardId }, { nextReview: yesterday });
    
    const dueCards = await progressService.getDueCards(userId, card.set);
    const hasDueCard = dueCards.some(c => c._id.toString() === cardId.toString());
    console.log('Is card in due cards list?', hasDueCard);
    
    if (!hasDueCard) {
      throw new Error('Due card was not retrieved!');
    }

    // 6. Test updateCardProgress - rate Good (q=4)
    console.log('\n--- Test updateCardProgress (Rate Good q=4) ---');
    const progress3 = await progressService.updateCardProgress(userId, cardId, 4);
    console.log('Good progress state:');
    console.log(`  status: ${progress3.status}`);
    console.log(`  repetitions: ${progress3.repetitions}`);
    console.log(`  interval: ${progress3.interval}`);
    console.log(`  easeFactor: ${progress3.easeFactor}`);

    if (progress3.repetitions !== 2 || progress3.interval !== 6) {
      throw new Error('Rating q=4 did not advance repetitions to 2 / interval to 6');
    }

    // 7. Test updateCardProgress - rate Easy (q=5) -> Should transition to REVIEW status (since reps >= 3)
    console.log('\n--- Test updateCardProgress (Rate Easy q=5) ---');
    const progress4 = await progressService.updateCardProgress(userId, cardId, 5);
    console.log('Easy progress state:');
    console.log(`  status: ${progress4.status}`);
    console.log(`  repetitions: ${progress4.repetitions}`);
    console.log(`  interval: ${progress4.interval}`);
    console.log(`  easeFactor: ${progress4.easeFactor}`);

    if (progress4.status !== 'REVIEW' || progress4.repetitions !== 3) {
      throw new Error('Rating q=5 did not transition to REVIEW status');
    }

    // 8. Test updateCardProgress - rate Again (q=0) -> Should reset repetitions to 0, interval to 1, status to LEARNING
    console.log('\n--- Test updateCardProgress (Rate Again q=0) ---');
    const progress5 = await progressService.updateCardProgress(userId, cardId, 0);
    console.log('Again progress state:');
    console.log(`  status: ${progress5.status}`);
    console.log(`  repetitions: ${progress5.repetitions}`);
    console.log(`  interval: ${progress5.interval}`);
    console.log(`  easeFactor: ${progress5.easeFactor}`);

    if (progress5.status !== 'LEARNING' || progress5.repetitions !== 0 || progress5.interval !== 1) {
      throw new Error('Rating q=0 did not reset repetitions to 0, status to LEARNING');
    }

    // Clean up
    await CardProgress.deleteOne({ user: userId, card: cardId });
    console.log('\nAll tests passed successfully!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Test run failed:', error);
    process.exit(1);
  }
}

runTests();
