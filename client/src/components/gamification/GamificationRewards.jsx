import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, Trophy, ChevronUp, X } from 'lucide-react';

const XP_PER_LEVEL = 500; // must match server constant

// ─── Confetti particles ────────────────────────────────────────────────────────
function Confetti() {
  const colors = ['#f59e0b', '#2c5ef5', '#10b981', '#ec4899', '#a78bfa', '#f97316'];
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            background: p.color,
          }}
          animate={{ y: window.innerHeight + 50, rotate: p.rotate + 720, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ─── Level Up Modal ────────────────────────────────────────────────────────────
function LevelUpModal({ level, onClose }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Confetti />
      <motion.div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '28px',
          padding: '48px 52px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,91,255,0.3)',
          position: 'relative',
          zIndex: 1,
        }}
        initial={{ scale: 0.5, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 12px 40px rgba(245,158,11,0.5)',
          }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
        >
          <Trophy size={44} color="#fff" />
        </motion.div>

        <motion.p
          style={{ color: '#f59e0b', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Chúc mừng!
        </motion.p>
        <motion.h2
          style={{ color: '#fff', fontSize: '2.25rem', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          LEVEL UP!
        </motion.h2>
        <motion.div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, #635bff, #a78bfa)',
            borderRadius: '16px', padding: '10px 28px',
            margin: '12px 0 20px',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        >
          <ChevronUp size={20} color="#fff" strokeWidth={3} />
          <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900 }}>Level {level}</span>
          <ChevronUp size={20} color="#fff" strokeWidth={3} />
        </motion.div>
        <motion.p
          style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 28px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Bạn đã đạt được cấp độ mới! Hãy tiếp tục phát huy!
        </motion.p>
        <motion.button
          style={{
            background: 'linear-gradient(135deg, #635bff, #a78bfa)',
            color: '#fff', border: 'none', borderRadius: '14px',
            padding: '14px 36px', fontSize: '1rem', fontWeight: 700,
            cursor: 'pointer', width: '100%',
            boxShadow: '0 8px 24px rgba(99,91,255,0.4)',
          }}
          onClick={onClose}
          whileHover={{ scale: 1.03, boxShadow: '0 12px 32px rgba(99,91,255,0.5)' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Tuyệt vời! 🎉
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Achievement Toast ─────────────────────────────────────────────────────────
function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 320, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 320, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
        border: '1px solid rgba(99,91,255,0.4)',
        borderRadius: '18px',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '14px',
        minWidth: '300px', maxWidth: '360px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(99,91,255,0.2)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onDismiss}
    >
      {/* Shimmer */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />

      {/* Badge glow */}
      <motion.div
        style={{
          width: 52, height: 52, borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(99,91,255,0.3), rgba(167,139,250,0.3))',
          border: '1px solid rgba(99,91,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', flexShrink: 0,
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {achievement.emoji}
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'rgba(167,139,250,0.9)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>
          🏆 Thành tựu mở khóa!
        </p>
        <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {achievement.title}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {achievement.description}
        </p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          color: '#fff', borderRadius: '10px',
          padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800,
        }}>
          <Zap size={11} /> +{achievement.xpReward} XP
        </span>
      </div>

      <button
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0, padding: 2 }}
        onClick={e => { e.stopPropagation(); onDismiss(); }}
      >
        <X size={16} />
      </button>

      {/* Timer bar */}
      <motion.div
        style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: 'linear-gradient(90deg, #635bff, #a78bfa)', borderRadius: '0 0 18px 18px' }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
}

// ─── XP Progress Bar ───────────────────────────────────────────────────────────
function XPBar({ xpData }) {
  const { oldXP, total, oldLevel, level, xpPerLevel = XP_PER_LEVEL, gained } = xpData;
  const oldLevelBaseXP = (oldLevel - 1) * xpPerLevel;
  const newLevelBaseXP = (level - 1) * xpPerLevel;

  // Calculate positions within the level bar
  const oldPct = Math.min(100, Math.max(0, ((oldXP - oldLevelBaseXP) / xpPerLevel) * 100));
  // If leveled up, we animate to 100% then reset to newPct
  const newPct = Math.min(100, Math.max(0, ((total - newLevelBaseXP) / xpPerLevel) * 100));
  const levelUp = level > oldLevel;

  const [phase, setPhase] = useState(levelUp ? 'filling' : 'final');
  const [displayPct, setDisplayPct] = useState(oldPct);

  useEffect(() => {
    if (levelUp) {
      // Phase 1: fill to 100%
      setTimeout(() => setDisplayPct(100), 100);
      // Phase 2: reset to newPct in new level
      setTimeout(() => {
        setPhase('reset');
        setDisplayPct(0);
      }, 900);
      setTimeout(() => {
        setPhase('final');
        setDisplayPct(newPct);
      }, 1100);
    } else {
      setTimeout(() => setDisplayPct(newPct), 100);
    }
  }, []);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '14px 18px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={16} color="#f59e0b" fill="#f59e0b" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            Level {phase === 'reset' ? level : (levelUp && phase === 'filling' ? oldLevel : level)}
          </span>
        </div>
        <motion.span
          style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 700 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          +{gained} XP ⚡
        </motion.span>
      </div>

      <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
        <motion.div
          style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #635bff, #a78bfa)' }}
          initial={{ width: `${oldPct}%` }}
          animate={{ width: `${displayPct}%` }}
          transition={{ duration: phase === 'reset' ? 0 : 0.8, ease: 'easeOut' }}
        />
        {/* Shimmer effect on bar */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{total % xpPerLevel} XP</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{xpPerLevel} XP</span>
      </div>
    </div>
  );
}

// ─── Main GamificationRewards Component ───────────────────────────────────────
/**
 * @param {Object} result - { xp, streak, newAchievements } from triggerSessionComplete
 * @param {boolean} show  - whether to show (set true after API call resolves)
 */
export default function GamificationRewards({ result, show }) {
  const [achievements, setAchievements] = useState([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showXPBar, setShowXPBar] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!show || !result || dismissed) return;

    // Queue achievements
    if (result.newAchievements?.length > 0) {
      setAchievements(result.newAchievements.map((a, i) => ({ ...a, toastId: `${a.key}-${i}` })));
    }

    // Show XP bar after a short delay
    if (result.xp?.gained > 0) {
      setTimeout(() => setShowXPBar(true), 300);
    }

    // Show level-up modal with delay for dramatic effect
    if (result.xp?.levelUp) {
      setTimeout(() => setShowLevelUp(true), 1000);
    }
  }, [show, result]);

  const dismissAchievement = useCallback((toastId) => {
    setAchievements(prev => prev.filter(a => a.toastId !== toastId));
  }, []);

  if (!show || !result) return null;

  return (
    <>
      {/* Level Up Modal */}
      <AnimatePresence>
        {showLevelUp && (
          <LevelUpModal
            level={result.xp?.level}
            onClose={() => setShowLevelUp(false)}
          />
        )}
      </AnimatePresence>

      {/* Achievement Toasts - top right */}
      <div style={{
        position: 'fixed', top: 80, right: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
        zIndex: 9990, pointerEvents: achievements.length > 0 ? 'auto' : 'none',
      }}>
        <AnimatePresence>
          {achievements.map((a) => (
            <AchievementToast
              key={a.toastId}
              achievement={a}
              onDismiss={() => dismissAchievement(a.toastId)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* XP bar - bottom center */}
      <AnimatePresence>
        {showXPBar && result.xp && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9989, width: '90%', maxWidth: 420,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '20px', padding: '18px 22px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(99,91,255,0.25)',
              border: '1px solid rgba(99,91,255,0.3)',
            }}
          >
            <XPBar xpData={result.xp} />

            {result.streak && (
              <div style={{
                marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700,
              }}>
                🔥 Streak {result.streak.current} ngày liên tiếp!
              </div>
            )}

            <motion.button
              style={{
                display: 'block', width: '100%', marginTop: 14,
                background: 'rgba(99,91,255,0.2)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(99,91,255,0.3)', borderRadius: '10px',
                padding: '8px', fontSize: '0.8rem', cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={() => setShowXPBar(false)}
              whileHover={{ background: 'rgba(99,91,255,0.35)' }}
            >
              OK
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
