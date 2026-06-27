const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.development') });

const Folder = require('../models/folder.model');

const FAVORITE_FOLDER_NAME = 'Yêu thích';

async function runCleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in env');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });

    const result = await Folder.deleteMany({ name: FAVORITE_FOLDER_NAME });
    console.log(`Cleanup complete. Removed ${result.deletedCount} legacy favorite folder(s).`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

runCleanup();
