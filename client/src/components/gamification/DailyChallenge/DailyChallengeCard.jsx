import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Zap, Play } from 'lucide-react';
import { selectUser } from '../../../store/slices/authSlice';
import { useSocket } from '../../../context/SocketContext';
import { dailyChallengeService } from '../../../services/dailyChallengeService';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

function getDateKey(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

function normalizeChallenge(payload) {
  if (!payload) return null;
  return payload.challenge || payload.data?.challenge || payload.data || payload;
}

function normalizeLeaderboard(payload) {
  const rows = payload?.leaderboard || payload?.data?.leaderboard || payload?.data || payload || [];
  return Array.isArray(rows) ? rows : [];
}

function getRowUserId(row) {
  return typeof row?.userId === 'object'
    ? String(row.userId?._id ?? row.userId?.id ?? '')
    : String(row?.userId || '');
}

export default function DailyChallengeCard({ hideLeaderboard = false } = {}) {
  const [challenge, setChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const { isConnected, socketRef, subscribeDailyChallenge, unsubscribeDailyChallenge } = useSocket();

  const dateKey = useMemo(() => getDateKey(), []);

  const computeRankedLeaderboard = useCallback(() => {
    if (!leaderboard.length && !currentUser) return [];

    const currentUid = currentUser?._id ?? currentUser?.id ?? null;
    const isCurrentUserInList = leaderboard.some((row) => getRowUserId(row) === String(currentUid));

    const entries = [...leaderboard];
    if (!isCurrentUserInList && currentUser) {
      entries.push({
        userId: currentUid,
        username: currentUser.username || 'Bạn',
        xp: 0,
        isCurrentUser: true,
      });
    }

    return [...entries]
      .sort((a, b) => b.xp - a.xp)
      .map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [leaderboard, currentUser]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const [challengeRes, leaderboardRes] = await Promise.all([
        dailyChallengeService.getToday(),
        dailyChallengeService.getLeaderboard({ date: dateKey }),
      ]);
      setChallenge(normalizeChallenge(challengeRes.data));
      setLeaderboard(normalizeLeaderboard(leaderboardRes.data));
      setSocketError(null);
    } catch (err) {
      setSocketError(err?.response?.data?.message || err?.message || 'Không thể tải Thử thách hằng ngày');
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  // ── Effect 1: Initial load ────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── Effect 2: WebSocket via window event bridge ─────────────────────────
  useEffect(() => {
    let mounted = true;

    console.log('[DailyChallengeCard] effect mount', { dateKey });

    // Subscribe to daily challenge room when socket is available
    if (socketRef.current?.connected) {
      console.log('[DailyChallengeCard] initial subscribe', { dateKey, socketId: socketRef.current.id });
      subscribeDailyChallenge(dateKey, 20);
    }

    const onLeaderboardRefresh = (event) => {
      if (!mounted) return;
      const data = event.detail;
      if (data?.date !== dateKey) return;
      console.log('[DailyChallengeCard] leaderboard refresh', data);
      setLeaderboard(normalizeLeaderboard(data));
      setSocketError(null);
      setLoading(false);
    };

    const onChallengeRefresh = (event) => {
      if (!mounted) return;
      const data = event.detail;
      if (data?.date !== dateKey) return;
      console.log('[DailyChallengeCard] challenge refresh', data);
      setChallenge(normalizeChallenge(data));
      setLoading(false);
    };

    // When socket connects, re-subscribe and fetch
    const onSocketConnected = () => {
      if (!mounted) return;
      console.log('[DailyChallengeCard] socket connected -> resubscribe', { dateKey, socketId: socketRef.current?.id });
      subscribeDailyChallenge(dateKey, 20);
      fetchLeaderboard();
    };

    window.addEventListener('dailyChallenge:leaderboard:refresh', onLeaderboardRefresh);
    window.addEventListener('dailyChallenge:challenge:refresh', onChallengeRefresh);
    window.addEventListener('socket:connected', onSocketConnected);
    window.addEventListener('quest:update', onSocketConnected);

    return () => {
      mounted = false;
      console.log('[DailyChallengeCard] effect cleanup', { dateKey });
      unsubscribeDailyChallenge(dateKey);
      window.removeEventListener('dailyChallenge:leaderboard:refresh', onLeaderboardRefresh);
      window.removeEventListener('dailyChallenge:challenge:refresh', onChallengeRefresh);
      window.removeEventListener('socket:connected', onSocketConnected);
      window.removeEventListener('quest:update', onSocketConnected);
    };
  }, [dateKey, socketRef, subscribeDailyChallenge, unsubscribeDailyChallenge, fetchLeaderboard]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const nextKey = getDateKey();
      if (nextKey !== dateKey) {
        window.location.reload();
      }
    }, 10000);

    return () => window.clearInterval(id);
  }, [dateKey]);

  const onJoin = async () => {
    if (!challenge?._id || !challenge?.lesson?._id) return;
    setJoining(true);
    try {
      const response = await dailyChallengeService.join(challenge._id);
      const result = response?.data?.data || response?.data || response;
      const lessonId = result?.lessonId || result?.challenge?.lesson?._id || challenge.lesson._id;
      if (lessonId) {
        navigate(`/duolingo/lesson/${lessonId}?mode=daily&dailyChallengeId=${challenge._id}`);
        return;
      }
      navigate(`/duolingo/lesson/${challenge.lesson._id}?mode=daily&dailyChallengeId=${challenge._id}`);
    } catch (err) {
      console.error('[DailyChallengeCard] join failed:', err);
      setSocketError(err?.response?.data?.message || err?.message || 'Không thể tham gia Thử thách hằng ngày.');
    } finally {
      setJoining(false);
    }
  };

  const ranked = computeRankedLeaderboard();
  const currentUserId = String(currentUser?._id ?? currentUser?.id ?? '');
  const currentUserRow = ranked.find((row) => row.isCurrentUser || getRowUserId(row) === currentUserId);
  const isCurrentUserOutsideTopFive = Boolean(currentUserRow && currentUserRow.rank > 5);
  const topLeaderboardRows = ranked.slice(0, isCurrentUserOutsideTopFive ? 4 : 5);
  const shouldShowCurrentUserFooter = Boolean(isCurrentUserOutsideTopFive);

  const renderLeaderboardRow = (row, i, { isFooter = false } = {}) => {
    const isMe = row.isCurrentUser || getRowUserId(row) === currentUserId;

    return (
      <div key={isFooter ? 'current-user-rank' : getRowUserId(row) || i} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: isFooter ? 0 : 4,
        background: isMe ? 'rgba(99,91,255,0.08)' : 'transparent',
        border: isMe ? '1px solid rgba(99,91,255,0.18)' : '1px solid transparent',
        borderRadius: 10,
        padding: '5px 8px',
      }}>
        <span style={{
          width: 20,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '0.75rem',
          color: row.rank === 1 ? '#f59e0b' : row.rank === 2 ? '#94a3b8' : row.rank === 3 ? '#cd7f32' : '#94a3b8',
        }}>
          {row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : `#${row.rank}`}
        </span>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#64748b',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {row.avatar
            ? <img src={row.avatar} alt={row.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (row.username?.[0]?.toUpperCase() || '?')
          }
        </div>
        <span style={{
          flex: 1,
          fontSize: '0.8rem',
          fontWeight: isMe ? 700 : 500,
          color: isMe ? '#1e1b4b' : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
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
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ color: '#94a3b8' }}>Đang tải Thử thách hằng ngày…</div>
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
        <div style={{ fontWeight: 900, color: '#1e1b4b', marginBottom: 6 }}>Thử thách hằng ngày</div>
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
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 14,
            background: 'rgba(99,91,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Trophy size={22} color="#635bff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e1b4b' }}>
              Thử thách hằng ngày
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>
              {challenge.date || dateKey}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: isConnected ? '#16a34a' : '#f59e0b', fontWeight: 700 }}>
          {isConnected ? 'LIVE' : 'ĐANG KẾT NỐI'}
        </div>
      </div>

      {socketError && (
        <div style={{ marginTop: 10, color: '#b45309', fontSize: '0.85rem' }}>
          {socketError}
        </div>
      )}

      <div style={{
        marginTop: 10,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: 12,
        fontSize: '0.82rem',
        color: '#475569',
      }}>
        <span style={{ fontWeight: 600 }}>{challenge.lesson?.title || 'Unknown lesson'}</span>
        <span style={{ color: '#94a3b8' }}> · {challenge.participants || 0} người tham gia</span>
      </div>

      <button
        onClick={onJoin}
        disabled={joining}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '9px 0',
          background: 'linear-gradient(135deg, #635bff, #818cf8)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: joining ? 0.7 : 1,
        }}
      >
        <Play size={15} fill="white" />
        {joining ? 'Đang tham gia…' : 'Tham Gia Ngay'}
      </button>

      {!hideLeaderboard && ranked.length > 0 && (
        <div style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Bảng Xếp Hạng · {dateKey}
          </div>
          <div className="daily-challenge-leaderboard-scroll" style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: 4,
          }}>
            {topLeaderboardRows.map((row, i) => renderLeaderboardRow(row, i))}
            {shouldShowCurrentUserFooter && (
              <>
                <div style={{
                  height: 1,
                  margin: '8px 0',
                  background: 'linear-gradient(90deg, transparent, rgba(99,91,255,0.25), transparent)',
                }} />
                {renderLeaderboardRow(currentUserRow, currentUserRow.rank - 1, { isFooter: true })}
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

