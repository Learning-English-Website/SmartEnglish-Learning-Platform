import { useState, useEffect } from 'react';
import { gamificationService } from '../../../api/gamificationService';
import './XPProgressBar.css';

/**
 * XPProgressBar — Hiển thị level + XP progress
 * Dùng trong Profile page
 */
export default function XPProgressBar({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gamificationService.getStats()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setStats(data?.gamification ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className={`xp-bar ${compact ? 'xp-bar--compact' : ''}`}>
        <div className="xp-bar__skeleton" />
      </div>
    );
  }

  if (!stats) return null;

  const { level, xp: xpCurrent, xpCurrentLevel, xpToNextLevel, xpPerLevel } = stats;
  const progressPercent = xpPerLevel > 0
    ? Math.min(100, Math.round((xpCurrentLevel / xpPerLevel) * 100))
    : 0;

  return (
    <div
      className={`xp-bar ${compact ? 'xp-bar--compact' : ''}`}
      aria-label={`Level ${level}, ${xpCurrentLevel} / ${xpPerLevel} XP`}
    >
      {/* Level Badge */}
      <div className="xp-bar__level-badge" title={`Level ${level}`}>
        <span className="xp-bar__level-num">{level}</span>
      </div>

      {/* Progress area */}
      <div className="xp-bar__progress-area">
        {!compact && (
          <div className="xp-bar__labels">
            <span className="xp-bar__label-level">Level {level}</span>
            <span className="xp-bar__label-xp">
              {xpCurrentLevel.toLocaleString()} / {xpPerLevel.toLocaleString()} XP
            </span>
          </div>
        )}
        <div className="xp-bar__track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="xp-bar__fill"
            style={{ width: `${progressPercent}%` }}
          />
          {!compact && (
            <span className="xp-bar__percent">{progressPercent}%</span>
          )}
        </div>
        {!compact && (
          <div className="xp-bar__next">
            <span>Cần {xpToNextLevel.toLocaleString()} XP để lên Level {level + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}
