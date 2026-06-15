const { chromium } = require('playwright');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../server/.env.development') });

const CardProgress = require('../../server/src/models/cardProgress.model');
const Flashcard = require('../../server/src/models/flashcard.model');
const User = require('../../server/src/modules/user/user.model');

const ARTIFACT_DIR = 'C:\\Users\\Vip\\.gemini\\antigravity\\brain\\d5a7fe14-bbac-460c-b9d2-57a1f7ab7ab5';

async function runSimulation() {
  let browser;
  try {
    console.log('Connecting to database...');
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('Connected to MongoDB.');

    // Build Vietnamese -> English dictionary
    const flashcards = await Flashcard.find({});
    const dict = {};
    for (const fc of flashcards) {
      dict[fc.back.trim()] = fc.front.trim();
    }

    // Find user ID
    const user = await mongoose.model('User').findOne({ email: 'hocitthoii@gmail.com' });
    if (!user) {
      throw new Error('User not found!');
    }
    const userId = user._id;

    // Reset progress to known state first to make testing clean and predictable
    // Let's reset the progress of 'sun', 'moon', 'star', 'rain'
    const testCards = await Flashcard.find({ front: { $in: ['sun', 'moon', 'star', 'rain'] } });
    const testCardIds = testCards.map(c => c._id);
    
    console.log('Resetting test cards progress in DB to baseline (repetitions = 1, interval = 1, easeFactor = 2.5)...');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    await CardProgress.deleteMany({ user: userId, card: { $in: testCardIds } });
    for (const card of testCards) {
      const p = new CardProgress({
        user: userId,
        card: card._id,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: pastDate,
        status: 'LEARNING',
        lapses: 0
      });
      await p.save();
    }

    // Capture baseline map
    const progressBefore = await CardProgress.find({ user: userId, card: { $in: testCardIds } }).populate('card');
    const progressBeforeMap = new Map();
    for (const p of progressBefore) {
      progressBeforeMap.set(p.card._id.toString(), {
        front: p.card.front,
        repetitions: p.repetitions,
        interval: p.interval,
        easeFactor: p.easeFactor,
        nextReview: p.nextReview,
        status: p.status,
        lapses: p.lapses
      });
    }

    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    console.log('Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder(/email address/i).fill('hocitthoii@gmail.com');
    await page.getByPlaceholder(/password/i).fill('Thanglb123');
    await page.locator('button[id="login-submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Opening Modal...');
    await page.locator('.db-sr-card-v2.due-v2').click();
    await page.waitForTimeout(500);
    await page.locator('.db-modal-option-card.secondary').click(); // Luyện tập sâu
    await page.waitForTimeout(500);
    
    // Choose MCQ
    await page.locator('.db-modal-option-card.primary').click(); // Trắc nghiệm

    await page.waitForURL('**/flashcards/learn-new');
    await page.waitForSelector('.learn-body', { timeout: 15000 });
    console.log('Learn page loaded. Starting study loop...');

    // We want to review cards one by one.
    // Let's keep answering until we have completed sun, moon, and star.
    // Specifically:
    // - sun -> Answer CORRECTLY first try (reps 1 -> 2, int 1 -> 6, q=4)
    // - moon -> Answer CORRECTLY first try (reps 1 -> 2, int 1 -> 6, q=4)
    // - star -> Answer INCORRECTLY (fails, goes to back of queue)
    // - rain -> Answer CORRECTLY first try
    // - star comes back -> Answer CORRECTLY (reps -> 0, int -> 1, EF -> 1.7, lapses -> 1, q=0)
    // Then exit.
    
    let isStarFailed = false;
    let isStarFinished = false;
    let isSunFinished = false;
    let isMoonFinished = false;
    let isRainFinished = false;

    while (!isSunFinished || !isMoonFinished || !isRainFinished || !isStarFinished) {
      // Wait for options to be enabled (indicates card has transitioned and is ready for input)
      await page.waitForSelector('.option-btn:not([disabled])');
      const viMeaning = (await page.locator('.card-meaning').innerText()).trim();
      const expectedEnglish = dict[viMeaning];

      console.log(`\nCard meaning on screen: "${viMeaning}" (${expectedEnglish})`);

      if (expectedEnglish === 'sun') {
        console.log('Answering "sun" CORRECTLY...');
        const optionButtons = page.locator('.option-btn');
        const count = await optionButtons.count();
        for (let i = 0; i < count; i++) {
          const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
          if (text === 'sun') {
            await optionButtons.nth(i).click();
            break;
          }
        }
        isSunFinished = true;
        await page.waitForTimeout(1500); // Wait for auto-advance
      } 
      else if (expectedEnglish === 'moon') {
        console.log('Answering "moon" CORRECTLY...');
        const optionButtons = page.locator('.option-btn');
        const count = await optionButtons.count();
        for (let i = 0; i < count; i++) {
          const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
          if (text === 'moon') {
            await optionButtons.nth(i).click();
            break;
          }
        }
        isMoonFinished = true;
        await page.waitForTimeout(1500);
      }
      else if (expectedEnglish === 'rain') {
        console.log('Answering "rain" CORRECTLY...');
        const optionButtons = page.locator('.option-btn');
        const count = await optionButtons.count();
        for (let i = 0; i < count; i++) {
          const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
          if (text === 'rain') {
            await optionButtons.nth(i).click();
            break;
          }
        }
        isRainFinished = true;
        await page.waitForTimeout(1500);
      }
      else if (expectedEnglish === 'star') {
        if (!isStarFailed) {
          console.log('Answering "star" INCORRECTLY to trigger failure...');
          // Find any option that is NOT star
          const optionButtons = page.locator('.option-btn');
          const count = await optionButtons.count();
          for (let i = 0; i < count; i++) {
            const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
            if (text !== 'star') {
              await optionButtons.nth(i).click();
              break;
            }
          }
          isStarFailed = true;
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(ARTIFACT_DIR, 'star_failed.png') });
          console.log('Saved star_failed.png');
          
          console.log('Clicking "Tiếp tục" button...');
          await page.locator('button:has-text("Tiếp tục")').click();
          await page.waitForTimeout(500);
        } else {
          console.log('Answering "star" CORRECTLY now...');
          const optionButtons = page.locator('.option-btn');
          const count = await optionButtons.count();
          for (let i = 0; i < count; i++) {
            const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
            if (text === 'star') {
              await optionButtons.nth(i).click();
              break;
            }
          }
          isStarFinished = true;
          await page.waitForTimeout(1500);
        }
      }
      else {
        // Any other due card from the set that is not in our focus group:
        // just answer it correctly to get it out of the way
        console.log(`Answering other card "${expectedEnglish}" CORRECTLY...`);
        const optionButtons = page.locator('.option-btn');
        const count = await optionButtons.count();
        for (let i = 0; i < count; i++) {
          const text = (await optionButtons.nth(i).locator('.option-text').innerText()).trim();
          if (text === expectedEnglish) {
            await optionButtons.nth(i).click();
            break;
          }
        }
        await page.waitForTimeout(1500);
      }
    }

    console.log('\nAll target test cards (sun, moon, rain, star) completed! Exiting study session...');
    const completeBtn = page.locator('button:has-text("Trở lại Trang chủ")');
    if (await completeBtn.count() > 0) {
      console.log('Clicking "Trở lại Trang chủ" on complete screen...');
      await completeBtn.click();
    } else {
      console.log('Clicking "Thoát" button...');
      await page.locator('button:has-text("Thoát")').click();
    }
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(1000);

    console.log('\nFetching updated progress from MongoDB...');
    const progressAfter = await CardProgress.find({ user: userId, card: { $in: testCardIds } }).populate('card');

    console.log('\n======================================================');
    console.log('             SM-2 ALGORITHM DETAILED RESULTS');
    console.log('======================================================');
    
    for (const p of progressAfter) {
      const cardId = p.card._id.toString();
      const before = progressBeforeMap.get(cardId);
      
      console.log(`\nCard: "${p.card.front}" (${p.card.back})`);
      console.log(`  REPETITIONS: ${before.repetitions} -> ${p.repetitions}`);
      console.log(`  INTERVAL   : ${before.interval} -> ${p.interval} days`);
      console.log(`  EASE FACTOR: ${before.easeFactor} -> ${p.easeFactor}`);
      console.log(`  LAPSES     : ${before.lapses} -> ${p.lapses}`);
      console.log(`  STATUS     : ${before.status} -> ${p.status}`);
      console.log(`  NEXT REVIEW: ${before.nextReview.toISOString()} -> ${p.nextReview.toISOString()}`);
    }
    console.log('======================================================\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Simulation error:', err);
    if (browser) await browser.close();
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runSimulation();
