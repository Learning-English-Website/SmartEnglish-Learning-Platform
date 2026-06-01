const express = require('express');
const router = express.Router();
const questController = require('./quest.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/daily', questController.getDailyQuests);
router.get('/stats', questController.getStats);

// Daily Challenge
router.get('/daily-challenge', questController.getDailyChallenge);
router.post('/daily-challenge/:challengeId/join', questController.joinDailyChallenge);
router.get('/daily-challenge/leaderboard', questController.getDailyChallengeLeaderboard);

router.post('/:id/claim', questController.claimReward);

module.exports = router;
