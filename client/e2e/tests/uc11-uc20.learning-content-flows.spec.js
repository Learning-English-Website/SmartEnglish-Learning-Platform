import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../server/.env.development') });

import User from '../../../server/src/modules/user/user.model.js';
import FlashcardSet from '../../../server/src/models/flashcardSet.model.js';
import Flashcard from '../../../server/src/models/flashcard.model.js';
import Folder from '../../../server/src/models/folder.model.js';
import Bookmark from '../../../server/src/models/bookmark.model.js';
import Course from '../../../server/src/models/course.model.js';
import Unit from '../../../server/src/models/unit.model.js';
import Lesson from '../../../server/src/models/lesson.model.js';
import Challenge from '../../../server/src/models/challenge.model.js';
import ChallengeProgress from '../../../server/src/models/challengeProgress.model.js';
import UserProgress from '../../../server/src/models/userProgress.model.js';

const PASSWORD = 'MemorisPassword123';

async function login(page, email) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(PASSWORD);
  await page.locator('#login-submit').click();
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(new RegExp('/dashboard|/$'));
}

test.describe.serial('Learning content, folders, sharing and lesson E2E tests (UC11 - UC20)', () => {
  let unique;
  let owner;
  let viewer;
  let set;
  let destinationFolder;
  let course;
  let unit;
  let successLesson;
  let noHeartsLesson;
  let successChallenge;
  let noHeartsChallenge;

  test.beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    owner = await User.create({
      email: `e2e_uc11_owner_${unique}@example.com`,
      username: `uc11owner${unique}`,
      password: PASSWORD,
      role: 'student',
      isVerified: true,
    });

    viewer = await User.create({
      email: `e2e_uc17_viewer_${unique}@example.com`,
      username: `uc17viewer${unique}`,
      password: PASSWORD,
      role: 'student',
      isVerified: true,
    });

    set = await FlashcardSet.create({
      user: owner._id,
      title: `UC11-UC20 E2E Set ${unique}`,
      description: 'Seeded set for UC11-UC20 automation',
      isPublic: false,
      cardCount: 2,
    });

    await Flashcard.create([
      { set: set._id, front: 'alpha', back: 'chữ alpha', order: 0 },
      { set: set._id, front: 'beta', back: 'chữ beta', order: 1 },
    ]);

    destinationFolder = await Folder.create({
      user: owner._id,
      name: `UC15 Folder ${unique}`,
      sets: [],
    });

    course = await Course.create({
      slug: `uc11-uc20-course-${unique}`,
      title: `UC11-UC20 Course ${unique}`,
      description: 'Course seeded for UC19 automation',
      isPublished: true,
      isActive: true,
      order: 1,
    });

    unit = await Unit.create({
      course: course._id,
      title: `UC19 Unit ${unique}`,
      description: 'Unit seeded for lesson completion automation',
      order: 1,
    });

    successLesson = await Lesson.create({
      unit: unit._id,
      title: `UC19 Complete Lesson ${unique}`,
      type: 'challenge',
      isLocked: false,
      order: 1,
    });

    noHeartsLesson = await Lesson.create({
      unit: unit._id,
      title: `UC19 No Hearts Lesson ${unique}`,
      type: 'challenge',
      isLocked: false,
      order: 2,
    });

    successChallenge = await Challenge.create({
      lesson: successLesson._id,
      type: 'SELECT',
      question: 'What does "Hello" mean?',
      options: [
        { text: 'Xin chào', correct: true },
        { text: 'Tạm biệt', correct: false },
      ],
      order: 1,
    });

    noHeartsChallenge = await Challenge.create({
      lesson: noHeartsLesson._id,
      type: 'SELECT',
      question: 'What does "Goodbye" mean?',
      options: [
        { text: 'Xin chào', correct: false },
        { text: 'Tạm biệt', correct: true },
      ],
      order: 1,
    });

    await UserProgress.create({
      user: owner._id,
      activeCourse: course._id,
      hearts: 5,
      maxHearts: 5,
      points: 0,
      totalXP: 0,
    });
  });

  test.afterAll(async () => {
    await Bookmark.deleteMany({ user: { $in: [owner?._id, viewer?._id].filter(Boolean) } });
    await Folder.deleteMany({ user: { $in: [owner?._id, viewer?._id].filter(Boolean) } });
    await Flashcard.deleteMany({ set: set?._id });
    if (set?._id) await FlashcardSet.deleteOne({ _id: set._id });
    await ChallengeProgress.deleteMany({
      challenge: { $in: [successChallenge?._id, noHeartsChallenge?._id].filter(Boolean) },
    });
    await Challenge.deleteMany({
      _id: { $in: [successChallenge?._id, noHeartsChallenge?._id].filter(Boolean) },
    });
    await Lesson.deleteMany({
      _id: { $in: [successLesson?._id, noHeartsLesson?._id].filter(Boolean) },
    });
    if (unit?._id) await Unit.deleteOne({ _id: unit._id });
    if (course?._id) await Course.deleteOne({ _id: course._id });
    await UserProgress.deleteMany({ user: { $in: [owner?._id, viewer?._id].filter(Boolean) } });
    await User.deleteMany({ _id: { $in: [owner?._id, viewer?._id].filter(Boolean) } });
    await mongoose.disconnect();
  });

  test('TC-UC11-01: should add a new flashcard to an existing set successfully', async ({ page }) => {
    await login(page, owner.email);
    await page.goto(`/flashcards/sets/${set._id}`);
    await page.waitForLoadState('networkidle');

    await page.locator('.sd-add-terms-pill').click({ force: true });
    const form = page.locator('.sd-add-card-form');
    await form.locator('input[name="front"]').fill(`automation-${unique}`);
    await form.locator('input[name="back"]').fill('tự động hóa');
    await form.locator('button.ce-btn--save').click({ force: true });

    await expect(page.getByText(`automation-${unique}`)).toBeVisible({ timeout: 5000 });

    const dbCard = await Flashcard.findOne({ set: set._id, front: `automation-${unique}` }).lean();
    expect(dbCard).toBeTruthy();
    expect(dbCard.back).toBe('tự động hóa');
  });

  test('TC-UC11-02: should not save a flashcard when required fields are missing', async ({ page }) => {
    const invalidTerm = `missing-back-${unique}`;

    await login(page, owner.email);
    await page.goto(`/flashcards/sets/${set._id}`);
    await page.waitForLoadState('networkidle');

    await page.locator('.sd-add-terms-pill').click({ force: true });
    const form = page.locator('.sd-add-card-form');
    await form.locator('input[name="front"]').fill(invalidTerm);
    await form.locator('button.ce-btn--save').click({ force: true });

    await expect(form.locator('.ce-error')).toContainText('Định nghĩa là bắt buộc');
    const dbCard = await Flashcard.findOne({ set: set._id, front: invalidTerm }).lean();
    expect(dbCard).toBeNull();
  });

  test('TC-UC12-01: should reorder cards and persist the new order', async ({ page }) => {
    await login(page, owner.email);
    await page.goto(`/flashcards/sets/${set._id}`);
    await page.waitForLoadState('networkidle');

    const cardsBefore = await Flashcard.find({ set: set._id }).sort({ order: 1, createdAt: 1 }).lean();
    expect(cardsBefore.length).toBeGreaterThanOrEqual(2);
    const reversedIds = cardsBefore.map((card) => card._id.toString()).reverse();

    const reorderResponse = await page.evaluate(async ({ setId, cardIds }) => {
      const res = await fetch(`/api/flashcards/set/${setId}/reorder`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds }),
      });
      return { ok: res.ok, status: res.status };
    }, { setId: set._id.toString(), cardIds: reversedIds });

    expect(reorderResponse.ok).toBe(true);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.scr-row').first()).toContainText(cardsBefore[cardsBefore.length - 1].front);

    const cardsAfter = await Flashcard.find({ set: set._id }).sort({ order: 1 }).lean();
    expect(cardsAfter.map((card) => card._id.toString())).toEqual(reversedIds);
  });

  test('TC-UC13-01: should create a new root folder successfully', async ({ page }) => {
    const folderName = `UC13 Folder ${unique}`;

    await login(page, owner.email);
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');

    await page.locator('.folder-tree-add-btn').click();
    await page.getByPlaceholder('Folder name...').fill(folderName);
    await page.keyboard.press('Enter');

    await expect(page.locator('.folder-tree-name', { hasText: folderName })).toBeVisible({ timeout: 5000 });

    const folder = await Folder.findOne({ user: owner._id, name: folderName }).lean();
    expect(folder).toBeTruthy();
    expect(folder.parent).toBeNull();
  });

  test('TC-UC13-03: should not create a folder when the folder name is invalid', async ({ page }) => {
    await login(page, owner.email);
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');

    await page.locator('.folder-tree-add-btn').click();
    const input = page.getByPlaceholder('Folder name...');
    await expect(input).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(input).toBeVisible();
    const blankFolders = await Folder.find({ user: owner._id, name: '' }).lean();
    expect(blankFolders).toHaveLength(0);
  });

  test('TC-UC15-01: should add a flashcard set to a folder successfully', async ({ page }) => {
    await login(page, owner.email);
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');

    const addResponse = await page.evaluate(async ({ folderId, setId }) => {
      const res = await fetch(`/api/folders/${folderId}/sets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId }),
      });
      return { ok: res.ok, status: res.status };
    }, {
      folderId: destinationFolder._id.toString(),
      setId: set._id.toString(),
    });

    expect(addResponse.ok).toBe(true);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.locator('.folder-tree-name', { hasText: destinationFolder.name }).click();
    await expect(page.getByText(set.title)).toBeVisible({ timeout: 5000 });

    const folder = await Folder.findById(destinationFolder._id).lean();
    expect(folder.sets.map((id) => id.toString())).toContain(set._id.toString());
  });

  test('TC-UC17-01: should make a set public and expose a shareable link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write'], { origin: 'http://localhost:5173' });
    await login(page, owner.email);
    await page.goto(`/flashcards/sets/${set._id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Chia sẻ/i }).click();
    await expect(page.getByText(/đang ở chế độ riêng tư/i)).toBeVisible();
    await page.getByRole('button', { name: /Công khai/i }).click();

    const shareInput = page.locator('.share-link-input').first();
    await expect(shareInput).toHaveValue(new RegExp(`/flashcards/sets/${set._id}`), { timeout: 5000 });
    await page.getByRole('button', { name: /Sao chép/i }).first().click({ force: true });
    await expect(page.getByRole('button', { name: /Đã chép/i }).first()).toBeVisible();

    const dbSet = await FlashcardSet.findById(set._id).lean();
    expect(dbSet.isPublic).toBe(true);
  });

  test('TC-UC17-03: should save a public set into the viewer saved list', async ({ page }) => {
    await FlashcardSet.updateOne({ _id: set._id }, { $set: { isPublic: true } });

    await login(page, viewer.email);
    await page.goto(`/flashcards/sets/${set._id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /^Lưu$/i }).click({ force: true });
    await expect(page.getByRole('button', { name: /Đã lưu/i })).toBeVisible({ timeout: 5000 });

    const bookmark = await Bookmark.findOne({ user: viewer._id, set: set._id }).lean();
    expect(bookmark).toBeTruthy();

    const favoriteFolder = await Folder.findOne({ user: viewer._id, name: 'Yêu thích' }).lean();
    expect(favoriteFolder.sets.map((id) => id.toString())).toContain(set._id.toString());
  });

  test('TC-UC19-01: should complete a roadmap lesson and award XP', async ({ page }) => {
    await UserProgress.updateOne(
      { user: owner._id },
      { $set: { activeCourse: course._id, hearts: 5, points: 0, totalXP: 0 } }
    );
    await ChallengeProgress.deleteMany({ user: owner._id, challenge: successChallenge._id });
    await Lesson.updateOne({ _id: successLesson._id }, { $set: { isCompleted: false, completedAt: null } });

    await login(page, owner.email);
    await page.goto(`/duolingo/lesson/${successLesson._id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('radio', { name: /Xin chào/i }).click();
    await expect(page.getByText('Lesson Complete!')).toBeVisible({ timeout: 7000 });

    const progress = await UserProgress.findOne({ user: owner._id }).lean();
    expect(progress.points).toBeGreaterThanOrEqual(30);

    const challengeProgress = await ChallengeProgress.findOne({
      user: owner._id,
      challenge: successChallenge._id,
      completed: true,
    }).lean();
    expect(challengeProgress).toBeTruthy();
  });

  test('TC-UC19-03: should show the out-of-hearts state before starting a lesson', async ({ page }) => {
    await UserProgress.updateOne(
      { user: owner._id },
      { $set: { activeCourse: course._id, hearts: 0 } }
    );

    await login(page, owner.email);
    await page.goto(`/duolingo/lesson/${noHeartsLesson._id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('dialog', { name: /Out of Hearts/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/can't start new lessons without hearts/i)).toBeVisible();

    const progress = await UserProgress.findOne({ user: owner._id }).lean();
    expect(progress.hearts).toBe(0);
  });
});
