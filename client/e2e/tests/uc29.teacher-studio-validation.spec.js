import { test, expect } from '@playwright/test';

test.describe('Teacher Studio - Curriculum (UC29)', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Admin/Teacher
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email').fill('admin@gmail.com');
    await page.locator('#login-password').fill('Memoris123');
    await page.locator('#login-submit').click();
    await page.waitForTimeout(3000);
  });

  // ─────────────────────────────────────────────────────────────────
  // TC-UC29-03: Không cho lưu Lesson khi thiếu tiêu đề bắt buộc
  // ─────────────────────────────────────────────────────────────────
  
  test('TC-UC29-03: should block saving a lesson when title is missing', async ({ page }) => {
    await page.goto('/teacher/studio');
    await page.waitForLoadState('networkidle');

    // 1. Select the seeded course from the dropdown to load the tree
    const courseSelect = page.locator('select').first();
    await expect(courseSelect).toBeVisible();
    await courseSelect.selectOption({ label: 'English Beginner Core' });
    await page.waitForTimeout(1000);

    // 2. Click the "Thêm Bài học mới" button on the first Unit
    const addLessonBtn = page.locator('button[title="Thêm Bài học mới"]').first();
    await expect(addLessonBtn).toBeVisible();
    await addLessonBtn.click();
    await page.waitForTimeout(500);

    // 3. Ensure the title input is empty (should be empty by default for new lesson)
    const titleInput = page.getByPlaceholder('ví dụ: Luyện cấu trúc My name is...');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(''); // Clear just in case

    // 4. Set up request spy to check if any save requests are sent
    let requestSent = false;
    page.on('request', req => {
      if (req.method() === 'POST' && (req.url().includes('/api/admin/lessons') || req.url().includes('/api/lessons'))) {
        requestSent = true;
      }
    });

    // 5. Click the save button
    const saveBtn = page.locator('button.save-btn', { hasText: 'Lưu lại' });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // 6. Verify client-side error toast/message is displayed
    const errorToast = page.locator('text=Vui lòng nhập tiêu đề bài học').first();
    await expect(errorToast).toBeVisible();

    // 7. Verify no network request was sent to the server for creation
    expect(requestSent).toBe(false);
  });
});
