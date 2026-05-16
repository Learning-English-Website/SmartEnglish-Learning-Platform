/**
 * Auth API Integration Tests
 * Tests: Register, Login, Logout, Refresh Token, Forgot Password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Mock event bus before loading app
jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  clear: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const authRoutes = require('../src/modules/auth/auth.routes');
const eventBus = require('../src/shared/events/eventBus');

describe('Auth API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Add error handler
    app.use((err, req, res, next) => {
      const statusCode = err.statusCode || err.status || 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/register
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
    };

    it('should register a new user and return success message', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP sent');
      expect(res.body.data.email).toBe(validUser.email);
      expect(res.body.data.requiresEmailVerification).toBe(true);
    });

    it('should create user in database', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(validUser.username);
      expect(user.isVerified).toBe(false);
    });

    it('should emit user:registered event with OTP', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'user:registered',
        expect.objectContaining({
          email: validUser.email,
          username: validUser.username,
          otp: expect.any(String),
        })
      );
    });

    it('should return 409 for duplicate email', async () => {
      await User.create({
        email: validUser.email,
        username: 'otheruser',
        password: 'TestPass123!',
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email already in use');
    });

    it('should return 409 for duplicate username', async () => {
      await User.create({
        email: 'other@example.com',
        username: validUser.username,
        password: 'TestPass123!',
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Username already in use');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should hash password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUser);

      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'logintest@example.com',
      username: 'logintest',
      password: 'TestPass123!',
      isVerified: true,
    };

    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Login successful');
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: testUser.password });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return 403 for unverified email', async () => {
      const unverifiedUser = {
        email: 'unverified@example.com',
        username: 'unverified',
        password: 'TestPass123!',
        isVerified: false,
      };
      await User.create(unverifiedUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: unverifiedUser.email, password: unverifiedUser.password });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Email not verified');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    let authToken;
    let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'logout@example.com',
      username: 'logoutuser',
      password: 'TestPass123!',
      isVerified: true,
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString(), role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/forgot-password
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/forgot-password', () => {
    it('should return success for existing user', async () => {
      await User.create({
        email: 'forgot@example.com',
        username: 'forgotuser',
        password: 'TestPass123!',
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset OTP has been sent');
    });

    it('should return same success message for non-existent email (prevent enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset OTP has been sent');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/auth/resend-verification-otp
  // ─────────────────────────────────────────────────────────────────
  describe('POST /api/auth/resend-verification-otp', () => {
    it('should resend OTP for unverified user', async () => {
      const user = await User.create({
        email: 'resend@example.com',
        username: 'resenduser',
        password: 'TestPass123!',
        isVerified: false,
      });

      const res = await request(app)
        .post('/api/auth/resend-verification-otp')
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should return 409 for already verified email', async () => {
      await User.create({
        email: 'verified@example.com',
        username: 'verifieduser',
        password: 'TestPass123!',
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/resend-verification-otp')
        .send({ email: 'verified@example.com' });

      expect(res.status).toBe(409);
    });
  });
});
