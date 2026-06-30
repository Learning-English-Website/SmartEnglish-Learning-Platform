import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load server environment variables for database connection
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env.development') });

import User from '../../../server/src/modules/user/user.model.js';

test.describe('Admin User Management Operations (UC28)', () => {
  let studentUser;

  test.beforeAll(async () => {
    // Connect to development database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Seed a unique student user for admin management testing per worker
    const uniqueId = Date.now() + '_' + Math.floor(Math.random() * 1000);
    studentUser = await User.create({
      email: `student_e2e_${uniqueId}@example.com`,
      username: `student_e2e_${uniqueId}`,
      password: 'Memoris123_password_hash', // Dummy
      role: 'student',
      isVerified: true,
    });
  });

  test.afterAll(async () => {
    // Cleanup seeded data
    if (studentUser) {
      await User.deleteOne({ _id: studentUser._id });
    }
    await mongoose.disconnect();
  });

  test.beforeEach(async ({ page, isMobile }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill('admin@gmail.com');
    await page.locator('#login-password').fill('Memoris123');
    await page.locator('#login-submit').click();
    await page.waitForURL(/\/(dashboard|admin|$)/, { timeout: 15000 });

    // If on mobile view, collapse sidebar to show the main panel content
    if (isMobile) {
      const toggleBtn = page.locator('.admin-topbar-toggle-btn');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        await page.waitForTimeout(500); // Wait for transition
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // UC28 - Quản lý người dùng
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC28-01: should allow admin to view, search, and filter user list by role student', async ({ page, isMobile }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    if (isMobile) {
      const toggleBtn = page.locator('.admin-topbar-toggle-btn');
      if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggleBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 1. Filter role to Student
    const roleSelect = page.locator('select.form-control-admin');
    await roleSelect.selectOption('student');
    await page.waitForTimeout(500);

    // 2. Search for the seeded student username
    const searchInput = page.getByPlaceholder('Tìm theo username hoặc email...');
    await searchInput.fill(studentUser.username);
    
    const searchBtn = page.getByRole('button', { name: 'Tìm kiếm' });
    await searchBtn.click();
    await page.waitForTimeout(1000);

    // 3. Verify user list displays the user matching criteria
    const userRow = page.locator('tr').filter({ hasText: studentUser.username });
    await expect(userRow).toBeVisible();
  });

  test('TC-UC28-04: should allow admin to lock and unlock user accounts', async ({ page, isMobile }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    if (isMobile) {
      const toggleBtn = page.locator('.admin-topbar-toggle-btn');
      if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggleBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 1. Search for the student user
    const searchInput = page.getByPlaceholder('Tìm theo username hoặc email...');
    await searchInput.fill(studentUser.username);
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await page.waitForTimeout(1000);

    // 2. Lock the account
    const lockBtn = page.locator(`tr:has-text("${studentUser.username}") button[title="Khóa tài khoản"]`);
    await expect(lockBtn).toBeVisible();
    await lockBtn.click();

    // Verify lock toast message
    await expect(page.locator('text=Đã khóa tài khoản')).toBeVisible();
    await page.waitForTimeout(1000);

    // 3. Unlock the account
    const unlockBtn = page.locator(`tr:has-text("${studentUser.username}") button[title="Mở khóa"]`);
    await expect(unlockBtn).toBeVisible();
    await unlockBtn.click();

    // Verify unlock toast message
    await expect(page.locator('text=Đã mở khóa tài khoản')).toBeVisible();
  });
});
