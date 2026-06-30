import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env.development') });

import User from '../../../server/src/modules/user/user.model.js';
import FlashcardSet from '../../../server/src/models/flashcardSet.model.js';
import Folder from '../../../server/src/models/folder.model.js';
import Tag from '../../../server/src/models/tag.model.js';

test.describe.serial('Flashcard Set CRUD E2E Tests (UC08 - UC10)', () => {
  let testUser;
  let testFolder;
  let testTag;
  let createdSetId;

  test.beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Seed test user, folder, and tag in DB
    const uniqueVal = Date.now();
    
    // Seed verified user
    testUser = await User.create({
      email: `student_set_${uniqueVal}@gmail.com`,
      username: `studentuser${uniqueVal}`,
      password: 'MemorisPassword123', // plain text for pre-save hook hashing
      isVerified: true,
    });

    testFolder = await Folder.create({
      user: testUser._id,
      name: 'Từ vựng cơ bản',
    });

    testTag = await Tag.create({
      user: testUser._id,
      name: 'English',
      color: '#6366f1',
    });
  });

  test.afterAll(async () => {
    // Clean up created set if any
    if (createdSetId) {
      await FlashcardSet.deleteOne({ _id: createdSetId });
    }
    // Clean up seeded user, folder, and tag
    if (testUser) {
      await Folder.deleteOne({ _id: testFolder._id });
      await Tag.deleteOne({ _id: testTag._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
  });

  test.beforeEach(async ({ page }) => {
    // Log in as seeded student
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(testUser.email);
    await page.locator('#login-password').fill('MemorisPassword123');
    await page.locator('#login-submit').click();
    
    // Wait for redirect to complete
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
  });

  // ─────────────────────────────────────────────────────────────────
  // UC08 - Tạo bộ thẻ học mới
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC08-01: should create a new flashcard set successfully', async ({ page }) => {
    await page.goto('/flashcards/sets/create');
    await page.waitForLoadState('networkidle');

    // 1. Fill title and description
    const title = 'English Vocabulary for Beginners';
    const description = 'Các từ vựng cơ bản thông dụng';
    await page.locator('#cs-title-input').fill(title);
    await page.getByPlaceholder('Mô tả').fill(description);

    // 2. Click visibility button to change to "Công khai"
    const visibilityBtn = page.locator('button.cs-visibility-btn');
    await expect(visibilityBtn).toBeVisible();
    await visibilityBtn.click();
    await expect(visibilityBtn).toContainText('Công khai');

    // 3. Select folder
    const folderSelect = page.locator('select.cs-folder-select');
    await expect(folderSelect).toBeVisible();
    await folderSelect.selectOption(testFolder._id.toString());

    // 4. Select tag
    const tagInput = page.locator('.tag-picker-input');
    await tagInput.scrollIntoViewIfNeeded();
    await tagInput.fill('English', { force: true });
    await page.locator('.tag-picker-option', { hasText: 'English' }).click({ force: true });

    // 5. Fill first card term & definition
    const cardEditor = page.locator('.cs-card-editor-wrap').first();
    await cardEditor.locator('input[name="front"]').fill('Hello');
    await cardEditor.locator('input[name="back"]').fill('Xin chào');

    // 6. Submit creation
    await page.locator('.cs-footer button:has-text("Tạo Set")').click({ force: true });

    // 7. Verify toast success and redirection to details page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(new RegExp('/flashcards/sets/[a-f0-9]{24}'));

    // Capture the created set ID from URL
    const url = page.url();
    const match = url.match(/\/flashcards\/sets\/([a-f0-9]{24})/);
    expect(match).toBeTruthy();
    createdSetId = match[1];

    // Verify set values in DB
    const dbSet = await FlashcardSet.findById(createdSetId);
    expect(dbSet).toBeTruthy();
    expect(dbSet.title).toBe(title);
    expect(dbSet.description).toBe(description);
    expect(dbSet.isPublic).toBe(true);
    expect(dbSet.tags.map(t => t.toString())).toContain(testTag._id.toString());
  });

  test('TC-UC08-02: should block creation and show validation error if title is empty', async ({ page }) => {
    await page.goto('/flashcards/sets/create');
    await page.waitForLoadState('networkidle');

    // Bỏ trống tiêu đề, điền mô tả
    await page.getByPlaceholder('Mô tả').fill('Từ vựng ôn thi');

    // Click "Tạo Set"
    await page.locator('.cs-footer button:has-text("Tạo Set")').click({ force: true });

    // Verify no redirection and error message is displayed
    await expect(page.locator('p.cs-title-error')).toBeVisible();
    await expect(page.locator('p.cs-title-error')).toContainText('Vui lòng nhập tiêu đề cho set.');
    await expect(page).toHaveURL(new RegExp('/flashcards/sets/create'));
  });

  // ─────────────────────────────────────────────────────────────────
  // UC09 - Chỉnh sửa thông tin bộ thẻ học
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC09-01: should edit flashcard set successfully', async ({ page }) => {
    expect(createdSetId).toBeTruthy();

    // Go directly to edit page
    await page.goto(`/flashcards/sets/${createdSetId}/edit`);
    await page.waitForLoadState('networkidle');

    // 1. Update Title and Description
    const newTitle = 'Vocabulary English - Level 1';
    const newDescription = 'Sách từ vựng tiếng Anh';
    await page.locator('input[name="title"]').fill(newTitle);
    await page.locator('textarea[name="description"]').fill(newDescription);

    // 2. Toggle visibility to "Riêng tư" (uncheck checkbox)
    const visibilityCheckbox = page.locator('#edit-set-public');
    const isChecked = await visibilityCheckbox.isChecked();
    if (isChecked) {
      // Toggle it to false
      await page.locator('label.set-form-toggle-label').click();
    }
    await expect(visibilityCheckbox).not.toBeChecked();

    // 3. Save changes
    await page.locator('button[type="submit"]').click();

    // 4. Verify redirected to set detail and shows updated info
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(new RegExp(`/flashcards/sets/${createdSetId}`));

    // Verify DB
    const dbSet = await FlashcardSet.findById(createdSetId);
    expect(dbSet.title).toBe(newTitle);
    expect(dbSet.description).toBe(newDescription);
    expect(dbSet.isPublic).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────
  // UC10 - Xóa bộ thẻ học
  // ─────────────────────────────────────────────────────────────────
  test('TC-UC10-01: should delete flashcard set successfully', async ({ page }) => {
    expect(createdSetId).toBeTruthy();

    await page.goto(`/flashcards/sets/${createdSetId}`);
    await page.waitForLoadState('networkidle');

    // 1. Click delete action icon button (adjacent to Edit button)
    const deleteBtn = page.locator('.sd-header-actions button.sd-action-btn--icon');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click({ force: true });

    // 2. Modal confirmation shows up
    const confirmBtn = page.locator('.modal-footer button', { hasText: 'Xóa' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click({ force: true });

    // 3. Redirection to flashcards homepage / library
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(new RegExp('/flashcards'));

    // Verify set deleted from DB
    const dbSet = await FlashcardSet.findById(createdSetId);
    expect(dbSet).toBeNull();

    // Reset variable so it isn't cleared in afterAll
    createdSetId = null;
  });
});
