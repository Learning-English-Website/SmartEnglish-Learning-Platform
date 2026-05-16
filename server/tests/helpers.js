/**
 * Test Helpers
 * Shared utilities for integration tests
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

/**
 * Create a test user directly in DB
 */
async function createTestUser(overrides = {}) {
  const User = mongoose.model('User') || require('../src/models/user.model');
  
  const defaultUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: await bcrypt.hash('TestPass123!', 10),
    isVerified: true,
    ...overrides,
  };
  
  return User.create(defaultUser);
}

/**
 * Generate JWT tokens for a user
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * Create authenticated request
 */
async function authenticatedRequest(app, user) {
  const tokens = generateTokens(user);
  
  const req = request.agent(app);
  req.set('Authorization', `Bearer ${tokens.accessToken}`);
  req.cookies = {};
  
  return req;
}

/**
 * Create unauthenticated request
 */
function createRequest(app) {
  return request.agent(app);
}

/**
 * Create Express app for testing (mock app without server)
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

/**
 * Create a flashcard set for testing
 */
async function createTestSet(userId, overrides = {}) {
  const FlashcardSet = mongoose.model('FlashcardSet') || require('../src/models/flashcardSet.model');
  
  const defaultSet = {
    title: `Test Set ${Date.now()}`,
    description: 'Test description',
    language: 'English',
    user: userId,
    isPublic: false,
    cardCount: 0,
    ...overrides,
  };
  
  return FlashcardSet.create(defaultSet);
}

/**
 * Create a flashcard for testing
 */
async function createTestCard(setId, overrides = {}) {
  const Flashcard = mongoose.model('Flashcard') || require('../src/models/flashcard.model');
  
  const defaultCard = {
    setId,
    front: 'Hello',
    back: 'Xin chào',
    pronunciation: '/həˈloʊ/',
    example: 'Hello, how are you?',
    ...overrides,
  };
  
  return Flashcard.create(defaultCard);
}

/**
 * Create a tag for testing
 */
async function createTestTag(userId, overrides = {}) {
  const Tag = mongoose.model('Tag') || require('../src/models/tag.model');
  
  const defaultTag = {
    name: `tag_${Date.now()}`,
    user: userId,
    ...overrides,
  };
  
  return Tag.create(defaultTag);
}

/**
 * Create a folder for testing
 */
async function createTestFolder(userId, overrides = {}) {
  const Folder = mongoose.model('Folder') || require('../src/models/folder.model');
  
  const defaultFolder = {
    name: `Folder ${Date.now()}`,
    user: userId,
    parentId: null,
    sets: [],
    ...overrides,
  };
  
  return Folder.create(defaultFolder);
}

/**
 * Assert response structure helper
 */
function assertResponse(res, expectedStatus = 200) {
  if (res.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(res.body)}`
    );
  }
}

/**
 * Assert error response
 */
function assertError(res, expectedStatus, expectedMessage = null) {
  expect(res.status).toBe(expectedStatus);
  if (expectedMessage) {
    expect(res.body.message || res.body.error).toBe(expectedMessage);
  }
}

/**
 * Clean up helper - ensure models are registered
 */
async function ensureModelsRegistered() {
  try {
    require('../src/models/user.model');
    require('../src/models/flashcardSet.model');
    require('../src/models/flashcard.model');
    require('../src/models/tag.model');
    require('../src/models/folder.model');
  } catch (e) {
    // Models might already be registered
  }
}

module.exports = {
  createTestUser,
  generateTokens,
  authenticatedRequest,
  createRequest,
  createTestApp,
  createTestSet,
  createTestCard,
  createTestTag,
  createTestFolder,
  assertResponse,
  assertError,
  ensureModelsRegistered,
};
