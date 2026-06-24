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
import Feedback from '../../../server/src/models/feedback.model.js';
import Order from '../../../server/src/models/order.model.js';

test.describe('Admin Operations (UC25, UC26)', () => {
  let studentUser;
  let testFeedback;
  let testOrder;

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

    // Seed a pending feedback
    testFeedback = await Feedback.create({
      user: studentUser._id,
      title: 'E2E Test Bug Report ' + uniqueId,
      content: 'Something is broken on the dashboard.',
      category: 'bug',
      status: 'pending',
    });

    // Seed a pending order
    testOrder = await Order.create({
      orderId: 'E2E_ORDER_' + uniqueId,
      user: studentUser._id,
      method: 'momo',
      amount: 99000,
      status: 'pending',
      transId: 'E2E_TRANS_' + uniqueId,
    });
  });

  test.afterAll(async () => {
    // Cleanup seeded data
    if (testFeedback) {
      await Feedback.deleteOne({ _id: testFeedback._id });
    }
    if (testOrder) {
      await Order.deleteOne({ _id: testOrder._id });
    }
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
    await page.waitForTimeout(3000);

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
  // UC25 - Tiếp nhận và xử lý phản hồi
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC25-03: should update feedback status to resolved quickly', async ({ page, isMobile }) => {
    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');
    if (isMobile) {
      await page.locator('.admin-topbar-toggle-btn').click();
      await page.waitForTimeout(500);
    }

    // 1. Locate the row with our seeded feedback
    const feedbackRow = page.locator('tr').filter({ hasText: testFeedback.title });
    await expect(feedbackRow).toBeVisible();

    // 2. Click on the status badge to trigger the FeedbackStatusModal
    const statusBadge = feedbackRow.locator('span').filter({ hasText: 'Chờ xử lý' });
    await statusBadge.first().click({ force: true });

    // 3. Select the "ĐÃ GIẢI QUYẾT" status button inside the modal
    const resolvedBtn = page.getByRole('button', { name: 'ĐÃ GIẢI QUYẾT' });
    await expect(resolvedBtn).toBeVisible();
    await resolvedBtn.click();

    // 4. Click the save button inside the modal
    const saveBtn = page.getByRole('button', { name: 'Lưu trạng thái' });
    await saveBtn.click();

    // 5. Verify the success toast appears
    const successToast = page.locator('text=Đã cập nhật trạng thái phản hồi');
    await expect(successToast).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────
  // UC26 - Duyệt hóa đơn Premium thủ công
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC26-01: should allow admin to view and search order list', async ({ page, isMobile }) => {
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');
    if (isMobile) {
      await page.locator('.admin-topbar-toggle-btn').click();
      await page.waitForTimeout(500);
    }

    // 1. Enter the order code in search input
    const searchInput = page.getByPlaceholder('Tìm theo Mã đơn, Mã GD, User...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(testOrder.orderId);

    // 2. Click search button
    const searchBtn = page.getByRole('button', { name: 'Tìm kiếm' });
    await searchBtn.click();
    await page.waitForTimeout(1000);

    // 3. Verify order appears and structure is correct
    const orderRow = page.locator('tr').filter({ hasText: testOrder.orderId });
    await expect(orderRow).toBeVisible();
  });
});
