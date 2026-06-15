const { chromium } = require('playwright');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../server/.env.development') });

const CardProgress = require('../../server/src/models/cardProgress.model');
const Flashcard = require('../../server/src/models/flashcard.model');
const User = require('../../server/src/modules/user/user.model');

const ARTIFACT_DIR = 'C:/Users/Vip/.gemini/antigravity/brain/d5a7fe14-bbac-460c-b9d2-57a1f7ab7ab5';

async function runSimulation() {
  let browser;
  try {
    console.log('Connecting to database to build dictionary...');
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
    console.log(`Loaded dictionary with ${Object.keys(dict).length} entries.`);

    // Find user ID
    const user = await mongoose.model('User').findOne({ email: 'hocitthoii@gmail.com' });
    if (!user) {
      throw new Error('User hocitthoii@gmail.com not found in MongoDB!');
    }
    const userId = user._id;
    console.log(`Found User ID: ${userId}`);

    // Query card progress before starting to print them later
    const progressBefore = await CardProgress.find({ user: userId }).populate('card');
    const progressBeforeMap = new Map();
    for (const p of progressBefore) {
      if (p.card) {
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
    }

    console.log('\nLaunching browser...');
    browser = await chromium.launch({
      headless: true, // We can run headless to make it work reliably on server/sandbox
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    console.log('Filling login form...');
    await page.getByPlaceholder(/email address/i).fill('hocitthoii@gmail.com');
    await page.getByPlaceholder(/password/i).fill('Thanglb123');
    
    // Screenshot: Login loaded and filled
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'login_page.png') });
    console.log('Saved login_page.png');

    console.log('Submitting login...');
    await page.locator('button[id="login-submit"]').click();

    console.log('Waiting for navigation to dashboard...');
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for stats to load

    // Screenshot: Dashboard
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_loaded.png') });
    console.log('Saved dashboard_loaded.png');

    // Click "Bắt đầu ôn tập"
    console.log('Opening Due Card Modal...');
    // We can click the card or the button inside it
    await page.locator('.db-sr-card-v2.due-v2').click();
    await page.waitForTimeout(500);

    // Screenshot: Modal view main
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_main.png') });
    console.log('Saved modal_main.png');

    console.log('Clicking Luyện tập sâu...');
    await page.locator('.db-modal-option-card.secondary').click();
    await page.waitForTimeout(500);

    // Screenshot: Modal view deep options
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_deep_options.png') });
    console.log('Saved modal_deep_options.png');

    console.log('Selecting "Trắc nghiệm" (Chỉ trắc nghiệm)...');
    await page.locator('.db-modal-option-card.primary').click();

    console.log('Waiting for LearnNewPage to load...');
    await page.waitForURL('**/flashcards/learn-new');
    await page.waitForSelector('.learn-body', { timeout: 15000 });
    console.log('LearnNewPage loaded.');

    // We will review 3 cards
    // 2 correct cards, 1 incorrect card to test both branches of SM-2 algorithm
    const totalCardsToReview = 3;
    let cardsReviewedCount = 0;

    while (cardsReviewedCount < totalCardsToReview) {
      console.log(`\n--- Card #${cardsReviewedCount + 1} ---`);
      await page.waitForSelector('.card-meaning');
      const viMeaning = await page.locator('.card-meaning').innerText();
      const viTrimmed = viMeaning.trim();
      const expectedEnglish = dict[viTrimmed];

      console.log(`Vietnamese Meaning: "${viTrimmed}"`);
      console.log(`Expected English Word: "${expectedEnglish}"`);

      // Let's decide if this card is answered correctly or incorrectly.
      // Let's make Card #1 and #2 CORRECT (Quality 4), Card #3 INCORRECT (Quality 0)
      const shouldBeCorrect = cardsReviewedCount < 2;

      // Capture question screenshot
      const qFilename = `card_${cardsReviewedCount + 1}_question.png`;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, qFilename) });
      console.log(`Saved ${qFilename}`);

      // Locate the options
      const optionButtons = page.locator('.option-btn');
      const count = await optionButtons.count();
      let clicked = false;

      for (let i = 0; i < count; i++) {
        const btn = optionButtons.nth(i);
        const text = await btn.locator('.option-text').innerText();
        const textTrimmed = text.trim();

        if (shouldBeCorrect) {
          if (textTrimmed === expectedEnglish) {
            console.log(`Clicking CORRECT option: "${textTrimmed}"`);
            await btn.click();
            clicked = true;
            break;
          }
        } else {
          if (textTrimmed !== expectedEnglish) {
            console.log(`Clicking INCORRECT option: "${textTrimmed}"`);
            await btn.click();
            clicked = true;
            break;
          }
        }
      }

      if (!clicked) {
        console.log('Could not match options, clicking first option by default.');
        await optionButtons.first().click();
      }

      await page.waitForTimeout(500);

      // Capture answered screenshot
      const aFilename = `card_${cardsReviewedCount + 1}_answered.png`;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, aFilename) });
      console.log(`Saved ${aFilename}`);

      // Handle next card transition
      if (shouldBeCorrect) {
        // Correct answers auto-advance in 1.2s, wait for the next card or loading
        await page.waitForTimeout(1500);
      } else {
        // Incorrect answers show feedback panel and require clicking "Tiếp tục"
        console.log('Clicking "Tiếp tục" button...');
        await page.locator('button:has-text("Tiếp tục")').click();
        await page.waitForTimeout(500);
      }

      cardsReviewedCount++;
    }

    // Now, we abort the session by clicking "Thoát" to simulate leaving the session
    // (This is exactly how a real user can exit, or we can check the database immediately to see updates)
    console.log('\nLeaving study session...');
    await page.locator('button:has-text("Thoát")').click();
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(1000);

    // Capture dashboard after session
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_updated.png') });
    console.log('Saved dashboard_updated.png');

    console.log('\nSimulation completed. Fetching updated database progress...');
    const progressAfter = await CardProgress.find({ user: userId }).populate('card');
    
    console.log('\n======================================================');
    console.log('                SM-2 FLOW VERIFICATION');
    console.log('======================================================');
    
    for (const p of progressAfter) {
      if (!p.card) continue;
      const cardId = p.card._id.toString();
      const before = progressBeforeMap.get(cardId);
      
      if (before) {
        // If there was a change, log it
        const hasChanged = before.repetitions !== p.repetitions || 
                           before.interval !== p.interval || 
                           before.easeFactor !== p.easeFactor ||
                           before.lapses !== p.lapses;
        
        if (hasChanged) {
          console.log(`\nCard: "${p.card.front}" (${p.card.back})`);
          console.log(`  REPETITIONS: ${before.repetitions} -> ${p.repetitions}`);
          console.log(`  INTERVAL   : ${before.interval} -> ${p.interval} days`);
          console.log(`  EASE FACTOR: ${before.easeFactor} -> ${p.easeFactor}`);
          console.log(`  LAPSES     : ${before.lapses} -> ${p.lapses}`);
          console.log(`  STATUS     : ${before.status} -> ${p.status}`);
          console.log(`  NEXT REVIEW: ${before.nextReview.toISOString()} -> ${p.nextReview.toISOString()}`);
        }
      }
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
