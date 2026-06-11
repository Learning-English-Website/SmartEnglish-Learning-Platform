/**
 * Tạo tài khoản teacher để test (sửa lỗi double hashing)
 * Chạy: node server/src/scripts/createTeacher.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.development') });

const User = require('../modules/user/user.model');

const TEACHER_EMAIL = 'teacher@smartenglish.app';
const TEACHER_USERNAME = 'teacher';
const TEACHER_PASSWORD = 'Teacher@123456';

async function createTeacher() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in env files.');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email: TEACHER_EMAIL });
    if (user) {
      user.role = 'teacher';
      user.isVerified = true;
      user.premium = 'premium';
      user.password = TEACHER_PASSWORD; // Will be hashed once by pre-save hook
      await user.save();
      console.log(`Updated existing user password and role: ${TEACHER_EMAIL}`);
    } else {
      await User.create({
        email: TEACHER_EMAIL,
        username: TEACHER_USERNAME,
        password: TEACHER_PASSWORD, // Will be hashed once by pre-save hook
        role: 'teacher',
        premium: 'premium',
        isVerified: true,
      });
      console.log(`Created teacher account: ${TEACHER_EMAIL}`);
    }

    console.log(`Credentials:`);
    console.log(`  Email: ${TEACHER_EMAIL}`);
    console.log(`  Password: ${TEACHER_PASSWORD}`);

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTeacher();
