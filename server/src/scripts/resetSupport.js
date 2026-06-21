require('dotenv').config({ path: '.env.development' });
const mongoose = require('mongoose');

const connectDB = require('../config/database');
require('../models/supportSession.model');
require('../models/supportMessage.model');

connectDB().then(async () => {
  const SupportSession = mongoose.model('SupportSession');
  const SupportMessage = mongoose.model('SupportMessage');

  // Delete all sessions and messages to start completely fresh
  await SupportSession.deleteMany({});
  await SupportMessage.deleteMany({});

  console.log("SUCCESS: Deleted all support sessions and messages. You can now test support chat fresh!");
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
