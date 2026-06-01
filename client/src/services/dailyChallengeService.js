import axiosClient from '../api/axiosClient';

export const dailyChallengeService = {
  getToday: () => axiosClient.get('/quests/daily-challenge'),
  join: (challengeId) => axiosClient.post(`/quests/daily-challenge/${challengeId}/join`),
  getLeaderboard: ({ date } = {}) => axiosClient.get('/quests/daily-challenge/leaderboard', { params: date ? { date } : {} }),
};
