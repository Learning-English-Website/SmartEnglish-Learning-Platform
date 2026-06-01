/**
 * Pre-test setup for studySession tests.
 * This file MUST be loaded BEFORE studySession.test.js via jest's setupFiles.
 * 
 * It ensures the StudySession model is loaded fresh (without any schema modifications
 * from other test files that may have loaded it in the jest environment).
 * 
 * This approach avoids the module cache pollution that occurs when jest.setup.js
 * loads models before individual test files run.
 */

// Ensure the StudySession model cache is cleared before studySession tests load
const mongoose = require('mongoose');
if (mongoose.connection.models.StudySession) {
  delete mongoose.connection.models.StudySession;
}

// Clear any existing require cache for studySession-related modules
const path = require('path');
const cacheKeys = Object.keys(require.cache);
for (const key of cacheKeys) {
  if (key.includes('studySession') || key.includes('StudySession')) {
    delete require.cache[key];
  }
}
