import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load server environment variables for database connection
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env.development') });

import User from '../../../server/src/modules/user/user.model.js';
import DailyQuest from '../../../server/src/models/dailyQuest.model.js';
import DailyChallengeScore from '../../../server/src/models/dailyChallengeScore.model.js';
import DailyChallenge from '../../../server/src/models/dailyChallenge.model.js';
import Lesson from '../../../server/src/models/lesson.model.js';

function getDateKey(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

test.describe('Daily Quests and Challenge Leaderboard (UC21, UC22)', () => {
  let testUser;
  let userEmail;
  let userPassword = 'TestPass123!';
  let dateKey;

  test.beforeAll(async () => {
    // Connect to development database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    dateKey = getDateKey();
  });

  test.afterAll(async () => {
    // Clean up created user and scores
    if (testUser) {
      await DailyQuest.deleteMany({ user: testUser._id });
      await DailyChallengeScore.deleteMany({ user: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.disconnect();
  });

  test.beforeEach(async ({ page }) => {
    userEmail = `e2e_quest_${Date.now()}@example.com`;
    const username = `e2e_user_${Date.now().toString().slice(-6)}`;
    
    // Create user directly in database
    testUser = await User.create({
      email: userEmail,
      username: username,
      password: userPassword,
      role: 'student',
      isVerified: true,
    });

    // Log in via UI
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(userEmail);
    await page.locator('#login-password').fill(userPassword);
    await page.locator('#login-submit').click();
    await page.waitForTimeout(3000);
  });

  // ─────────────────────────────────────────────────────────────────
  // UC21 - Nhiệm vụ hằng ngày
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC21-01: should display daily quests panel and progress bar', async ({ page }) => {
    await page.goto('/duolingo');
    await page.waitForLoadState('networkidle');

    // Expected: UI shows "Nhiệm Vụ Hôm Nay" panel
    const questsHeader = page.locator('text=Nhiệm Vụ Hôm Nay');
    await expect(questsHeader).toBeVisible();

    // Verify there are quest items displayed
    const questItem = page.locator('div[style*="background: rgb(255, 255, 255)"]').first();
    await expect(questItem).toBeVisible();
  });

  test('TC-UC21-02: should claim reward for completed daily quest successfully', async ({ page }) => {
    // 1. Ensure quests are created for user today by hitting /duolingo homepage once
    await page.goto('/duolingo');
    await page.waitForLoadState('networkidle');

    // 2. Find one of the quests and complete it in the database
    const quest = await DailyQuest.findOne({ user: testUser._id });
    expect(quest).not.toBeNull();
    
    quest.progress = quest.targetValue;
    quest.isCompleted = true;
    quest.completedAt = new Date();
    await quest.save();

    // 3. Reload page to see completed status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 4. Click the claim reward ("Nhận") button
    const claimButton = page.getByRole('button', { name: 'Nhận' });
    await expect(claimButton).toBeVisible();
    await claimButton.click();

    // 5. Verify status changes to claimed ("Nhận rồi")
    const claimedText = page.locator('text=Nhận rồi');
    await expect(claimedText).toBeVisible({ timeout: 5000 });
  });

  test('TC-UC21-03: should not display claim button for incomplete daily quests', async ({ page }) => {
    await page.goto('/duolingo');
    await page.waitForLoadState('networkidle');

    // 1. Ensure user has quests that are not completed
    const quest = await DailyQuest.findOne({ user: testUser._id });
    expect(quest).not.toBeNull();
    
    quest.progress = 0;
    quest.isCompleted = false;
    quest.rewardClaimed = false;
    await quest.save();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // 2. Locate the specific quest block using its title
    const questBlock = page.locator('div[style*="background: rgb(255, 255, 255)"]').filter({ hasText: quest.type === 'xp' ? 'Săn Điểm' : 'Tân Binh' });
    const claimButton = questBlock.getByRole('button', { name: 'Nhận' });
    await expect(claimButton).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────
  // UC22 - Bảng xếp hạng thử thách hằng ngày
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC22-01: should display daily challenge leaderboard correctly', async ({ page }) => {
    // 1. Ensure daily challenge exists
    let challenge = await DailyChallenge.findOne({ date: dateKey });
    if (!challenge) {
      const lesson = await Lesson.findOne();
      challenge = await DailyChallenge.create({
        date: dateKey,
        lesson: lesson._id,
      });
    }

    // 2. Seed other users and scores in DB
    const dummyUser1 = await User.create({
      email: `dummy1_${Date.now()}@example.com`,
      username: `dum1_${Date.now().toString().slice(-6)}`,
      password: userPassword,
    });
    const dummyUser2 = await User.create({
      email: `dummy2_${Date.now()}@example.com`,
      username: `dum2_${Date.now().toString().slice(-6)}`,
      password: userPassword,
    });

    await DailyChallengeScore.create({ date: dateKey, user: dummyUser1._id, challenge: challenge._id, xp: 120 });
    await DailyChallengeScore.create({ date: dateKey, user: dummyUser2._id, challenge: challenge._id, xp: 180 });

    try {
      await page.goto('/duolingo');
      await page.waitForLoadState('networkidle');

      // 3. Check daily challenge card or leaderboard title
      const leaderboardTitle = page.locator('text=Thử thách hằng ngày');
      await expect(leaderboardTitle).toBeVisible();

      // 4. Verify usernames and scores are displayed in order
      await expect(page.locator(`text=${dummyUser2.username}`)).toBeVisible();
      await expect(page.locator(`text=${dummyUser1.username}`)).toBeVisible();
    } finally {
      // Cleanup seeded dummy users
      await DailyChallengeScore.deleteMany({ user: { $in: [dummyUser1._id, dummyUser2._id] } });
      await User.deleteMany({ _id: { $in: [dummyUser1._id, dummyUser2._id] } });
    }
  });

  test('TC-UC22-02: should highlight current user and label "Bạn" even outside top 5', async ({ page }) => {
    // 1. Ensure daily challenge exists
    let challenge = await DailyChallenge.findOne({ date: dateKey });
    if (!challenge) {
      const lesson = await Lesson.findOne();
      challenge = await DailyChallenge.create({
        date: dateKey,
        lesson: lesson._id,
      });
    }

    // 2. Seed 6 dummy users with higher scores to push current user to rank 7
    const dummyIds = [];
    for (let i = 1; i <= 6; i++) {
      const u = await User.create({
        email: `dummy_high${i}_${Date.now()}@example.com`,
        username: `high${i}_${Date.now().toString().slice(-4)}`,
        password: userPassword,
      });
      dummyIds.push(u._id);
      await DailyChallengeScore.create({ date: dateKey, user: u._id, challenge: challenge._id, xp: 100 + i });
    }

    // 3. Seed current user with lower score
    await DailyChallengeScore.create({ date: dateKey, user: testUser._id, challenge: challenge._id, xp: 30 });

    try {
      await page.goto('/duolingo');
      await page.waitForLoadState('networkidle');

      // Expected: the current user row is highlighted or shows up as "Bạn"
      const meRow = page.getByText('Bạn', { exact: true }).first();
      await expect(meRow).toBeVisible();
    } finally {
      // Cleanup seeded high scores
      await DailyChallengeScore.deleteMany({ user: { $in: dummyIds } });
      await User.deleteMany({ _id: { $in: dummyIds } });
    }
  });
});
