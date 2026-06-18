import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
  BookOpen, Brain, ClipboardCheck, Box, Shuffle
} from 'lucide-react';
import { gamificationService } from '../../../api/gamificationService';
import { useGamification } from '../../../context/GamificationContext';
import './MatchMode.css';

const MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

/**
 * MatchMode — Chế độ Khớp thẻ (Quizlet Match)
 * Ghép từ với định nghĩa bằng cách click chọn cặp.
 * Tính thời gian và submit lên leaderboard khi hoàn thành.
 *
 * @param {Array}  cards     - [{ _id, front, back }]
 * @param {string} setId     - ID của học phần
 * @param {string} setTitle  - Tên học phần
 * @param {Function} onClose - Callback khi thoát
 */
export default function MatchMode({ cards, setId, setTitle, onClose, onModeChange }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const currentModeConfig = MODES.find((m) => m.id === 'match') || MODES[3];
  const CurrentIcon = currentModeConfig.icon;

  // Lấy tối đa 6 cặp (12 ô) — chuẩn Quizlet
  const MAX_PAIRS = Math.min(6, cards.length);
  const [selectedCards, setSelectedCards] = useState(() => shuffle(cards).slice(0, MAX_PAIRS));

  const [tiles, setTiles] = useState([]);             // tất cả ô (term + def xáo trộn)
  const [selected, setSelected] = useState([]);       // ô đang chọn (max 2)
  const [matched, setMatched] = useState(new Set()); // id các ô đã khớp
  const [wrong, setWrong] = useState(new Set());     // id các ô sai (flash đỏ)
  const [matchCount, setMatchCount] = useState(0);   // số cặp đã khớp

  // Timer
  const [timeMs, setTimeMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef(null);

  // Game states
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'finished'
  const [leaderboardResult, setLeaderboardResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { triggerRewards } = useGamification();

  // ── Build tiles ────────────────────────────────────────────────────────────
  useEffect(() => {
    const termTiles = selectedCards.map((c) => ({
      id: `term-${c._id}`,
      pairId: c._id,
      text: c.front,
      type: 'term',
    }));
    const defTiles = selectedCards.map((c) => ({
      id: `def-${c._id}`,
      pairId: c._id,
      text: c.back,
      type: 'def',
    }));
    setTiles(shuffle([...termTiles, ...defTiles]));
    setMatched(new Set());
    setSelected([]);
    setWrong(new Set());
    setMatchCount(0);
    setTimeMs(0);
    setTimerRunning(true);
    setGameState('playing');
  }, [selectedCards]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeMs((t) => t + 100);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // ── Handle tile click ──────────────────────────────────────────────────────
  const handleTileClick = useCallback((tile) => {
    if (matched.has(tile.id) || wrong.has(tile.id)) return;
    if (selected.length === 2) return; // đang xử lý cặp sai
    if (selected.find((s) => s.id === tile.id)) return; // click lại ô đã chọn

    const newSelected = [...selected, tile];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected;

      if (a.pairId === b.pairId && a.type !== b.type) {
        // ✅ KHỚP!
        const newMatched = new Set([...matched, a.id, b.id]);
        setMatched(newMatched);
        setSelected([]);
        setMatchCount((c) => c + 1);

        // Âm thanh / hiệu ứng
        if (soundEnabled) {
          playMatchSound();
        }

        // Kiểm tra hoàn thành
        if (newMatched.size === tiles.length) {
          setTimerRunning(false);
          setGameState('finished');
          submitScore(timeMs);
        }
      } else {
        // ❌ SAI
        setWrong(new Set([a.id, b.id]));
        setTimeout(() => {
          setWrong(new Set());
          setSelected([]);
        }, 800);
      }
    }
  }, [selected, matched, wrong, tiles.length, timeMs]);

  // ── Submit score ───────────────────────────────────────────────────────────
  const submitScore = useCallback(async (finalTimeMs) => {
    setSubmitting(true);
    try {
      const res = await gamificationService.submitMatchScore(setId, finalTimeMs);
      const data = res?.data?.data ?? res?.data ?? res;
      setLeaderboardResult(data);
      if (data.gamification) {
        triggerRewards(data.gamification);
      }
      if (data.isPersonalBest) {
        toast.success(`🏆 Kỷ lục mới! ${formatTime(finalTimeMs)}`, { duration: 3000 });
      } else {
        toast.success(`Hoàn thành! ${formatTime(finalTimeMs)}`, { duration: 2000 });
      }
    } catch {
      // Không block game nếu submit lỗi
    } finally {
      setSubmitting(false);
    }
  }, [setId]);

  // ── Restart with same/new cards ────────────────────────────────────────────
  const handleRestart = () => {
    setSelectedCards(shuffle(cards).slice(0, MAX_PAIRS));
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (ms) => {
    const totalSec = ms / 1000;
    if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(0).padStart(2, '0');
    return `${m}:${s}`;
  };

  const MEDALS = ['🥇', '🥈', '🥉'];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="ql2-page">
        {/* Floating decorative elements */}
        <div className="ql2-page__decoration ql2-page__decoration--1" />
        <div className="ql2-page__decoration ql2-page__decoration--2" />

        <header className="ql2-header">
          <div className="ql2-header__left">
            <button className="ql2-header__back" onClick={onClose} title="Quay lại">
              <ArrowLeft size={20} />
            </button>

            {/* Mode selector dropdown */}
            <div className="study-header__mode-selector" style={{ position: 'relative', marginLeft: '12px' }}>
              <button
                className="study-header__mode-btn"
                onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
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
                        className={`study-header__mode-item ${mId === 'match' ? 'active' : ''}`}
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

            <span style={{ color: 'var(--border-subtle)', marginLeft: '12px', fontSize: '1.2rem', fontWeight: 300 }}>|</span>
            <span className="ql2-header__title">{setTitle || 'Khớp thẻ'}</span>
          </div>

          <div className="ql2-header__center">
            {/* Center progress or timer info */}
          </div>

          <div className="ql2-header__right">
            {/* Reset/Shuffle button */}
            <button className="ql2-header__btn" onClick={handleRestart} title="Chơi lại">
              <Shuffle size={18} />
            </button>

            {/* Sound Toggle */}
            <button
              className={`ql2-header__btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled((v) => !v)}
              title="Âm thanh"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              className="ql2-header__btn"
              onClick={handleFullscreen}
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>

          {modeDropdownOpen && (
            <div className="study-header__backdrop" onClick={() => setModeDropdownOpen(false)} />
          )}
        </header>

        <div className="match-header-row">
          <div className="match-timer" aria-live="polite">
            ⏱ {formatTime(timeMs)}
          </div>
          <div className="match-progress-track">
            <div
              className="match-progress-fill"
              style={{ width: `${(matchCount / MAX_PAIRS) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Game Board ──────────────────────────────────────────────────── */}
        {gameState === 'playing' && (
          <div className="match-board" aria-label="Bảng ghép thẻ">
            {tiles.map((tile) => {
              const isMatched  = matched.has(tile.id);
              const isSelected = selected.find((s) => s.id === tile.id);
              const isWrong    = wrong.has(tile.id);

              return (
                <motion.button
                  key={tile.id}
                  className={[
                    'match-tile',
                    isMatched  ? 'match-tile--matched'  : '',
                    isSelected ? 'match-tile--selected' : '',
                    isWrong    ? 'match-tile--wrong'    : '',
                    tile.type === 'term' ? 'match-tile--term' : 'match-tile--def',
                  ].join(' ')}
                  onClick={() => handleTileClick(tile)}
                  disabled={isMatched}
                  layout
                  whileHover={!isMatched ? { scale: 1.03 } : {}}
                  whileTap={!isMatched ? { scale: 0.97 } : {}}
                  animate={
                    isWrong
                      ? { x: [0, -8, 8, -8, 0] }
                      : isMatched
                      ? { scale: [1, 1.08, 1], opacity: [1, 1, 0.6] }
                      : {}
                  }
                  transition={{ duration: 0.4 }}
                  aria-label={`${tile.type === 'term' ? 'Thuật ngữ' : 'Định nghĩa'}: ${tile.text}`}
                  aria-pressed={!!isSelected}
                >
                  <span className="match-tile__text">{tile.text}</span>
                  {isMatched && (
                    <span className="match-tile__check" aria-hidden>✓</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ── Finished Screen ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {gameState === 'finished' && (
            <motion.div
              className="match-result"
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <div className="match-result__celebrate" aria-hidden>🎉</div>

              <h2 className="match-result__title">Hoàn thành!</h2>
              <div className="match-result__time">
                ⏱ {formatTime(timeMs)}
              </div>

              {leaderboardResult?.isPersonalBest && (
                <div className="match-result__pb-badge">
                  🏆 Kỷ lục cá nhân mới!
                </div>
              )}

              {leaderboardResult?.topScores && leaderboardResult.topScores.length > 0 && (
                <div className="match-result__leaderboard">
                  <div className="match-result__lb-title">🏅 Bảng xếp hạng</div>
                  {leaderboardResult.topScores.slice(0, 5).map((entry, idx) => (
                    <div
                      key={entry.username + idx}
                      className={`match-result__lb-row ${entry.isCurrentUser ? 'match-result__lb-row--you' : ''}`}
                    >
                      <span className="match-result__lb-rank">
                        {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
                      </span>
                      <span className="match-result__lb-name">
                        {entry.username}
                        {entry.isCurrentUser && <span className="match-result__lb-you"> (Bạn)</span>}
                      </span>
                      <span className="match-result__lb-time">{formatTime(entry.timeMs)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="match-result__actions">
                <motion.button
                  className="match-result__btn match-result__btn--primary"
                  onClick={handleRestart}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  🔄 Chơi lại
                </motion.button>
                <motion.button
                  className="match-result__btn match-result__btn--secondary"
                  onClick={onClose}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ← Quay lại học phần
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint text */}
        {gameState === 'playing' && (
          <p className="match-hint">
            Click để chọn một thẻ, sau đó click thẻ khớp để ghép cặp.
            Còn <strong>{MAX_PAIRS - matchCount}</strong> cặp nữa!
          </p>
        )}
      </div>
    </>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playMatchSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Safari/unsupported — bỏ qua
  }
}
