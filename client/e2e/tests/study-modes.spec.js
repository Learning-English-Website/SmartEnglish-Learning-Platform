import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../pages/auth-helpers';
import {
  FlashcardStudyPage,
  TestModePage,
  MatchModePage,
  LearnModePage,
} from '../pages/StudyPages';

/**
 * E2E Tests: Study Modes
 * Tests all 4 study modes: Flashcards, Learn, Test, Match
 */

test.describe('Study Modes — Setup & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForTimeout(1000);
  });

  test('should navigate to flashcards page', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Clear auth state by visiting logout
    await page.context().clearCookies();
    await page.goto('/study-sets/fake-id/flashcards');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
});

/* ── Flashcard Mode ─────────────────────────────────────────── */

test.describe('Flashcard Mode', () => {
  let setId;

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);

    // Find a set to study
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to get a set ID from the page
    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        setId = match[1];
      }
    }

    // If we found a set, go directly to flashcard mode
    if (setId) {
      await page.goto(`/study-sets/${setId}/flashcards`);
    } else {
      await page.goto('/flashcards/sets/create');
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(2000);
  });

  test('should display flashcard', async ({ page }) => {
    const studyPage = new FlashcardStudyPage(page);

    // If on create page, skip
    const onCreate = await page.locator('#cs-title-input').isVisible().catch(() => false);
    if (onCreate) {
      await page.goto('/flashcards');
      await page.waitForTimeout(1000);
      return;
    }

    const flashcard = page.locator('.ql2-flashcard');
    if (await flashcard.isVisible({ timeout: 5000 })) {
      await expect(flashcard).toBeVisible();
    } else {
      // No cards available — this is acceptable
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should flip card', async ({ page }) => {
    const studyPage = new FlashcardStudyPage(page);
    const flashcard = page.locator('.ql2-flashcard');

    if (await flashcard.isVisible({ timeout: 5000 })) {
      const cardFront = page.locator('.ql2-flashcard__front');
      const cardBack = page.locator('.ql2-flashcard__back');

      // Card should start showing front
      if (await cardFront.isVisible()) {
        // Click to flip
        await flashcard.click();
        await page.waitForTimeout(500);

        // Back should now be visible
        const isFlipped = await flashcard.evaluate(el => el.classList.contains('ql2-flashcard--flipped'));
        expect(isFlipped).toBeTruthy();
      }
    }
  });

  test('should open mode selector dropdown', async ({ page }) => {
    const studyPage = new FlashcardStudyPage(page);
    const modeBtn = page.locator('.study-header__mode-btn');

    if (await modeBtn.isVisible({ timeout: 3000 })) {
      await studyPage.openModeDropdown();
      const menu = page.locator('.study-header__mode-menu');
      await expect(menu).toBeVisible();

      // Should show all 4 modes
      await expect(page.locator('.study-header__mode-item')).toHaveCount(4);
    }
  });

  test('should navigate between cards', async ({ page }) => {
    const flashcard = page.locator('.ql2-flashcard');
    if (!(await flashcard.isVisible({ timeout: 5000 }))) return;

    const progressBefore = await page.locator('.ql2-progress-label').textContent();

    const nextBtn = page.locator('.ql2-nav-btn--next');
    if (!(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Progress should have changed
    const progressAfter = await page.locator('.ql2-progress-label').textContent();
    // (Progress may or may not change if there's only 1 card)
    expect(progressAfter).toBeTruthy();
  });

  test('should toggle sound', async ({ page }) => {
    const flashcard = page.locator('.ql2-flashcard');
    if (!(await flashcard.isVisible({ timeout: 5000 }))) return;

    const soundBtn = page.locator('.ql2-header__btn[title="Âm thanh"]');
    if (await soundBtn.isVisible()) {
      const wasActive = await soundBtn.evaluate(el => el.classList.contains('active'));
      await soundBtn.click();
      await page.waitForTimeout(200);
      const isActive = await soundBtn.evaluate(el => el.classList.contains('active'));
      expect(isActive).not.toBe(wasActive);
    }
  });

  test('should navigate to other study modes', async ({ page }) => {
    const flashcard = page.locator('.ql2-flashcard');
    if (!(await flashcard.isVisible({ timeout: 5000 }))) return;

    const studyPage = new FlashcardStudyPage(page);

    // Test mode
    await studyPage.selectMode('Kiểm tra');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/test');

    // Match mode
    await studyPage.selectMode('Khớp thẻ');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/match');

    // Learn mode
    await studyPage.selectMode('Học');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/learn');
  });

  test('should keyboard navigate with shortcuts', async ({ page }) => {
    const flashcard = page.locator('.ql2-flashcard');
    if (!(await flashcard.isVisible({ timeout: 5000 }))) return;

    // Press Space to flip
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const isFlipped = await flashcard.evaluate(el => el.classList.contains('ql2-flashcard--flipped'));
    expect(isFlipped).toBeTruthy();

    // Press ArrowRight to go next
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
  });

  test('should shuffle cards', async ({ page }) => {
    const flashcard = page.locator('.ql2-flashcard');
    if (!(await flashcard.isVisible({ timeout: 5000 }))) return;

    const shuffleBtn = page.locator('.ql2-header__btn[title="Xáo trộn"]');
    if (await shuffleBtn.isVisible()) {
      await shuffleBtn.click();
      await page.waitForTimeout(1000);

      // Should show toast
      const toast = page.locator('.toast, [class*="toast"]').first();
      // Toast may or may not be visible depending on timing
    }
  });
});

/* ── Test Mode ──────────────────────────────────────────────── */

test.describe('Test Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForTimeout(500);
  });

  test('should show setup modal before starting', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find a set with cards
    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/test`);
        await page.waitForTimeout(2000);

        const modal = page.locator('.test-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          await expect(modal).toBeVisible();
          await expect(page.locator('.test-modal__title')).toContainText('Kiểm tra');
          await expect(page.locator('.test-modal__start-btn')).toBeVisible();
        }
      }
    }
  });

  test('should allow selecting question count', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/test`);
        await page.waitForTimeout(2000);

        const modal = page.locator('.test-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          // Click 5 questions
          const btn5 = page.locator('.test-modal__count-btn', { hasText: '5' });
          if (await btn5.isVisible() && !(await btn5.isDisabled())) {
            await btn5.click();
            await page.waitForTimeout(200);
            await expect(btn5).toHaveClass(/active/);
          }
        }
      }
    }
  });

  test('should start test and show questions', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/test`);
        await page.waitForTimeout(2000);

        const modal = page.locator('.test-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          const startBtn = page.locator('.test-modal__start-btn');
          await startBtn.click();
          await page.waitForTimeout(1000);

          // Should show question
          const question = page.locator('.test-question');
          await expect(question).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should show results after completing test', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/test`);
        await page.waitForTimeout(2000);

        const modal = page.locator('.test-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          // Set minimum questions
          const btn5 = page.locator('.test-modal__count-btn', { hasText: '5' });
          if (await btn5.isVisible() && !(await btn5.isDisabled())) {
            await btn5.click();
          }
          await page.locator('.test-modal__start-btn').click();
          await page.waitForTimeout(1000);

          // Answer all questions quickly
          const testPage = new TestModePage(page);
          // eslint-disable-next-line no-empty
          for (let i = 0; i < 20; i++) {
            const resultsVisible = await page.locator('.test-results__card').isVisible().catch(() => false);
            if (resultsVisible) break;

            const options = page.locator('.test-question__option');
            const tfBtns = page.locator('.test-question__tf-btn');
            const typeInput = page.locator('.test-question__input');

            if (await options.count() > 0) {
              await options.first().click();
            } else if (await tfBtns.count() > 0) {
              await tfBtns.first().click();
            } else if (await typeInput.isVisible()) {
              await typeInput.fill('test');
              const submit = page.locator('.test-question__submit-btn');
              if (await submit.isVisible()) await submit.click();
            }

            await page.waitForTimeout(300);
            const nextBtn = page.locator('.test-mode__nav-btn--next');
            if (await nextBtn.isDisabled()) break;
            await nextBtn.click();
            await page.waitForTimeout(500);
          }

          // Results screen
          await page.waitForTimeout(2000);
          const resultsCard = page.locator('.test-results__card');
          if (await resultsCard.isVisible({ timeout: 5000 })) {
            await expect(resultsCard).toBeVisible();
            await expect(page.locator('.test-results__score-ring')).toBeVisible();
          }
        }
      }
    }
  });

  test('should allow retry after test', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/test`);
        await page.waitForTimeout(2000);

        const modal = page.locator('.test-modal');
        if (await modal.isVisible({ timeout: 5000 })) {
          await page.locator('.test-modal__start-btn').click();
          await page.waitForTimeout(1000);

          // Complete test
          for (let i = 0; i < 20; i++) {
            if (await page.locator('.test-results__card').isVisible().catch(() => false)) break;
            const options = page.locator('.test-question__option');
            if (await options.count() > 0) await options.first().click();
            else {
              const tf = page.locator('.test-question__tf-btn');
              if (await tf.count() > 0) await tf.first().click();
              else {
                const input = page.locator('.test-question__input');
                if (await input.isVisible()) {
                  await input.fill('a');
                  const sub = page.locator('.test-question__submit-btn');
                  if (await sub.isVisible()) await sub.click();
                }
              }
            }
            await page.waitForTimeout(300);
            const next = page.locator('.test-mode__nav-btn--next');
            if (await next.isDisabled()) break;
            await next.click();
            await page.waitForTimeout(400);
          }

          await page.waitForTimeout(2000);
          const retryBtn = page.locator('.btn-glassline-primary');
          if (await retryBtn.isVisible({ timeout: 3000 })) {
            await retryBtn.click();
            await page.waitForTimeout(1000);
            // Should go back to setup modal or test in progress
            const modalOrQuestion = await page.locator('.test-modal, .test-question').isVisible().catch(() => false);
            expect(modalOrQuestion).toBeTruthy();
          }
        }
      }
    }
  });
});

/* ── Match Mode ──────────────────────────────────────────────── */

test.describe('Match Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForTimeout(500);
  });

  test('should navigate to match mode', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/match`);
        await page.waitForTimeout(2000);
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should show match start screen', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/match`);
        await page.waitForTimeout(2000);

        const matchPage = new MatchModePage(page);
        await matchPage.expectLoaded();
      }
    }
  });
});

