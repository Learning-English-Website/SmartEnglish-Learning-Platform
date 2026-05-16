/**
 * Jest Setup File
 * Global test configuration and teardown
 */

// Set environment variables BEFORE any app code loads
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Create Redis mock inline to avoid scope issues
const mockRedis = {
  store: new Map(),
  ttls: new Map(),
  get: async function(key) {
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  },
  set: async function(key, value, mode, ttl) {
    this.store.set(key, value);
    if (mode === 'EX' && ttl) {
      this.ttls.set(key, Date.now() + ttl * 1000);
    }
    return 'OK';
  },
  del: async function(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  },
  exists: async function(key) {
    return this.store.has(key) ? 1 : 0;
  },
  clear: function() {
    this.store.clear();
    this.ttls.clear();
  },
};

// Mock Redis before any app code loads
jest.mock('./src/config/redis', () => mockRedis);

// Make mockRedis available globally for tests
global.__mockRedis = mockRedis;

let mongoServer;

// Increase timeout for MongoDB Memory Server
jest.setTimeout(60000);

beforeAll(async () => {
  // Ensure models are registered before tests run
  require('./src/modules/user/user.model'); // User model is in modules/user/
  require('./src/models/flashcardSet.model');
  require('./src/models/flashcard.model');
  require('./src/models/tag.model');
  require('./src/models/folder.model');
  require('./src/models/note.model');
  require('./src/models/studySession.model');
  require('./src/models/share.model');
  require('./src/models/bookmark.model');

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Clear Redis mock
  if (global.__mockRedis) {
    global.__mockRedis.clear();
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
