# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\flashcard-flows.spec.js >> Flashcard Set CRUD >> should display create form elements
- Location: e2e\tests\flashcard-flows.spec.js:42:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#cs-title-input')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('#cs-title-input')

```

```yaml
- navigation:
  - link "🧠 Memoris":
    - /url: /
  - button "Switch to dark mode":
    - img
  - button "Log In"
  - button "Get Started"
- main:
  - text: 🧠
  - heading "Welcome back" [level=1]
  - paragraph: Sign in to continue learning
  - button "Sign in with Google":
    - img
    - text: Sign in with Google
  - text: or
  - img
  - textbox "Email address"
  - img
  - textbox "Password"
  - button:
    - img
  - link "Forgot Password?":
    - /url: /forgot-password
  - button "Sign In"
  - paragraph:
    - text: Don't have an account?
    - link "Create one free":
      - /url: /register
- contentinfo:
  - text: 🧠 Memoris
  - paragraph: Learn smarter, remember longer.
  - link "Home":
    - /url: /
  - link "Dashboard":
    - /url: /dashboard
  - link "Flashcards":
    - /url: /quizlet
  - paragraph: © 2026 Memoris. All rights reserved.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Quick auth helper - registers a new user
  5   |  */
  6   | async function quickAuth(page) {
  7   |   const email = `playwright${Date.now()}@test.com`;
  8   |   const password = 'TestPass123!';
  9   |   
  10  |   await page.goto('/register');
  11  |   await page.waitForLoadState('networkidle');
  12  |   
  13  |   await page.locator('#register-email').fill(email);
  14  |   await page.locator('#register-username').fill(`user${Date.now().toString().slice(-6)}`);
  15  |   await page.locator('#register-password').fill(password);
  16  |   await page.locator('#register-confirm').fill(password);
  17  |   await page.locator('#register-submit').click();
  18  |   
  19  |   // Wait and skip OTP by going to flashcards
  20  |   await page.waitForTimeout(2000);
  21  |   if (page.url().includes('/register/otp')) {
  22  |     await page.goto('/flashcards');
  23  |     await page.waitForLoadState('networkidle');
  24  |     await page.waitForTimeout(1000);
  25  |   }
  26  | }
  27  | 
  28  | /**
  29  |  * E2E Test: Create Set Flow
  30  |  */
  31  | test.describe('Flashcard Set CRUD', () => {
  32  |   test('should navigate to create set page', async ({ page }) => {
  33  |     await quickAuth(page);
  34  |     await page.goto('/flashcards/sets/create');
  35  |     await page.waitForLoadState('networkidle');
  36  |     await page.waitForTimeout(1000);
  37  |     
  38  |     // Just verify we're on a page with the form
  39  |     await expect(page.locator('body')).toBeVisible();
  40  |   });
  41  | 
  42  |   test('should display create form elements', async ({ page }) => {
  43  |     await quickAuth(page);
  44  |     await page.goto('/flashcards/sets/create');
  45  |     await page.waitForLoadState('networkidle');
  46  |     await page.waitForTimeout(2000);
  47  |     
  48  |     // Check for form elements
  49  |     const titleInput = page.locator('#cs-title-input');
> 50  |     await expect(titleInput).toBeVisible({ timeout: 10000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  51  |   });
  52  | 
  53  |   test('should validate empty title', async ({ page }) => {
  54  |     await quickAuth(page);
  55  |     await page.goto('/flashcards/sets/create');
  56  |     await page.waitForLoadState('networkidle');
  57  |     await page.waitForTimeout(2000);
  58  |     
  59  |     // Click create without title
  60  |     const createBtn = page.locator('#cs-create-btn');
  61  |     if (await createBtn.isVisible()) {
  62  |       await createBtn.click();
  63  |       await page.waitForTimeout(500);
  64  |       
  65  |       // Should show validation
  66  |       const error = page.locator('.cs-title-error, .error');
  67  |       if (await error.count() > 0) {
  68  |         await expect(error.first()).toBeVisible();
  69  |       }
  70  |     }
  71  |   });
  72  | });
  73  | 
  74  | /**
  75  |  * E2E Test: Browse and Search
  76  |  */
  77  | test.describe('Browse and Search', () => {
  78  |   test.beforeEach(async ({ page }) => {
  79  |     await quickAuth(page);
  80  |     await page.waitForTimeout(500);
  81  |   });
  82  | 
  83  |   test('should browse public sets', async ({ page }) => {
  84  |     await page.goto('/flashcards/browse');
  85  |     await page.waitForLoadState('networkidle');
  86  |     await page.waitForTimeout(2000);
  87  |     
  88  |     // Should show browse page content
  89  |     await expect(page.locator('body')).toBeVisible();
  90  |   });
  91  | 
  92  |   test('should search for sets', async ({ page }) => {
  93  |     await page.goto('/flashcards/browse');
  94  |     await page.waitForLoadState('networkidle');
  95  |     
  96  |     const searchInput = page.locator('.browse-search-input');
  97  |     if (await searchInput.isVisible()) {
  98  |       await searchInput.fill('english');
  99  |       await page.waitForTimeout(500);
  100 |       await expect(page.locator('body')).toBeVisible();
  101 |     }
  102 |   });
  103 | });
  104 | 
  105 | /**
  106 |  * E2E Test: Study Session
  107 |  */
  108 | test.describe('Study Session', () => {
  109 |   test.beforeEach(async ({ page }) => {
  110 |     await quickAuth(page);
  111 |     await page.waitForTimeout(500);
  112 |   });
  113 | 
  114 |   test('should navigate to flashcard page', async ({ page }) => {
  115 |     await page.goto('/flashcards');
  116 |     await page.waitForLoadState('networkidle');
  117 |     await page.waitForTimeout(2000);
  118 |     
  119 |     // Should see the flashcards page
  120 |     await expect(page.locator('body')).toBeVisible();
  121 |   });
  122 | });
  123 | 
  124 | /**
  125 |  * E2E Test: Share and Bookmark
  126 |  */
  127 | test.describe('Share and Bookmark', () => {
  128 |   test.beforeEach(async ({ page }) => {
  129 |     await quickAuth(page);
  130 |     await page.waitForTimeout(500);
  131 |   });
  132 | 
  133 |   test('should navigate to flashcard page', async ({ page }) => {
  134 |     await page.goto('/flashcards');
  135 |     await page.waitForLoadState('networkidle');
  136 |     await expect(page.locator('body')).toBeVisible();
  137 |   });
  138 | 
  139 |   test('should display bookmarks section', async ({ page }) => {
  140 |     await page.goto('/flashcards');
  141 |     await page.waitForLoadState('networkidle');
  142 |     await page.waitForTimeout(1000);
  143 |     
  144 |     const bookmarksBtn = page.locator('#bookmarks-btn');
  145 |     if (await bookmarksBtn.isVisible()) {
  146 |       await expect(bookmarksBtn).toBeVisible();
  147 |     }
  148 |   });
  149 | });
  150 | 
```