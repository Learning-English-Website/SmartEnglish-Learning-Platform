import { useState, useEffect } from 'react';
import { gamificationService } from '../../../api/gamificationService';
import './AchievementBadge.css';

/**
 * AchievementBadge — Grid hiển thị tất cả huy hiệu (locked/unlocked)
 * Dùng trong Profile page
 */
export default function AchievementBadge() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gamificationService.getAchievements()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setAchievements(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="ach-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="ach-badge ach-badge--skeleton" />
        ))}
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked   = achievements.filter((a) => !a.unlocked);

  return (
    <div className="ach-section">
      <div className="ach-section__header">
        <h3 className="ach-section__title">🏅 Huy hiệu</h3>
        <span className="ach-section__count">
          {unlocked.length}/{achievements.length} đã mở khóa
        </span>
      </div>

      <div className="ach-grid">
        {/* Unlocked trước */}
        {unlocked.map((ach) => (
          <div
            key={ach.key}
            className="ach-badge ach-badge--unlocked"
            title={`${ach.title}: ${ach.description}`}
            aria-label={`Huy hiệu: ${ach.title} - Đã mở khóa`}
          >
            <div className="ach-badge__emoji">{ach.emoji}</div>
            <div className="ach-badge__name">{ach.title}</div>
            {ach.xpReward > 0 && (
              <div className="ach-badge__xp">+{ach.xpReward} XP</div>
            )}
            <div className="ach-badge__check">✓</div>
          </div>
        ))}

        {/* Locked sau */}
        {locked.map((ach) => (
          <div
            key={ach.key}
            className="ach-badge ach-badge--locked"
            title={`${ach.title}: ${ach.description}`}
            aria-label={`Huy hiệu: ${ach.title} - Chưa mở khóa`}
          >
            <div className="ach-badge__emoji">{ach.emoji}</div>
            <div className="ach-badge__name">{ach.title}</div>
            <div className="ach-badge__desc">{ach.description}</div>
            <div className="ach-badge__lock">🔒</div>
          </div>
        ))}
      </div>
    </div>
  );
}
