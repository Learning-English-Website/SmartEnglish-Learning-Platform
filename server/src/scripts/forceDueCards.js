const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

require('../models');
const CardProgress = require('../models/cardProgress.model');
const User = require('../modules/user/user.model');

async function forceDue() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('Connected to MongoDB.');

    const user = await User.findOne({ email: 'hocitthoii@gmail.com' });
    if (!user) {
      console.log('User hocitthoii@gmail.com not found');
      await mongoose.disconnect();
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await CardProgress.updateMany(
      {
        user: user._id,
        status: { $in: ['LEARNING', 'REVIEW'] }
      },
      {
        $set: { nextReview: yesterday }
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} card(s) to be due for review immediately.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error updating DB:', err);
  }
}

forceDue();
