// Standalone debug script for quest service
require('./jest.setup.js');

(async () => {
  const mongoose = require('mongoose');
  const { MongoMemoryServer } = require('mongodb-memory-server');

  // Wait for beforeAll to complete (jest.setup.js sets up the server)
  // We need to manually connect since we're not in Jest context
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Register models
  require('./src/modules/user/user.model');
  require('./src/models/dailyQuest.model');
  require('./src/models/learningHistory.model');

  const User = require('./src/modules/user/user.model');
  const DailyQuest = require('./src/models/dailyQuest.model');
  const bcrypt = require('bcryptjs');

  // Create user
  const user = await User.create({
    email: 'debug@e.com',
    username: 'debuguser',
    password: await bcrypt.hash('TestPass123!', 10),
    isVerified: true,
  });
  console.log('Created user:', user._id);

  // Check unique index
  const indexes = await DailyQuest.schema.indexes();
  console.log('DailyQuest indexes:', JSON.stringify(indexes));

  // Try creating two quests with same type
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const q1 = await DailyQuest.create({
      user: user._id,
      day: today,
      type: 'xp',
      targetValue: 100,
      xpReward: 15,
    });
    console.log('Created q1:', q1._id);

    const q2 = await DailyQuest.create({
      user: user._id,
      day: today,
      type: 'xp',
      targetValue: 200,
      xpReward: 30,
    });
    console.log('Created q2:', q2._id, 'SUCCESS - unique index does not prevent duplicates!');
  } catch (e) {
    console.log('Duplicate key error:', e.code, e.message);
  }

  // Now test getDailyQuests
  const qs = require('./src/modules/quest/quest.service');
  try {
    const result = await qs.getDailyQuests(user._id);
    console.log('getDailyQuests result:', result.length, 'quests');
    result.forEach(q => console.log(' -', q.type, 'target:', q.targetValue));
  } catch (e) {
    console.error('getDailyQuests ERROR:', e.message);
    console.error(e.stack.split('\n').slice(0, 8).join('\n'));
  }

  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
})().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
