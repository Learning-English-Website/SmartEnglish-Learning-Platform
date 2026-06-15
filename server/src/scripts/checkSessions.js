const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const StudySession = require('../models/studySession.model');
const CardProgress = require('../models/cardProgress.model');
const User = require('../modules/user/user.model');

async function checkSessions() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('Connected to MongoDB.');

    // Find the latest study sessions
    const sessions = await StudySession.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`\nLast 5 Study Sessions:`);
    for (const session of sessions) {
      const user = await User.findById(session.user).select('email username');
      console.log(`- Session ID: ${session._id}`);
      console.log(`  User: ${user ? user.email : 'Unknown'} (${session.user})`);
      console.log(`  Cards Reviewed: ${session.cardsReviewed}`);
      console.log(`  Accuracy: ${session.accuracy}%`);
      console.log(`  Created At: ${session.createdAt}`);
      console.log(`  Completed At: ${session.completedAt || 'In progress'}`);
    }

    // Also let's find the user who has 17 learning cards
    const progressRecords = await CardProgress.find({});
    const userCardCounts = {};
    for (const record of progressRecords) {
      const uId = record.user.toString();
      if (!userCardCounts[uId]) {
        userCardCounts[uId] = {
          total: 0,
          NEW: 0,
          LEARNING: 0,
          REVIEW: 0,
          due: 0
        };
      }
      userCardCounts[uId].total++;
      userCardCounts[uId][record.status]++;
      if (['LEARNING', 'REVIEW'].includes(record.status) && new Date(record.nextReview) <= new Date()) {
        userCardCounts[uId].due++;
      }
    }

    console.log(`\nUser progress breakdown:`);
    for (const [uId, counts] of Object.entries(userCardCounts)) {
      const user = await User.findById(uId).select('email');
      console.log(`- User: ${user ? user.email : 'Unknown'} (${uId})`);
      console.log(`  Total cards in Progress: ${counts.total}`);
      console.log(`  NEW: ${counts.NEW}`);
      console.log(`  LEARNING: ${counts.LEARNING}`);
      console.log(`  REVIEW: ${counts.REVIEW}`);
      console.log(`  DUE TODAY: ${counts.due}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkSessions();
