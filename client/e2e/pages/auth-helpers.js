let userCounter = 0;

function generateTestEmail() {
  userCounter++;
  return `playwright${Date.now()}@test.com`;
}

async function registerTestUser(page) {
  const testEmail = generateTestEmail();
  const testPassword = 'TestPass123!';

  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  // Fill registration form using IDs
  await page.locator('#register-email').fill(testEmail);
  await page.locator('#register-username').fill(`user${Date.now().toString().slice(-6)}`);
  await page.locator('#register-password').fill(testPassword);
  await page.locator('#register-confirm').fill(testPassword);

  // Submit registration
  await page.locator('#register-submit').click();
  
  // Wait for registration to complete (might redirect to OTP page)
  await page.waitForTimeout(2000);
  
  // If OTP verification is required, skip it by going directly to dashboard
  if (page.url().includes('/register/otp')) {
    // Bypass OTP by navigating to flashcard page
    await page.goto('/flashcards');
    await page.waitForLoadState('networkidle');
  }

  return { email: testEmail, password: testPassword };
}

async function loginAsTestUser(page) {
  // Log in with the seeded student account from AGENTS.md.
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('#login-email').fill('student@gmail.com');
  await page.locator('#login-password').fill('Memoris123');
  
  await page.locator('#login-submit').click();
  await page.waitForURL(/\/(dashboard|quizlet|$)/, { timeout: 15000 });
}

export { loginAsTestUser, registerTestUser, generateTestEmail };
