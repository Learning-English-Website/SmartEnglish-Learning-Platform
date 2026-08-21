import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, X, RotateCcw, Trophy, Clock,
  Volume2, VolumeX, Maximize2, Minimize2,
  ChevronDown, ArrowLeft, BookOpen, Brain, ClipboardCheck,
  Shuffle,
} from 'lucide-react';

const MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

/**
 * MatchMode - Quizlet-style Match game
 * @param {array} cards - Array of card objects { id, front, back }
 * @param {string} setTitle - Title of the flashcard set
 * @param {function} onClose - Callback when closed
 * @param {function} onComplete - Callback when game completed
 */

// Simple confetti component
function Confetti() {
  const colors = ['#2c5ef5', '#6b8cff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="match-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="match-confetti__piece"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{
            y: '110vh',
            opacity: [1, 1, 0],
            rotate: p.rotation + 720,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
      <style>{`
        .match-confetti {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 300;
          overflow: hidden;
        }
        .match-confetti__piece {
          position: absolute;
          top: -20px;
        }
      `}</style>
    </div>
  );
}

// ─── Match Header ────────────────────────────────────────────────────────────────
function MatchHeader({ mode, currentCard, totalCards, onClose, onModeChange, soundEnabled, onSoundToggle, onFullscreen, isFullscreen, onShuffle }) {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [isFS, setIsFS] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    if (onFullscreen) onFullscreen();
  };

  const currentModeConfig = MODES.find((m) => m.id === mode) || MODES[0];
  const CurrentIcon = currentModeConfig.icon;
  const progressPercent = totalCards > 0 ? (currentCard / totalCards) * 100 : 0;

  return (
    <header className="ql2-header">
      <div className="ql2-header__left">
        <button className="ql2-header__back" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>

        <div className="study-header__mode-selector" style={{ position: 'relative', marginLeft: '12px' }}>
          <button
            className="study-header__mode-btn"
            onClick={() => setModeDropdownOpen((v) => !v)}
            aria-label="Chuyển chế độ học"
          >
            <CurrentIcon size={18} />
            <span className="study-header__mode-label">{currentModeConfig.label}</span>
            <ChevronDown size={14} className={`study-header__chevron ${modeDropdownOpen ? 'open' : ''}`} />
          </button>

          <AnimatePresence>
            {modeDropdownOpen && (
              <motion.div
                className="study-header__mode-menu"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
              >
                {MODES.map(({ id: mId, label, icon: Icon }) => (
                  <button
                    key={mId}
                    className={`study-header__mode-item ${mId === mode ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeChange?.(mId);
                      setModeDropdownOpen(false);
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="ql2-header__center">
        <div className="ql2-progress-bar" style={{ flex: 1 }}>
          <div className="ql2-progress-bar__track">
            <div className="ql2-progress-bar__batch current" style={{ '--puck-pos': 0 }}>
              <div className="ql2-progress-bar__batch-bg" />
              <div
                className="ql2-progress-bar__batch-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <span className="ql2-progress-label">{currentCard} / {totalCards}</span>
      </div>

      <div className="ql2-header__right">
        {onShuffle && (
          <button className="ql2-header__btn" onClick={onShuffle} title="Chơi lại">
            <Shuffle size={18} />
          </button>
        )}
        <button
          className={`ql2-header__btn ${soundEnabled ? 'active' : ''}`}
          onClick={onSoundToggle}
          title="Âm thanh"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          className="ql2-header__btn"
          onClick={handleFullscreenClick}
          title="Toàn màn hình"
        >
          {isFS ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {modeDropdownOpen && (
        <div className="study-header__backdrop" onClick={() => setModeDropdownOpen(false)} />
      )}
    </header>
  );
}

// ─── Match Card ────────────────────────────────────────────────────────────────
function MatchCard({ card, isFlipped, isMatched, isSelected, onClick, side }) {
  return (
    <motion.div
      className={`match-card ${isFlipped || isMatched ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      layout
      whileHover={!isMatched ? { scale: 1.03 } : {}}
      whileTap={!isMatched ? { scale: 0.97 } : {}}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="match-card__inner"
        initial={false}
        animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back (face down) */}
        <div className="match-card__face match-card__face--back">
          <Box size={28} />
          <span className="match-card__hint">?</span>
        </div>

        {/* Front (content) */}
        <div
          className="match-card__face match-card__face--front"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span className="match-card__side">{side === 'term' ? 'T' : 'Đ'}</span>
          <span className="match-card__text">{card.text}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MatchMode({ cards = [], setTitle = '', onClose, onComplete, onModeChange }) {
  const [termCards, setTermCards] = useState([]);
  const [defCards, setDefCards] = useState([]);
  const [flipped, setFlipped] = useState({}); // { [cardId]: true }
  const [selected, setSelected] = useState(null); // { id, text, matchId }
  const [matched, setMatched] = useState({}); // { [cardId]: true }
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef(null);
  const isProcessing = useRef(false);

  // Initialize cards
  useEffect(() => {
    const terms = cards.map((c, i) => ({ id: `term-${c.id}`, text: c.front, matchId: c.id, side: 'term' }));
    const defs = cards.map((c, i) => ({ id: `def-${c.id}`, text: c.back, matchId: c.id, side: 'def' }));
    setTermCards(terms.sort(() => Math.random() - 0.5));
    setDefCards(defs.sort(() => Math.random() - 0.5));
  }, [cards]);

  // Timer
  useEffect(() => {
    if (gameOver) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameOver, startTime]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const allCards = [...termCards, ...defCards];
  const totalPairs = cards.length;
  const matchedPairs = Object.keys(matched).length / 2;

  const playSound = (type) => {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);

    if (type === 'match') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    } else if (type === 'mismatch') {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
    }
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const handleCardClick = useCallback((card) => {
    if (isProcessing.current) return;
    if (matched[card.id]) return;
    if (flipped[card.id]) return;

    // Flip the card
    setFlipped((prev) => ({ ...prev, [card.id]: true }));

    if (!selected) {
      setSelected(card);
      return;
    }

    // Second selection
    setMoves((v) => v + 1);
    isProcessing.current = true;

    if (selected.matchId === card.matchId && selected.id !== card.id) {
      // Match!
      playSound('match');
      setTimeout(() => {
        setMatched((prev) => ({ ...prev, [selected.id]: true, [card.id]: true }));
        setFlipped((prev) => ({ ...prev, [selected.id]: false, [card.id]: false }));
        setSelected(null);
        isProcessing.current = false;

        // Check if game over
        if (Object.keys(matched).length + 2 >= totalPairs * 2) {
          setTimeout(() => {
            setGameOver(true);
            onComplete?.({ moves, time: elapsed, pairs: totalPairs });
          }, 500);
        }
      }, 600);
    } else {
      // Mismatch
      playSound('mismatch');
      setTimeout(() => {
        setFlipped((prev) => ({ ...prev, [selected.id]: false, [card.id]: false }));
        setSelected(null);
        isProcessing.current = false;
      }, 800);
    }
  }, [selected, flipped, matched, totalPairs, moves, elapsed, soundEnabled, onComplete]);

  const handleRestart = () => {
    setFlipped({});
    setSelected(null);
    setMatched({});
    setMoves(0);
    setGameOver(false);
    setTermCards([...termCards].sort(() => Math.random() - 0.5));
    setDefCards([...defCards].sort(() => Math.random() - 0.5));
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Game over screen
  if (gameOver) {
    return (
      <div className="study-mode-wrap">
        <MatchHeader
          mode="match"
          currentCard={totalPairs}
          totalCards={totalPairs}
          onClose={onClose}
          onModeChange={onModeChange}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreen={handleFullscreen}
        />
        <Confetti />
        <div className="match-complete">
          <motion.div
            className="match-complete__card"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="match-complete__trophy">
              <Trophy size={40} color="#f59e0b" />
            </div>
            <h2 className="match-complete__title">Xuất sắc!</h2>
            <p className="match-complete__subtitle">Bạn đã hoàn thành trò chơi!</p>

            <div className="match-complete__stats">
              <div className="match-complete__stat">
                <Clock size={20} color="#2c5ef5" />
                <div>
                  <span className="match-complete__stat-value">{formatTime(elapsed)}</span>
                  <span className="match-complete__stat-label">Thời gian</span>
                </div>
              </div>
              <div className="match-complete__stat">
                <Box size={20} color="#10b981" />
                <div>
                  <span className="match-complete__stat-value">{moves}</span>
                  <span className="match-complete__stat-label">Số lần lật</span>
                </div>
              </div>
            </div>

            <div className="match-complete__actions">
              <button className="btn-glassline-primary" onClick={handleRestart}>
                <RotateCcw size={16} />
                Chơi lại
              </button>
              <button className="match-complete__btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </motion.div>
        </div>

        <style>{`
          .match-complete {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f6f7fb;
          }
          [data-theme='dark'] .match-complete { background: #0b0e12; }
          .match-complete__card {
            background: #fff;
            border-radius: 28px;
            padding: 48px 40px;
            text-align: center;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          [data-theme='dark'] .match-complete__card {
            background: #151922;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          .match-complete__trophy {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(245,158,11,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }
          .match-complete__title {
            font-size: 2rem;
            font-weight: 700;
            color: #1a1a2e;
            margin: 0 0 8px;
          }
          [data-theme='dark'] .match-complete__title { color: #e8eaed; }
          .match-complete__subtitle {
            font-size: 0.95rem;
            color: #8a8fa8;
            margin: 0 0 28px;
          }
          .match-complete__stats {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin-bottom: 32px;
          }
          .match-complete__stat {
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
          }
          .match-complete__stat-value {
            display: block;
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a1a2e;
          }
          [data-theme='dark'] .match-complete__stat-value { color: #e8eaed; }
          .match-complete__stat-label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: #8a8fa8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .match-complete__actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .match-complete__actions .btn-glassline-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .match-complete__btn-secondary {
            padding: 12px 20px;
            border-radius: 10px;
            border: 1.5px solid rgba(0,0,0,0.12);
            background: transparent;
            color: #4a5568;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }
          [data-theme='dark'] .match-complete__btn-secondary {
            border-color: rgba(255,255,255,0.12);
            color: #868e96;
          }
          .match-complete__btn-secondary:hover { background: #f0f1f6; }
        `}</style>
      </div>
    );
  }

  const progressPercent = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  return (
    <div className="study-mode-wrap">
      <MatchHeader
        mode="match"
        currentCard={matchedPairs}
        totalCards={totalPairs}
        onClose={onClose}
        onModeChange={onModeChange}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((v) => !v)}
        isFullscreen={isFullscreen}
        onFullscreen={handleFullscreen}
        onShuffle={handleRestart}
      />

      <div className="match-mode">
        {/* Stats bar */}
        <div className="match-mode__stats-bar">
          <div className="match-mode__stat">
            <Clock size={16} />
            <span>{formatTime(elapsed)}</span>
          </div>
          <div className="match-mode__pairs-progress">
            <span>{matchedPairs}/{totalPairs} cặp</span>
          </div>
          <div className="match-mode__stat">
            <Box size={16} />
            <span>{moves} lần</span>
          </div>
        </div>

        {/* Card grid */}
        <div className="match-mode__grid">
          <div className="match-mode__column">
            <div className="match-mode__column-header">Thuật ngữ</div>
            <div className="match-mode__cards">
              <AnimatePresence>
                {termCards.map((card) => (
                  <MatchCard
                    key={card.id}
                    card={card}
                    side="term"
                    isFlipped={!!flipped[card.id]}
                    isMatched={!!matched[card.id]}
                    isSelected={selected?.id === card.id}
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="match-mode__column">
            <div className="match-mode__column-header">Định nghĩa</div>
            <div className="match-mode__cards">
              <AnimatePresence>
                {defCards.map((card) => (
                  <MatchCard
                    key={card.id}
                    card={card}
                    side="def"
                    isFlipped={!!flipped[card.id]}
                    isMatched={!!matched[card.id]}
                    isSelected={selected?.id === card.id}
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Restart button */}
        <div className="match-mode__footer">
          <button className="match-mode__restart-btn" onClick={handleRestart}>
            <RotateCcw size={16} />
            Bắt đầu lại
          </button>
        </div>
      </div>

      <style>{`
        .study-mode-wrap {
          min-height: 100vh;
          background: #f6f7fb;
          display: flex;
          flex-direction: column;
        }
        [data-theme='dark'] .study-mode-wrap { background: #0b0e12; }

        /* Stats bar */
        .match-mode__stats-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(255,255,255,0.8);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        [data-theme='dark'] .match-mode__stats-bar {
          background: rgba(21,25,34,0.8);
          border-bottom-color: rgba(255,255,255,0.06);
        }

        .match-mode__stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          font-variant-numeric: tabular-nums;
        }
        [data-theme='dark'] .match-mode__stat { color: #868e96; }

        .match-mode__pairs-progress {
          font-size: 0.8rem;
          font-weight: 700;
          color: #2c5ef5;
          background: rgba(44,94,245,0.08);
          padding: 4px 14px;
          border-radius: 20px;
        }

        /* Grid layout */
        .match-mode {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px 24px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }

        .match-mode__grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .match-mode__column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .match-mode__column-header {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a8fa8;
          text-align: center;
          padding: 0 0 4px;
        }

        .match-mode__cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Match card */
        .match-card {
          position: relative;
          height: 72px;
          cursor: pointer;
          border-radius: 16px;
          perspective: 800px;
        }

        .match-card.matched {
          cursor: default;
          opacity: 0.5;
        }

        .match-card__inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }

        .match-card__face {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 16px;
          transition: box-shadow 0.2s ease;
        }

        .match-card__face--back {
          background: linear-gradient(135deg, #2c5ef5, #6b8cff);
          color: #fff;
          box-shadow: 0 2px 12px rgba(44,94,245,0.2);
        }

        .match-card__face--back .match-card__hint {
          font-size: 1.5rem;
          font-weight: 800;
          color: rgba(255,255,255,0.7);
        }

        .match-card__face--front {
          background: #fff;
          color: #1a1a2e;
          border: 2px solid rgba(0,0,0,0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        [data-theme='dark'] .match-card__face--front {
          background: #1e2332;
          color: #e8eaed;
          border-color: rgba(255,255,255,0.08);
        }

        .match-card.selected .match-card__face--front,
        .match-card:not(.matched):hover .match-card__face--back {
          box-shadow: 0 4px 20px rgba(44,94,245,0.2);
        }

        .match-card.selected .match-card__face--front {
          border-color: #2c5ef5;
          background: #e8edff;
        }

        [data-theme='dark'] .match-card.selected .match-card__face--front {
          background: rgba(44,94,245,0.12);
        }

        .match-card.matched .match-card__face--front {
          background: rgba(16,185,129,0.08);
          border-color: #10b981;
        }

        .match-card__side {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: rgba(44,94,245,0.1);
          color: #2c5ef5;
          font-size: 0.75rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .match-card.matched .match-card__side {
          background: rgba(16,185,129,0.15);
          color: #10b981;
        }

        .match-card__text {
          font-size: 0.9rem;
          font-weight: 600;
          white-space: normal;
          word-break: break-word;
          line-height: 1.25;
          flex: 1;
          text-align: center;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Footer */
        .match-mode__footer {
          display: flex;
          justify-content: center;
          padding-top: 20px;
        }

        .match-mode__restart-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: #fff;
          color: #4a5568;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          touch-action: manipulation;
        }
        [data-theme='dark'] .match-mode__restart-btn {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .match-mode__restart-btn:hover {
          background: #f0f1f6;
        }
        [data-theme='dark'] .match-mode__restart-btn:hover {
          background: #252c3f;
        }

        /* Tablet */
        @media (max-width: 768px) {
          .match-mode__grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .match-card {
            min-height: 64px;
            height: auto;
            padding: 8px;
          }
          .match-card__text {
            font-size: 0.8rem;
          }
          .match-mode {
            padding: 16px;
          }
        }

        /* Mobile */
        @media (max-width: 580px) {
          .match-mode__grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .match-mode__cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .match-card {
            width: 100%;
            min-height: 64px;
            height: auto;
            flex: none;
            padding: 8px 6px;
          }
          .match-card__face {
            padding: 8px 6px;
            gap: 6px;
          }
          .match-card__text {
            font-size: 0.78rem;
            line-height: 1.2;
            -webkit-line-clamp: 4;
          }
          .match-mode {
            padding: 10px 8px;
          }
        }
      `}</style>
    </div>
  );
}
