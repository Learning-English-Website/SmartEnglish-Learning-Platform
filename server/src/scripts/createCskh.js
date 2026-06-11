/**
 * Tạo tài khoản CSKH (Sửa lỗi double-hash mật khẩu)
 * Chạy: node server/src/scripts/createCskh.js
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables (supports .env and .env.development)
const envDevPath = path.join(__dirname, '../../.env.development');
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envDevPath)) {
  require('dotenv').config({ path: envDevPath });
} else {
  require('dotenv').config({ path: envPath });
}

const User = require('../modules/user/user.model');

const CSKH_EMAIL = 'cskh@gmail.com';
const CSKH_USERNAME = 'cskh';
const CSKH_PASSWORD = 'Memoris123'; // Pass plain-text, Mongoose hook will hash it automatically

async function createCSKH() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in env variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: CSKH_EMAIL });
    if (existing) {
      existing.role = 'cskh';
      existing.isVerified = true;
      existing.password = CSKH_PASSWORD; // Assign plain-text, pre-save hook will hash it
      await existing.save();
      console.log(`Updated existing user: password reset to plain text '${CSKH_PASSWORD}' and hashed by pre-save hook.`);
    } else {
      await User.create({
        email: CSKH_EMAIL,
        username: CSKH_USERNAME,
        password: CSKH_PASSWORD, // Mongoose hook will hash it once!
        role: 'cskh',
        isVerified: true,
      });
      console.log(`Created CSKH account: ${CSKH_EMAIL}`);
      console.log(`  Username: ${CSKH_USERNAME}`);
      console.log(`  Password: ${CSKH_PASSWORD}`);
    }

    await mongoose.disconnect();
    console.log('Done resetting CSKH account password successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createCSKH();
