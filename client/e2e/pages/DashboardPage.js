import { expect } from '@playwright/test';

export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.logo = page.locator('a:has-text("Memoris")').first();
  }

  async expectLoaded() {
    await expect(this.logo).toBeVisible({ timeout: 10000 });
  }

  getLogo() {
    return this.logo;
  }

  getNavLinks() {
    return this.page.locator('nav a, footer a');
  }
}
