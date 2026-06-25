/**
 * Auth API Integration Tests (UC01 - UC04)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Mock event bus before loading app modules
jest.mock('../src/shared/events/eventBus', () => ({
  emit: jest.fn(),
  on: jest.fn(),
}));

const User = require('../src/modules/user/user.model');
const authRoutes = require('../src/modules/auth/auth.routes');
const eventBus = require('../src/shared/events/eventBus');
const { errorHandler } = require('../src/middleware/error.middleware');

describe('Auth API Integration Tests (UC01 - UC04)', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // UC01 - Đăng ký tài khoản
  // ─────────────────────────────────────────────────────────────────
  describe('UC01 - Đăng ký tài khoản', () => {
    const newUser = {
      email: 'vothanhsangtv2023@gmail.com',
      username: 'sangtv2023',
      password: 'Sang01052005',
    };

    it('TC-UC01-01: should register new account successfully and verify with OTP', async () => {
      // 1. Submit registration
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(regRes.status).toBe(201);
      expect(regRes.body.success).toBe(true);
      expect(regRes.body.data.email).toBe(newUser.email.toLowerCase());
      expect(regRes.body.data.requiresEmailVerification).toBe(true);

      // Check user created in DB as unverified
      const dbUser = await User.findOne({ email: newUser.email.toLowerCase() });
      expect(dbUser).toBeTruthy();
      expect(dbUser.isVerified).toBe(false);

      // 2. Retrieve OTP from spied eventBus call
      const regCall = eventBus.emit.mock.calls.find(c => c[0] === 'user:registered');
      expect(regCall).toBeTruthy();
      const otp = regCall[1].otp;
      expect(otp).toBeTruthy();

      // 3. Verify OTP
      const verifyRes = await request(app)
        .post('/api/auth/verify-email-otp')
        .send({
          email: newUser.email,
          otp: otp,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.email).toBe(newUser.email.toLowerCase());
      expect(verifyRes.body.data.accessToken).toBeTruthy();

      // Verify user verified in DB
      const verifiedUser = await User.findOne({ email: newUser.email.toLowerCase() });
      expect(verifiedUser.isVerified).toBe(true);
    });

    it('TC-UC01-03: should reject registration if email is already registered', async () => {
      // Seed pre-existing user
      await User.create({
        email: newUser.email.toLowerCase(),
        username: 'anotheruser',
        password: 'Password123!',
        isVerified: true,
      });

      // Attempt duplicate email registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: newUser.email,
          username: 'studentother',
          password: newUser.password,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Email đã được sử dụng');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UC02 - Đăng nhập
  // ─────────────────────────────────────────────────────────────────
  describe('UC02 - Đăng nhập', () => {
    const testEmail = 'vothanhsangtv2017@gmail.com';
    const testPassword = 'Sang01052005';

    beforeEach(async () => {
      // Clear users collection before each login test
      await User.deleteMany({});
    });

    it('TC-UC02-01: should login successfully with correct credentials', async () => {
      // Seed a verified user
      await User.create({
        email: testEmail,
        username: 'sangtv2017',
        password: testPassword,
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(testEmail);
    });

    it('TC-UC02-02: should fail login with incorrect password', async () => {
      await User.create({
        email: testEmail,
        username: 'sangtv2017',
        password: testPassword,
        isVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Email hoặc mật khẩu không chính xác');
    });

    it('TC-UC02-03: should reject login and trigger OTP send if account is unverified', async () => {
      // Seed unverified user
      await User.create({
        email: 'unverified@gmail.com',
        username: 'unverifieduser',
        password: testPassword,
        isVerified: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@gmail.com',
          password: testPassword,
        });

      // Should return 403 Forbidden with exact message
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Email chưa được xác thực. Vui lòng xác thực mã OTP trước khi đăng nhập.');


      // Check if a new OTP event was emitted
      const otpCall = eventBus.emit.mock.calls.find(c => c[0] === 'user:registered');
      expect(otpCall).toBeTruthy();
      expect(otpCall[1].email).toBe('unverified@gmail.com');
      expect(otpCall[1].otp).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // UC04 - Quên mật khẩu
  // ─────────────────────────────────────────────────────────────────
  describe('UC04 - Quên mật khẩu', () => {
    const testEmail = 'vothanhsangtv2017@gmail.com';
    const originalPassword = 'Sang01052005';
    const newPassword = 'SangNewPassword123';

    it('TC-UC04-01: should recover password successfully using OTP', async () => {
      // 1. Seed user
      await User.create({
        email: testEmail,
        username: 'sangtv2017_forgot',
        password: originalPassword,
        isVerified: true,
      });

      // 2. Request forgot password OTP
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);

      // 3. Extract OTP from emitted event
      const resetCall = eventBus.emit.mock.calls.find(c => c[0] === 'user:passwordResetOtp');
      expect(resetCall).toBeTruthy();
      const otp = resetCall[1].otp;
      expect(otp).toBeTruthy();

      // 4. Verify reset OTP to get resetToken
      const verifyRes = await request(app)
        .post('/api/auth/verify-reset-otp')
        .send({
          email: testEmail,
          otp: otp,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      const resetToken = verifyRes.body.data.resetToken;
      expect(resetToken).toBeTruthy();

      // 5. Reset password with token
      const resetRes = await request(app)
        .post('/api/auth/reset-password-otp')
        .send({
          email: testEmail,
          otp: otp, // legacy verify fallback or empty
          newPassword: newPassword,
          resetToken: resetToken,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.message).toContain('Đặt lại mật khẩu thành công');

      // 6. Verify login with the new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toBeTruthy();
    });
  });
});
