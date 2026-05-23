import { useState, useEffect } from 'react';
import { gamificationService } from '../../../api/gamificationService';
import './Leaderboard.css';

/**
 * Leaderboard — Bảng xếp hạng Match Mode cho 1 học phần
 * @param {string} setId - ID của học phần
 */
export default function Leaderboard({ setId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!setId) return;
    let cancelled = false;
    setLoading(true);
    gamificationService.getLeaderboard(setId)
      .then((res) => {
        if (cancelled) return;
        const d = res?.data ?? res;
        setData(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setId]);

  if (loading) {
    return (
      <div className="lb-container">
        <div className="lb-skeleton" />
      </div>
    );
  }

  if (!data || data.totalPlayers === 0) {
    return (
      <div className="lb-container lb-container--empty">
        <div className="lb-empty-icon">🏆</div>
        <p className="lb-empty-text">Chưa có ai chơi Match Mode cho học phần này.</p>
        <p className="lb-empty-sub">Hãy là người đầu tiên!</p>
      </div>
    );
  }

  const MEDALS = ['🥇', '🥈', '🥉'];

  const formatTime = (ms) => {
    if (!ms) return '—';
    const s = (ms / 1000).toFixed(2);
    return `${s}s`;
  };

  return (
    <div className="lb-container">
      <div className="lb-header">
        <h3 className="lb-title">🏆 Bảng xếp hạng Match</h3>
        <span className="lb-total">{data.totalPlayers} người tham gia</span>
      </div>

      {/* Top 3 podium */}
      {data.topScores.length >= 3 && (
        <div className="lb-podium">
          {/* Hạng 2 */}
          <div className="lb-podium__item lb-podium__item--2">
            <div className="lb-podium__avatar">
              {data.topScores[1].avatar
                ? <img src={data.topScores[1].avatar} alt={data.topScores[1].username} />
                : <span>{data.topScores[1].username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="lb-podium__medal">🥈</div>
            <div className="lb-podium__name">{data.topScores[1].username}</div>
            <div className="lb-podium__time">{formatTime(data.topScores[1].timeMs)}</div>
            <div className="lb-podium__bar lb-podium__bar--2" />
          </div>
          {/* Hạng 1 */}
          <div className="lb-podium__item lb-podium__item--1">
            <div className="lb-podium__avatar lb-podium__avatar--gold">
              {data.topScores[0].avatar
                ? <img src={data.topScores[0].avatar} alt={data.topScores[0].username} />
                : <span>{data.topScores[0].username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="lb-podium__medal">🥇</div>
            <div className="lb-podium__name">{data.topScores[0].username}</div>
            <div className="lb-podium__time">{formatTime(data.topScores[0].timeMs)}</div>
            <div className="lb-podium__bar lb-podium__bar--1" />
          </div>
          {/* Hạng 3 */}
          <div className="lb-podium__item lb-podium__item--3">
            <div className="lb-podium__avatar">
              {data.topScores[2].avatar
                ? <img src={data.topScores[2].avatar} alt={data.topScores[2].username} />
                : <span>{data.topScores[2].username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="lb-podium__medal">🥉</div>
            <div className="lb-podium__name">{data.topScores[2].username}</div>
            <div className="lb-podium__time">{formatTime(data.topScores[2].timeMs)}</div>
            <div className="lb-podium__bar lb-podium__bar--3" />
          </div>
        </div>
      )}

      {/* Full list từ hạng 4+ hoặc tất cả nếu < 3 người */}
      <div className="lb-list">
        {data.topScores.map((entry, idx) => (
          <div
            key={entry.username + idx}
            className={`lb-row ${entry.isCurrentUser ? 'lb-row--current' : ''} ${idx < 3 ? 'lb-row--top3' : ''}`}
          >
            <span className="lb-row__rank">
              {idx < 3 ? MEDALS[idx] : `${idx + 1}`}
            </span>
            <div className="lb-row__avatar">
              {entry.avatar
                ? <img src={entry.avatar} alt={entry.username} />
                : <span>{entry.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span className="lb-row__name">
              {entry.username}
              {entry.isCurrentUser && <span className="lb-row__you"> (Bạn)</span>}
            </span>
            <span className="lb-row__time">{formatTime(entry.timeMs)}</span>
          </div>
        ))}
      </div>

      {/* User's personal best nếu không nằm trong top 10 */}
      {data.userBest && !data.topScores.some((e) => e.isCurrentUser) && (
        <div className="lb-your-rank">
          <span>Kỷ lục của bạn: <strong>{formatTime(data.userBest.timeMs)}</strong></span>
          <span>Hạng #{data.userBest.rank}</span>
        </div>
      )}
    </div>
  );
}
