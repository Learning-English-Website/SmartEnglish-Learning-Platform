const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceRoot = path.resolve(__dirname, '..');
const testResultsDir = path.resolve(workspaceRoot, 'client/test-results');

console.log('🧹 Clearing old test results...');
try {
  if (fs.existsSync(testResultsDir)) {
    fs.rmSync(testResultsDir, { recursive: true, force: true });
  }
  console.log('✅ Old test results cleared.');
} catch (err) {
  console.error('❌ Failed to clear old results:', err.message);
}

console.log('🚀 Running E2E tests for UC01 - UC10 (Auth & Flashcards)...');
try {
  execSync(
    'npm run test:e2e --workspace=client -- e2e/tests/uc01-uc04.auth-flows.spec.js e2e/tests/uc08-uc10.flashcard-set-crud.spec.js',
    { cwd: workspaceRoot, stdio: 'inherit' }
  );
  console.log('✅ E2E tests execution finished.');
} catch (err) {
  console.warn('⚠️ Some tests failed or returned non-zero code, proceeding to rename anyway...');
}

if (!fs.existsSync(testResultsDir)) {
  console.error('❌ test-results directory does not exist. Tests did not run or failed to generate results.');
  process.exit(1);
}

const mappings = [
  { pattern: '8f198', tc: 'TC-UC01-01-Dang-ky-tai-khoan-thanh-cong' },
  { pattern: '29d8d', tc: 'TC-UC01-03-Dang-ky-that-bai-khi-trung-Email' },
  { pattern: 'c2bf2', tc: 'TC-UC02-01-Dang-nhap-thanh-cong' },
  { pattern: 'a55cb', tc: 'TC-UC02-02-Dang-nhap-that-bai-do-sai-mat-khau' },
  { pattern: '4af84', tc: 'TC-UC02-03-Dang-nhap-tai-khoan-chua-xac-thuc' },
  { pattern: 'a0506', tc: 'TC-UC04-01-Khoi-phuc-mat-khau-thanh-cong' },
  { pattern: 'ba699', tc: 'TC-UC08-01-Tao-bo-the-hoc-moi' },
  { pattern: '4acf6', tc: 'TC-UC08-02-Chan-tao-bo-the-vi-thieu-tieu-de' },
  { pattern: '7e24f', tc: 'TC-UC09-01-Chinh-sua-bo-the-thanh-cong' },
  { pattern: '72180', tc: 'TC-UC10-01-Xoa-bo-the-thanh-cong' },
];

console.log('📂 Renaming result folders to clean Test Case IDs...');
const items = fs.readdirSync(testResultsDir);

for (const item of items) {
  const fullPath = path.join(testResultsDir, item);
  if (!fs.statSync(fullPath).isDirectory()) continue;

  const foundMapping = mappings.find(m => item.includes(m.pattern));
  if (foundMapping) {
    const isMobile = item.endsWith('-mobile');
    const newName = `${foundMapping.tc}-${isMobile ? 'Mobile' : 'Desktop'}`;
    const newPath = path.join(testResultsDir, newName);

    try {
      if (fs.existsSync(newPath)) {
        fs.rmSync(newPath, { recursive: true, force: true });
      }
      fs.renameSync(fullPath, newPath);
      console.log(`✨ Renamed: "${item}" ➡️ "${newName}"`);
    } catch (err) {
      console.error(`❌ Failed to rename "${item}":`, err.message);
    }
  }
}

console.log('🎉 Renaming process complete. Check client/test-results/ folder!');
