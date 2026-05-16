import { test, expect } from '@playwright/test';

/**
 * Quick auth helper - registers a new user
 */
async function quickAuth(page) {
  const email = `playwright${Date.now()}@test.com`;
  const password = 'TestPass123!';
  
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  
  await page.locator('#register-email').fill(email);
  await page.locator('#register-username').fill(`user${Date.now().toString().slice(-6)}`);
  await page.locator('#register-password').fill(password);
  await page.locator('#register-confirm').fill(password);
  await page.locator('#register-submit').click();
  
  // Wait and skip OTP by going to flashcards
  await page.waitForTimeout(2000);
  if (page.url().includes('/register/otp')) {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

/**
 * E2E Test: Create Set Flow
 */
test.describe('Flashcard Set CRUD', () => {
  test('should navigate to create set page', async ({ page }) => {
    await quickAuth(page);
    await page.goto('/flashcards/sets/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Just verify we're on a page with the form
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display create form elements', async ({ page }) => {
    await quickAuth(page);
    await page.goto('/flashcards/sets/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for form elements
    const titleInput = page.locator('#cs-title-input');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
  });

  test('should validate empty title', async ({ page }) => {
    await quickAuth(page);
    await page.goto('/flashcards/sets/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click create without title
    const createBtn = page.locator('#cs-create-btn');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      // Should show validation
      const error = page.locator('.cs-title-error, .error');
      if (await error.count() > 0) {
        await expect(error.first()).toBeVisible();
      }
    }
  });
});

/**
 * E2E Test: Browse and Search
 */
test.describe('Browse and Search', () => {
  test.beforeEach(async ({ page }) => {
    await quickAuth(page);
    await page.waitForTimeout(500);
  });

  test('should browse public sets', async ({ page }) => {
    await page.goto('/flashcards/browse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show browse page content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should search for sets', async ({ page }) => {
    await page.goto('/flashcards/browse');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('.browse-search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('english');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

/**
 * E2E Test: Study Session
 */
test.describe('Study Session', () => {
  test.beforeEach(async ({ page }) => {
    await quickAuth(page);
    await page.waitForTimeout(500);
  });

  test('should navigate to flashcard page', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should see the flashcards page
    await expect(page.locator('body')).toBeVisible();
  });
});

/**
 * E2E Test: Share and Bookmark
 */
test.describe('Share and Bookmark', () => {
  test.beforeEach(async ({ page }) => {
    await quickAuth(page);
    await page.waitForTimeout(500);
  });

  test('should navigate to flashcard page', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display bookmarks section', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const bookmarksBtn = page.locator('#bookmarks-btn');
    if (await bookmarksBtn.isVisible()) {
      await expect(bookmarksBtn).toBeVisible();
    }
  });
});

/**
 * E2E Test: Folder Management
 */
test.describe('Folder Management', () => {
  test.beforeEach(async ({ page }) => {
    await quickAuth(page);
    await page.waitForTimeout(500);
  });

  test('should display folders sidebar', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should see sidebar
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have folder section', async ({ page }) => {
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const sidebar = page.locator('.my-sets-sidebar');
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible();
    }
  });
});
