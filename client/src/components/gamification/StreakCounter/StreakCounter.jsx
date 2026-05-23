import { useState, useEffect } from 'react';
import { gamificationService } from '../../../api/gamificationService';
import './StreakCounter.css';

/**
 * StreakCounter — Hiển thị chuỗi ngày học trên Navbar
 * 🔥 cam = đã học hôm nay | ⬜ xám = chưa học hôm nay
 */
export default function StreakCounter() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gamificationService.getStats()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setStreak(data?.streak ?? null);
      })
      .catch(() => {/* silent */})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading || !streak) return null;

  const studiedToday = streak.studiedToday;
  const current = streak.current || 0;
  const longest = streak.longest || 0;

  return (
    <div
      className={`streak-counter ${studiedToday ? 'streak-counter--active' : 'streak-counter--inactive'}`}
      title={`Chuỗi hiện tại: ${current} ngày | Kỷ lục: ${longest} ngày`}
      aria-label={`Chuỗi học: ${current} ngày`}
      id="streak-counter-navbar"
    >
      <span className="streak-counter__flame" aria-hidden="true">
        {studiedToday ? '🔥' : '🔥'}
      </span>
      <span className="streak-counter__number">{current}</span>
    </div>
  );
}
