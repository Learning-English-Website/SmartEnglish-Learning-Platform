const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getStats,
  submitMatchScore,
  getLeaderboard,
  getAchievements,
  triggerLearnComplete,
  triggerTestComplete,
} = require('./gamification.controller');

// Tất cả routes yêu cầu đăng nhập
router.use(authenticate);

// GET  /api/gamification/stats              → streak + XP + level
router.get('/stats', getStats);

// GET  /api/gamification/achievements       → tất cả badges (locked/unlocked)
router.get('/achievements', getAchievements);

// GET  /api/gamification/leaderboard/:setId → top 10 Match Mode cho set
router.get('/leaderboard/:setId', getLeaderboard);

// POST /api/gamification/match/submit       → gửi kết quả Match
router.post('/match/submit', submitMatchScore);

// POST /api/gamification/learn/complete      → hoàn thành chế độ Học
router.post('/learn/complete', triggerLearnComplete);

// POST /api/gamification/test/complete       → hoàn thành chế độ Kiểm tra
router.post('/test/complete', triggerTestComplete);

module.exports = router;
