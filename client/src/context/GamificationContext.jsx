import { createContext, useContext, useState, useCallback } from 'react';
import GamificationRewards from '../components/gamification/GamificationRewards';

const GamificationContext = createContext(null);

/**
 * Wrap toàn bộ app. Cung cấp hàm triggerRewards() để bất kỳ component nào
 * cũng có thể kích hoạt thông báo XP/achievement/level-up.
 */
export function GamificationProvider({ children }) {
  const [rewardResult, setRewardResult] = useState(null);
  const [show, setShow] = useState(false);

  /**
   * Gọi hàm này sau khi nhận response từ gamification API.
   * @param {{ xp, streak, newAchievements }} result
   */
  const triggerRewards = useCallback((result) => {
    if (!result) return;
    // Reset trước để re-trigger animation nếu gọi liên tiếp
    setShow(false);
    setRewardResult(null);
    setTimeout(() => {
      setRewardResult(result);
      setShow(true);
    }, 50);
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  return (
    <GamificationContext.Provider value={{ triggerRewards }}>
      {children}
      <GamificationRewards result={rewardResult} show={show} onDismiss={dismiss} />
    </GamificationContext.Provider>
  );
}

/**
 * Hook để trigger thông báo gamification từ bất kỳ component nào.
 * @returns {{ triggerRewards: (result: object) => void }}
 */
export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}
