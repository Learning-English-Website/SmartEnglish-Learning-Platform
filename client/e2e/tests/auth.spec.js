import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { loginAsTestUser } from '../pages/auth-helpers';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    const loginPage = new LoginPage(page);
    await loginPage.expectLoaded();
    
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('button[id="login-submit"]').click();
    
    await expect(page.getByText(/nhập email/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByRole('link', { name: /create one free/i }).click();
    
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display dashboard with navigation', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    
    await expect(dashboardPage.getLogo()).toBeVisible();
  });

  test('should navigate to My Sets', async ({ page }) => {
    await page.getByRole('link', { name: /flashcards/i }).click();
    
    await expect(page).toHaveURL(/\/quizlet/);
  });
});
