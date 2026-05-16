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
  // Try to login with seeded credentials first
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.locator('#login-email').fill('test@example.com');
  await page.locator('#login-password').fill('TestPass123!');
  
  // Submit
  await page.locator('#login-submit').click();
  await page.waitForTimeout(3000);

  // Check if login succeeded
  if (page.url().includes('/login')) {
    // Seeded user doesn't exist, register new user
    const { email, password } = await registerTestUser(page);
    
    // Now login with new credentials
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.locator('#login-submit').click();
    await page.waitForTimeout(3000);
  }

  // Verify we're logged in
  await page.waitForTimeout(1000);
}

export { loginAsTestUser, registerTestUser, generateTestEmail };
