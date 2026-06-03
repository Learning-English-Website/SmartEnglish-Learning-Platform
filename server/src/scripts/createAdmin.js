/**
 * Tạo tài khoản admin
 * Chạy: node server/src/scripts/createAdmin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.development') });

const User = require('../modules/user/user.model');

const ADMIN_EMAIL = 'admin@smartenglish.app';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@123456';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      existing.role = 'admin';
      existing.isVerified = true;
      existing.premium = 'premium';
      await existing.save();
      console.log(`Updated existing user to admin: ${ADMIN_EMAIL}`);
    } else {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await User.create({
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        password: hashed,
        role: 'admin',
        premium: 'premium',
        isVerified: true,
      });
      console.log(`Created admin account: ${ADMIN_EMAIL}`);
      console.log(`  Username: ${ADMIN_USERNAME}`);
      console.log(`  Password: ${ADMIN_PASSWORD}`);
    }

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
