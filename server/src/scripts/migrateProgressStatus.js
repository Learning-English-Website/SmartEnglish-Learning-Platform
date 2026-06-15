const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const CardProgress = require('../models/cardProgress.model');

async function runMigration() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in env');
    }
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('MongoDB connected.');

    const records = await CardProgress.find({});
    console.log(`Found ${records.length} total progress records.`);

    let updatedCount = 0;
    for (const record of records) {
      let targetStatus = 'NEW';
      if (record.repetitions >= 3) {
        targetStatus = 'REVIEW';
      } else if (record.repetitions > 0 || record.totalReviews > 0) {
        targetStatus = 'LEARNING';
      }

      if (record.status !== targetStatus) {
        record.status = targetStatus;
        await record.save();
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} records.`);
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
