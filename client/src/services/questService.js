import axiosClient from '../api/axiosClient';

export const questService = {
  getDailyQuests: () => axiosClient.get('/quests/daily'),
  claimReward: (questId) => axiosClient.post(`/quests/${questId}/claim`),
  getStats: () => axiosClient.get('/quests/stats'),
};
