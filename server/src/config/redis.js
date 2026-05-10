const Redis = require('ioredis');

let redis;

// In development without Redis, use a mock that logs warnings instead of crashing
const createMockRedis = () => {
  console.warn('⚠️  Redis not available — using in-memory mock (token rotation disabled in dev)');
  const store = new Map();
  return {
    set: async (key, value, ...args) => { store.set(key, value); return 'OK'; },
    get: async (key) => store.get(key) || null,
    del: async (key) => { store.delete(key); return 1; },
    on: () => {},
  };
};

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy: (times) => {
      if (times > 2) return null; // stop retrying
      return Math.min(times * 200, 1000);
    },
    maxRetriesPerRequest: 1,
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => {
    console.warn(`⚠️  Redis unavailable: ${err.message} — falling back to in-memory store`);
    // Swap to mock on first error if not already mocked
    if (redis && redis._events) {
      const mock = createMockRedis();
      Object.assign(redis, mock);
    }
  });

  // Try to connect eagerly — if fails, fall back gracefully
  redis.connect().catch(() => {
    const mock = createMockRedis();
    Object.assign(redis, mock);
  });

} catch (err) {
  console.warn('⚠️  Redis init failed — using in-memory mock');
  redis = createMockRedis();
}

module.exports = redis;
