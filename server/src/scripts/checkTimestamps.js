const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

require('../models'); // register all schemas
const CardProgress = require('../models/cardProgress.model');
const User = require('../modules/user/user.model');

async function checkTimestamps() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { family: 4 });
    
    const user = await User.findOne({ email: 'hocitthoii@gmail.com' });
    if (!user) {
      console.log('User not found');
      await mongoose.disconnect();
      return;
    }

    const records = await CardProgress.find({ user: user._id, status: 'LEARNING' }).populate('card');
    console.log(`User: ${user.email}`);
    console.log(`Current Time (UTC): ${new Date().toISOString()}`);

    for (const record of records.slice(0, 5)) {
      console.log(`\n- Card: "${record.card ? record.card.front : 'Unknown'}"`);
      console.log(`  createdAt: ${record.createdAt.toISOString()} (${record.createdAt.toString()})`);
      console.log(`  updatedAt: ${record.updatedAt.toISOString()} (${record.updatedAt.toString()})`);
      console.log(`  nextReview: ${record.nextReview.toISOString()} (${record.nextReview.toString()})`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkTimestamps();
