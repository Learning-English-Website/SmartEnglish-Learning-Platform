import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env.development') });

import User from '../../../server/src/modules/user/user.model.js';

// Helper to brute-force a 6-digit OTP from its SHA256 hash
function findOtpForHash(targetHash) {
  for (let i = 100000; i <= 999999; i++) {
    const otpStr = String(i);
    const hash = crypto.createHash('sha256').update(otpStr).digest('hex');
    if (hash === targetHash) {
      return otpStr;
    }
  }
  return null;
}

test.describe('Auth Flow E2E Tests (UC01 - UC04)', () => {
  let redis;
  const createdEmails = [];

  test.beforeAll(async () => {
    // Connect to database and Redis
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    redis = new Redis(process.env.REDIS_URL);
  });

  test.afterAll(async () => {
    // Cleanup created users
    if (createdEmails.length > 0) {
      await User.deleteMany({ email: { $in: createdEmails } });
    }
    await mongoose.disconnect();
    await redis.quit();
  });

  // ─────────────────────────────────────────────────────────────────
  // UC01 - Đăng ký tài khoản
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC01-01: should register successfully and verify with OTP', async ({ page }) => {
    const uniqueVal = Date.now();
    const email = `vothanhsangtv2023_${uniqueVal}@gmail.com`;
    const username = `sangtv2023${uniqueVal}`;
    const password = 'Sang01052005';
    createdEmails.push(email.toLowerCase());

    // 1. Visit Register Page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 2. Fill registration form
    await page.locator('#register-email').fill(email);
    await page.locator('#register-username').fill(username);
    await page.locator('#register-password').fill(password);
    await page.locator('#register-confirm').fill(password);

    // 3. Submit
    await page.locator('#register-submit').click();

    // 4. Verify redirected to OTP step
    await expect(page).toHaveURL(new RegExp('/register/otp'));
    await expect(page.locator('#register-otp')).toBeVisible();

    // 5. Connect to Redis, get verification OTP hash, and brute force OTP
    let redisData = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      redisData = await redis.get(`otp:verify:${email.toLowerCase()}`);
      if (redisData) break;
      await page.waitForTimeout(500);
    }
    
    expect(redisData).toBeTruthy();
    const { otpHash } = JSON.parse(redisData);
    const otp = findOtpForHash(otpHash);
    expect(otp).toBeTruthy();

    // 6. Enter OTP and submit
    await page.locator('#register-otp').fill(otp);
    await page.locator('#register-submit').click();

    // 7. Verify success toast or redirection to Dashboard
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
  });

  test('TC-UC01-03: should show error when registering an already registered email', async ({ page }) => {
    const uniqueVal = Date.now();
    const existingEmail = `existing_${uniqueVal}@gmail.com`.toLowerCase();
    createdEmails.push(existingEmail);

    // Seed existing user in DB
    await User.create({
      email: existingEmail,
      username: `user_${uniqueVal}`,
      password: 'Password123!',
      isVerified: true,
    });

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('#register-email').fill(existingEmail);
    await page.locator('#register-username').fill(`other${uniqueVal}`);
    await page.locator('#register-password').fill('Sang01052005');
    await page.locator('#register-confirm').fill('Sang01052005');

    await page.locator('#register-submit').click();

    // Should display validation error toast or alert and keep on /register page
    await expect(page.locator('text=Email đã được sử dụng')).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/register'));
  });

  // ─────────────────────────────────────────────────────────────────
  // UC02 - Đăng nhập
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC02-01: should login successfully and redirect to Dashboard', async ({ page }) => {
    const uniqueVal = Date.now();
    const email = `login_success_${uniqueVal}@gmail.com`;
    createdEmails.push(email.toLowerCase());

    // Seed verified user (hashed password plain-text matches)
    await User.create({
      email: email.toLowerCase(),
      username: `loginuser_${uniqueVal}`,
      password: 'Sang01052005', // Trigger model pre-save bcrypt hash
      isVerified: true,
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill('Sang01052005');
    await page.locator('#login-submit').click();

    // Should login successfully and redirect to Home/Dashboard page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
  });

  test('TC-UC02-02: should display error message with wrong password', async ({ page }) => {
    const uniqueVal = Date.now();
    const email = `login_fail_${uniqueVal}@gmail.com`;
    createdEmails.push(email.toLowerCase());

    await User.create({
      email: email.toLowerCase(),
      username: `failuser_${uniqueVal}`,
      password: 'Sang01052005',
      isVerified: true,
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill('WrongPassword');
    await page.locator('#login-submit').click();

    // Verify error toast or warning message is visible
    await expect(page.locator('text=Email hoặc mật khẩu không chính xác')).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/login'));
  });

  test('TC-UC02-03: should redirect to OTP page when logging in with unverified account', async ({ page }) => {
    const uniqueVal = Date.now();
    const email = `unverified_login_${uniqueVal}@gmail.com`;
    createdEmails.push(email.toLowerCase());

    await User.create({
      email: email.toLowerCase(),
      username: `unverified_${uniqueVal}`,
      password: 'Sang01052005',
      isVerified: false,
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill('Sang01052005');
    await page.locator('#login-submit').click();

    // Verify error/redirect alert
    await expect(page.locator('text=Email chưa được xác thực')).toBeVisible();
    
    // System should automatically redirect to OTP page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp(`/register/otp`));

    // 5. Connect to Redis, get verification OTP hash, and brute force OTP
    let redisData = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      redisData = await redis.get(`otp:verify:${email.toLowerCase()}`);
      if (redisData) break;
      await page.waitForTimeout(500);
    }
    
    expect(redisData).toBeTruthy();
    const { otpHash } = JSON.parse(redisData);
    const otp = findOtpForHash(otpHash);
    expect(otp).toBeTruthy();

    // 6. Enter OTP and submit
    await page.locator('#register-otp').fill(otp);
    await page.locator('#register-submit').click();

    // 7. Verify redirection to Dashboard/Home
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
  });

  // ─────────────────────────────────────────────────────────────────
  // UC04 - Quên mật khẩu
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC04-01: should recover password successfully using reset OTP', async ({ page }) => {
    const uniqueVal = Date.now();
    const email = `forgot_${uniqueVal}@gmail.com`;
    createdEmails.push(email.toLowerCase());

    await User.create({
      email: email.toLowerCase(),
      username: `forgot_${uniqueVal}`,
      password: 'OriginalPassword123',
      isVerified: true,
    });

    // 1. Visit Forgot Password Page
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // 2. Fill email and submit
    await page.locator('#forgot-email').fill(email);
    await page.locator('#forgot-submit').click();

    // 3. Verify it shows the OTP and password reset fields
    await expect(page.getByPlaceholder('Mã OTP (6 chữ số)')).toBeVisible();

    // 4. Retrieve OTP from Redis
    let redisData = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      redisData = await redis.get(`otp:reset:${email.toLowerCase()}`);
      if (redisData) break;
      await page.waitForTimeout(500);
    }
    
    expect(redisData).toBeTruthy();
    const { otpHash } = JSON.parse(redisData);
    const otp = findOtpForHash(otpHash);
    expect(otp).toBeTruthy();

    // 5. Fill out reset form
    await page.getByPlaceholder('Mã OTP (6 chữ số)').fill(otp);
    await page.getByPlaceholder('Mật khẩu mới', { exact: true }).fill('SangNewPassword123');
    await page.getByPlaceholder('Nhập lại mật khẩu mới', { exact: true }).fill('SangNewPassword123');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();

    // 6. Verify toast success and redirect to login
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/login'));

    // 7. Login with new password
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill('SangNewPassword123');
    await page.locator('#login-submit').click();

    // 8. Verify redirection to Dashboard
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
  });
});
