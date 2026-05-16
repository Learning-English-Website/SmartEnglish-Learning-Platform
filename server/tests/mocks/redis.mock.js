/**
 * Redis Mock for Testing
 * Mocks Redis operations using an in-memory Map
 */

class RedisMock {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, ttl) {
    this.store.set(key, value);
    if (mode === 'EX' && ttl) {
      this.ttls.set(key, Date.now() + ttl * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async exists(key) {
    return this.store.has(key) ? 1 : 0;
  }

  // Helper to clear all data
  clear() {
    this.store.clear();
    this.ttls.clear();
  }
}

// Global mock instance
const redisMock = new RedisMock();

module.exports = redisMock;
