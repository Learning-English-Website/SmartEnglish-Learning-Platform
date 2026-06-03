require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');

const DailyChallenge = require('../models/dailyChallenge.model');
const DailyChallengeScore = require('../models/dailyChallengeScore.model');

async function resetDailyChallengeData() {
  await connectDB();

  const [challengeResult, scoreResult] = await Promise.all([
    DailyChallenge.deleteMany({}),
    DailyChallengeScore.deleteMany({}),
  ]);

  console.log('✅ Reset Daily Challenge data');
  console.log(`- DailyChallenge deleted: ${challengeResult.deletedCount ?? 0}`);
  console.log(`- DailyChallengeScore deleted: ${scoreResult.deletedCount ?? 0}`);
}

resetDailyChallengeData()
  .catch((error) => {
    console.error('❌ Reset failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
