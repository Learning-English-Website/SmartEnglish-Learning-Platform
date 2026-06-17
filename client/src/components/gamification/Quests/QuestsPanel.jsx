import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questService } from '../../../services/questService';
import toast from 'react-hot-toast';

const ICON_MAP = {
  '⚡': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  '🌱': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  '📚': { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  '🔄': { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
  '🧠': { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
  '🎯': { bg: 'rgba(99,91,255,0.12)', color: '#635bff' },
};

export default function QuestsPanel() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    loadQuests();
  }, []);

  // Real-time quest updates via window event
  useEffect(() => {
    const handleQuestUpdate = () => loadQuests();
    window.addEventListener('quest:update', handleQuestUpdate);
    return () => window.removeEventListener('quest:update', handleQuestUpdate);
  }, []);

  const loadQuests = async () => {
    try {
      const res = await questService.getDailyQuests();
      const list = Array.isArray(res)
        ? res
        : (res?.data && Array.isArray(res.data) ? res.data
          : (res?.data?.data && Array.isArray(res.data.data) ? res.data.data
            : (res?.data?.quests && Array.isArray(res.data.quests) ? res.data.quests : [])));
      setQuests(list);
    } catch (err) {
      console.error('[QuestsPanel] Failed to load quests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (questId) => {
    setClaimingId(questId);
    try {
      const res = await questService.claimReward(questId);
      setQuests(prev =>
        prev.map(q => q.id === questId ? { ...q, rewardClaimed: true } : q)
      );
    } catch (err) {
      console.error('[QuestsPanel] Claim failed:', err);
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
        Đang tải quests...
      </div>
    );
  }

  const completedCount = quests.filter(q => q.isCompleted).length;
  const totalRewards = quests
    .filter(q => q.isCompleted)
    .reduce((sum, q) => sum + q.xpReward, 0);

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e1b4b' }}>
            Nhiệm Vụ Hôm Nay
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            {completedCount}/{quests.length} nhiệm vụ hoàn thành
          </p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          borderRadius: '12px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span style={{ fontSize: '0.9rem' }}>⚡</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
            +{totalRewards} XP
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {quests.length > 0 && (
        <div style={{
          height: 6,
          background: 'rgba(99,91,255,0.1)',
          borderRadius: '99px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              borderRadius: '99px',
              background: 'linear-gradient(90deg, #635bff, #818cf8)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / quests.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Quest list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence>
          {quests.map((quest, idx) => {
            const iconStyle = ICON_MAP[quest.icon] || ICON_MAP['🎯'];
            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: quest.isCompleted && !quest.rewardClaimed
                    ? '1.5px solid rgba(99,91,255,0.3)'
                    : '1px solid rgba(0,0,0,0.05)',
                  boxShadow: quest.isCompleted && !quest.rewardClaimed
                    ? '0 4px 16px rgba(99,91,255,0.1)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: iconStyle.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}>
                  {quest.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e1b4b' }}>
                      {quest.title}
                    </span>
                    {quest.isCompleted && (
                      <span style={{
                        background: '#10b981',
                        color: '#fff',
                        borderRadius: '999px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                      }}>
                        DONE
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {quest.description}
                  </p>

                  {/* Progress bar */}
                  <div style={{
                    height: 6,
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: '99px',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '99px',
                        background: quest.isCompleted
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #635bff, #818cf8)',
                        width: `${quest.progressPercent}%`,
                        transition: 'width 0.5s ease-out',
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 4,
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                      {quest.progress}/{quest.targetValue}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: quest.isCompleted ? '#10b981' : '#635bff',
                    }}>
                      {quest.progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Reward + Claim button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: '8px',
                    padding: '3px 8px',
                  }}>
                    <span style={{ fontSize: '0.8rem' }}>⚡</span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#d97706',
                    }}>
                      +{quest.xpReward}
                    </span>
                  </div>

                  {quest.isCompleted && !quest.rewardClaimed && (
                    <motion.button
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClaim(quest.id)}
                      disabled={claimingId === quest.id}
                      style={{
                        background: 'linear-gradient(135deg, #635bff, #818cf8)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: claimingId === quest.id ? 'wait' : 'pointer',
                        opacity: claimingId === quest.id ? 0.7 : 1,
                        boxShadow: '0 4px 12px rgba(99,91,255,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {claimingId === quest.id ? '...' : 'Nhận'}
                    </motion.button>
                  )}

                  {quest.rewardClaimed && (
                    <span style={{
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      ✓ Nhận rồi
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
