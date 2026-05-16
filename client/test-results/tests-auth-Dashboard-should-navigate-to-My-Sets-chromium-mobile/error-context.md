# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\auth.spec.js >> Dashboard >> should navigate to My Sets
- Location: e2e\tests\auth.spec.js:46:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/quizlet/
Received string:  "http://localhost:5173/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:5173/login"

```

```yaml
- navigation:
  - link "🧠 Memoris":
    - /url: /
  - button "Toggle navigation"
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
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { DashboardPage } from '../pages/DashboardPage';
  4  | import { loginAsTestUser } from '../pages/auth-helpers';
  5  | 
  6  | test.describe('Authentication Flow', () => {
  7  |   test('should display login page correctly', async ({ page }) => {
  8  |     await page.goto('/login');
  9  |     
  10 |     const loginPage = new LoginPage(page);
  11 |     await loginPage.expectLoaded();
  12 |     
  13 |     await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  14 |     await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
  15 |     await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  16 |   });
  17 | 
  18 |   test('should show validation errors for empty fields', async ({ page }) => {
  19 |     await page.goto('/login');
  20 |     
  21 |     await page.locator('button[id="login-submit"]').click();
  22 |     
  23 |     await expect(page.getByText(/nhập email/i)).toBeVisible();
  24 |   });
  25 | 
  26 |   test('should navigate to register page', async ({ page }) => {
  27 |     await page.goto('/login');
  28 |     
  29 |     await page.getByRole('link', { name: /create one free/i }).click();
  30 |     
  31 |     await expect(page).toHaveURL(/\/register/);
  32 |   });
  33 | });
  34 | 
  35 | test.describe('Dashboard', () => {
  36 |   test.beforeEach(async ({ page }) => {
  37 |     await loginAsTestUser(page);
  38 |   });
  39 | 
  40 |   test('should display dashboard with navigation', async ({ page }) => {
  41 |     const dashboardPage = new DashboardPage(page);
  42 |     
  43 |     await expect(dashboardPage.getLogo()).toBeVisible();
  44 |   });
  45 | 
  46 |   test('should navigate to My Sets', async ({ page }) => {
  47 |     await page.getByRole('link', { name: /flashcards/i }).click();
  48 |     
> 49 |     await expect(page).toHaveURL(/\/quizlet/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  50 |   });
  51 | });
  52 | 
```