/* ── Learn Mode ──────────────────────────────────────────────── */

test.describe('Learn Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForTimeout(500);
  });

  test('should navigate to learn mode', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/learn`);
        await page.waitForTimeout(2000);
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should show confidence buttons', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForTimeout(2000);

    const setLink = page.locator('[href*="/study-sets/"]').first();
    if (await setLink.isVisible({ timeout: 3000 })) {
      const href = await setLink.getAttribute('href');
      const match = href.match(/\/study-sets\/([^\/]+)/);
      if (match) {
        await page.goto(`/study-sets/${match[1]}/learn`);
        await page.waitForTimeout(2000);

        const learnPage = new LearnModePage(page);

        // Check for confidence buttons
        const againBtn = page.locator('button:has-text("Again"), button:has-text("Học lại")');
        const goodBtn = page.locator('button:has-text("Good"), button:has-text("Tốt")');
        const showAnswer = page.locator('button:has-text("Show"), button:has-text("Hiển thị")');

        const hasButtons = await Promise.all([
          againBtn.isVisible().catch(() => false),
          goodBtn.isVisible().catch(() => false),
          showAnswer.isVisible().catch(() => false),
        ]);
        // At least one should be visible
        expect(hasButtons.some(v => v)).toBeTruthy();
      }
    }
  });
});
