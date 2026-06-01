const questService = require('./quest.service');
const dailyChallengeService = require('./dailyChallenge.service');
const { asyncHandler } = require('../../shared/utils/asyncHandler');
const { ApiResponse } = require('../../shared/utils/apiResponse');
const { getDateKey } = require('../../shared/utils/dateKey');

class QuestController {
  getDailyQuests = asyncHandler(async (req, res) => {
    const quests = await questService.getDailyQuests(req.userId);
    res.json(ApiResponse.success(quests));
  });

  getDailyChallenge = asyncHandler(async (req, res) => {
    const challenge = await dailyChallengeService.getTodayChallenge();
    res.json(ApiResponse.success(challenge));
  });

  joinDailyChallenge = asyncHandler(async (req, res) => {
    const { challengeId } = req.params;
    const challenge = await dailyChallengeService.joinChallenge(req.userId, challengeId);
    res.json(ApiResponse.success(challenge));
  });

  getDailyChallengeLeaderboard = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const dateKey = date || getDateKey(new Date());
    const leaderboard = await dailyChallengeService.getLeaderboard(dateKey, { limit: 20 });
    res.json(ApiResponse.success({ date: dateKey, leaderboard }));
  });

  claimReward = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await questService.claimReward(req.userId, id);
    res.json(ApiResponse.success(result, 'Phần thưởng đã được nhận!'));
  });

  getStats = asyncHandler(async (req, res) => {
    const stats = await questService.getStats(req.userId);
    res.json(ApiResponse.success(stats));
  });
}

module.exports = new QuestController();
