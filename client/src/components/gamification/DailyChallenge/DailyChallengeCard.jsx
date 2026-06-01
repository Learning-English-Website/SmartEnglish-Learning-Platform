import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Zap, Play, Star } from 'lucide-react';
import { dailyChallengeService } from '../../../services/dailyChallengeService';
import { selectUser } from '../../../store/slices/authSlice';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

function getDateKey(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export default function DailyChallengeCard({ hideLeaderboard = false } = {}) {
  const [challenge, setChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const currentUser = useSelector(selectUser);

  const dateKey = getDateKey();

  // Merge the live leaderboard with current user appended at the bottom if not present
  const rankedLeaderboard = [];

  // Merge the live leaderboard with current user appended at the bottom if not present
  const computeRankedLeaderboard = () => {
    if (!leaderboard.length && !currentUser) return [];

    const currentUid = currentUser?._id ?? currentUser?.id ?? null;

    const isCurrentUserInList = leaderboard.some((row) => {
      const uid = typeof row.userId === 'object'
        ? String(row.userId?._id ?? row.userId?.id ?? '')
        : String(row.userId || '');
      return uid === String(currentUid);
    });

    let entries = [...leaderboard];

    if (!isCurrentUserInList && currentUser) {
      entries.push({
        userId: currentUid,
        username: currentUser.username || 'Bạn',
        xp: 0,
        isCurrentUser: true,
      });
    }

    const sorted = [...entries].sort((a, b) => b.xp - a.xp);

    const currentUserEntry = sorted.find((r) => r.isCurrentUser);
    const withoutCurrentUser = sorted.filter((r) => !r.isCurrentUser);
    const finalOrder = currentUserEntry ? [...withoutCurrentUser, currentUserEntry] : sorted;

    return finalOrder.map((row, idx) => ({
      ...row,
      rank: idx + 1,
    }));
  };

  const load = async () => {
    setLoading(true);
    try {
      console.log('[DailyChallengeCard] loading…', { dateKey });
      const cRes = await dailyChallengeService.getToday();
      console.log('[DailyChallengeCard] getToday response:', cRes);
      const c = cRes?.data || null;
      setChallenge(c);

      const lbRes = await dailyChallengeService.getLeaderboard({ date: dateKey });
      console.log('[DailyChallengeCard] leaderboard response:', lbRes);
      const next = lbRes?.data?.leaderboard || lbRes?.leaderboard || lbRes?.data?.data?.leaderboard || [];
      console.log('[DailyChallengeCard] leaderboard load parsed length:', Array.isArray(next) ? next.length : -1);
      setLeaderboard(next);
    } catch (err) {
      console.error('[DailyChallengeCard] load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // Check every 10s: if day changed, reload so dateKey and challenge both update
    const id = window.setInterval(() => {
      const nextKey = getDateKey();
      if (nextKey !== dateKey) {
        console.log('[DailyChallengeCard] day rolled over, reloading…', { from: dateKey, to: nextKey });
        window.location.reload();
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [dateKey]);

  useEffect(() => {
    if (loading) return;

    const refreshLeaderboard = () => {
      const key = getDateKey();
      dailyChallengeService.getLeaderboard({ date: key })
        .then((lbRes) => {
          const next = lbRes?.data?.leaderboard || lbRes?.leaderboard || lbRes?.data?.data?.leaderboard || [];
          console.log('[DailyChallengeCard] leaderboard refresh parsed:', {
            hasData: Boolean(lbRes?.data),
            keys: lbRes ? Object.keys(lbRes) : null,
            parsedLength: Array.isArray(next) ? next.length : -1,
          });
          setLeaderboard(next);
        })
        .catch(() => {});
    };

    // Apply XP delta from socket event directly — instant, no API round-trip
    const onRefresh = (event) => {
      console.log('[DailyChallengeCard] window event dailyChallenge:leaderboard:refresh', event?.detail);
      const detail = event?.detail;

      if (detail?.xpDelta != null && detail?.userId) {
        setLeaderboard((prev) => {
          const uid = typeof detail.userId === 'object'
            ? String(detail.userId._id || detail.userId.id || detail.userId)
            : String(detail.userId);
          const updated = prev.map((row) => {
            const rowUid = typeof row.userId === 'object'
              ? String(row.userId._id || row.userId.id || row.userId)
              : String(row.userId || '');
            if (rowUid === uid) {
              return { ...row, xp: detail.totalXp ?? (row.xp + detail.xpDelta) };
            }
            return row;
          });
          return [...updated].sort((a, b) => b.xp - a.xp);
        });
      } else {
        refreshLeaderboard();
      }
    };

    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = window.setInterval(() => {
        refreshLeaderboard();
      }, 10000);
    };

    const stopPolling = () => {
      if (!pollingRef.current) return;
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };

    window.addEventListener('dailyChallenge:leaderboard:refresh', onRefresh);

    startPolling();

    const onRealtime = () => {
      stopPolling();
      window.setTimeout(() => startPolling(), 30000);
    };
    window.addEventListener('dailyChallenge:leaderboard:refresh', onRealtime);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLeaderboard();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      window.removeEventListener('dailyChallenge:leaderboard:refresh', onRefresh);
      window.removeEventListener('dailyChallenge:leaderboard:refresh', onRealtime);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loading]);

  const onJoin = async () => {
    if (!challenge?._id || !challenge?.lesson?._id) return;
    setJoining(true);
    try {
      console.log('[DailyChallengeCard] join click:', { challengeId: challenge._id, lessonId: challenge.lesson._id, dateKey });
      const joinRes = await dailyChallengeService.join(challenge._id);
      console.log('[DailyChallengeCard] join response:', joinRes);

      const lbRes = await dailyChallengeService.getLeaderboard({ date: dateKey });
      console.log('[DailyChallengeCard] leaderboard after join:', lbRes);
      const next = lbRes?.data?.leaderboard || lbRes?.leaderboard || lbRes?.data?.data?.leaderboard || [];
      console.log('[DailyChallengeCard] leaderboard after join parsed length:', Array.isArray(next) ? next.length : -1);
      setLeaderboard(next);

      navigate(`/duolingo/lesson/${challenge.lesson._id}`);
    } catch (err) {
      console.error('[DailyChallengeCard] join failed:', err);
    } finally {
      setJoining(false);
    }
  };

  const ranked = computeRankedLeaderboard();

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ color: '#94a3b8' }}>Đang tải Daily Challenge…</div>
      </div>
    );
  }

  if (!challenge?.lesson) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>
          Daily Challenge
        </div>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Hôm nay chưa có thử thách (hoặc thiếu dữ liệu bài học).
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'linear-gradient(135deg, rgba(99,91,255,0.12), rgba(16,185,129,0.10))',
        border: '1px solid rgba(99,91,255,0.16)',
        borderRadius: 28,
        padding: 16,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(99,91,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Trophy size={22} color="#635bff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e1b4b' }}>
              Daily Challenge
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>
              {challenge.date || dateKey}
            </div>
          </div>
        </div>

        {/* removed XP/bonus badges */}
      </div>

      <div style={{
        marginTop: 10, padding: '8px 12px',
        background: 'rgba(255,255,255,0.5)', borderRadius: 12,
        fontSize: '0.82rem', color: '#475569',
      }}>
        <span style={{ fontWeight: 600 }}>{challenge.lesson?.title || 'Unknown lesson'}</span>
        <span style={{ color: '#94a3b8' }}> · {challenge.participants || 0} người tham gia</span>
      </div>

      <button
        onClick={onJoin}
        disabled={joining}
        style={{
          width: '100%', marginTop: 10, padding: '9px 0',
          background: 'linear-gradient(135deg, #635bff, #818cf8)',
          color: '#fff', border: 'none', borderRadius: 14,
          fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: joining ? 0.7 : 1,
        }}
      >
        <Play size={15} fill="white" />
        {joining ? 'Đang tham gia…' : 'Tham Gia Ngay'}
      </button>

      {!hideLeaderboard && ranked.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Bảng Xếp Hạng · {dateKey}
          </div>
          {ranked.slice(0, 5).map((row, i) => {
            const isMe = row.isCurrentUser || row.userId === currentUser?._id || row.userId === currentUser?.id;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                background: isMe ? 'rgba(99,91,255,0.08)' : 'transparent',
                borderRadius: 10, padding: '6px 8px',
              }}>
                <span style={{
                  width: 20, textAlign: 'center', fontWeight: 800,
                  fontSize: '0.75rem', color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#94a3b8',
                }}>
                  {row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank - 1] : `#${row.rank}`}
                </span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#64748b',
                  flexShrink: 0, overflow: 'hidden',
                }}>
                  {row.avatar
                    ? <img src={row.avatar} alt={row.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (row.username?.[0]?.toUpperCase() || '?')
                  }
                </div>
                <span style={{
                  flex: 1, fontSize: '0.8rem', fontWeight: isMe ? 700 : 500,
                  color: isMe ? '#1e1b4b' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {isMe ? 'Bạn' : row.username}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Zap size={11} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f59e0b' }}>
                    {row.xp}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
