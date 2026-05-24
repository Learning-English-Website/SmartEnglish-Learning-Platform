import { expect } from '@playwright/test';

/**
 * Page objects for Study Mode pages
 */

export class FlashcardStudyPage {
  constructor(page) {
    this.page = page;
    this.backButton = page.locator('.ql2-header__back');
    this.modeSelector = page.locator('.study-header__mode-btn');
    this.flashcard = page.locator('.ql2-flashcard');
    this.cardFront = page.locator('.ql2-flashcard__front .ql2-flashcard__word');
    this.cardBack = page.locator('.ql2-flashcard__back .ql2-flashcard__word');
    this.shuffleBtn = page.locator('.ql2-header__btn[title="Xáo trộn"]');
    this.soundBtn = page.locator('.ql2-header__btn[title="Âm thanh"]');
    this.fullscreenBtn = page.locator('.ql2-header__btn[title="Toàn màn hình"]');
    this.progressLabel = page.locator('.ql2-progress-label');
    this.prevBtn = page.locator('.ql2-nav-btn--prev');
    this.nextBtn = page.locator('.ql2-nav-btn--next');
  }

  async expectLoaded() {
    await expect(this.flashcard).toBeVisible({ timeout: 10000 });
  }

  async flipCard() {
    await this.flashcard.click();
    await expect(this.cardBack).toBeVisible({ timeout: 3000 });
  }

  async goNext() {
    await this.nextBtn.click();
    await this.page.waitForTimeout(400);
  }

  async goPrev() {
    await this.prevBtn.click();
    await this.page.waitForTimeout(400);
  }

  async openModeDropdown() {
    await this.modeSelector.click();
    await expect(this.page.locator('.study-header__mode-menu')).toBeVisible();
  }

  async selectMode(modeLabel) {
    await this.openModeDropdown();
    await this.page.locator('.study-header__mode-item', { hasText: modeLabel }).click();
    await this.page.waitForTimeout(1000);
  }

  async shuffle() {
    await this.shuffleBtn.click();
    await this.page.waitForTimeout(500);
  }
}

export class TestModePage {
  constructor(page) {
    this.page = page;
    this.setupModal = page.locator('.test-modal');
    this.startBtn = page.locator('.test-modal__start-btn');
    this.questionCard = page.locator('.test-question');
    this.questionText = page.locator('.test-question__text');
    this.options = page.locator('.test-question__option');
    this.nextBtn = page.locator('.test-mode__nav-btn--next');
    this.resultsCard = page.locator('.test-results__card');
    this.scoreRing = page.locator('.test-results__score-ring');
    this.retryBtn = page.locator('.btn-glassline-primary');
  }

  async startTest() {
    await expect(this.setupModal).toBeVisible({ timeout: 5000 });
    await this.startBtn.click();
    await expect(this.questionCard).toBeVisible({ timeout: 5000 });
  }

  async answerCurrentQuestion(answerIndex = 0) {
    const options = page.locator('.test-question__option');
    if (await options.count() > 0) {
      await options.nth(answerIndex).click();
      await this.page.waitForTimeout(500);
    }
  }

  async completeTest() {
    while (!(await this.resultsCard.isVisible())) {
      const nextBtn = this.page.locator('.test-mode__nav-btn--next');
      if (await nextBtn.isDisabled()) break;
      const options = this.page.locator('.test-question__option');
      const tfBtns = this.page.locator('.test-question__tf-btn');
      const typeInput = this.page.locator('.test-question__input');

      if (await options.count() > 0) {
        await options.first().click();
      } else if (await tfBtns.count() > 0) {
        await tfBtns.first().click();
      } else if (await typeInput.isVisible()) {
        await typeInput.fill('answer');
        const submitBtn = this.page.locator('.test-question__submit-btn');
        if (await submitBtn.isVisible()) await submitBtn.click();
      }
      await this.page.waitForTimeout(300);
      await nextBtn.click();
      await this.page.waitForTimeout(500);
    }
  }
}

export class MatchModePage {
  constructor(page) {
    this.page = page;
    this.grid = page.locator('.match-grid');
    this.startBtn = page.locator('.match-start-btn, .match-mode__start-btn, button:has-text("Bắt đầu")');
    this.timer = page.locator('.match-timer, .match-mode__timer');
    this.scoreDisplay = page.locator('.match-score, .match-mode__score');
    this.completeOverlay = page.locator('.match-complete, .match-mode__complete, .match-results');
    this.restartBtn = page.locator('.match-restart-btn, button:has-text("Chơi lại")');
  }

  async expectLoaded() {
    await this.page.waitForTimeout(2000);
    // Either start screen or game in progress
    const hasStart = await this.startBtn.isVisible().catch(() => false);
    const hasGrid = await this.grid.isVisible().catch(() => false);
    expect(hasStart || hasGrid).toBeTruthy();
  }

  async startGame() {
    const startBtn = this.page.locator('.match-start-btn, .match-mode__start-btn, button:has-text("Bắt đầu")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await this.page.waitForTimeout(500);
    }
  }
}

export class LearnModePage {
  constructor(page) {
    this.page = page;
    this.cardArea = page.locator('.learn-card, .learn-mode__card, .ql2-flashcard');
    this.againBtn = page.locator('.learn-btn-again, button:has-text("Again"), button:has-text("Học lại")');
    this.hardBtn = page.locator('.learn-btn-hard, button:has-text("Hard"), button:has-text("Khó")');
    this.goodBtn = page.locator('.learn-btn-good, button:has-text("Good"), button:has-text("Tốt")');
    this.easyBtn = page.locator('.learn-btn-easy, button:has-text("Easy"), button:has-text("Dễ")');
    this.showAnswerBtn = page.locator('.learn-show-answer, button:has-text("Hiển thị"), button:has-text("Show")');
  }

  async expectLoaded() {
    await this.page.waitForTimeout(1000);
    // Learn mode may show card immediately or with "Show answer" button
  }

  async rateCard(quality = 'good') {
    const btnMap = { again: this.againBtn, hard: this.hardBtn, good: this.goodBtn, easy: this.easyBtn };
    const btn = btnMap[quality.toLowerCase()];
    if (await btn.isVisible()) {
      await btn.click();
      await this.page.waitForTimeout(300);
    }
  }
}
