import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, ClipboardCheck, Box,
  Volume2, Settings, X, ChevronDown,
  Maximize2, Minimize2, Shuffle, RotateCcw
} from 'lucide-react';

/**
 * StudyHeader - Top bar for all study modes (Quizlet-style)
 * @param {string} mode - Current mode: 'flashcards' | 'learn' | 'test' | 'match'
 * @param {string} setTitle - Title of the flashcard set
 * @param {number} currentCard - Current card index (1-based)
 * @param {number} totalCards - Total number of cards
 * @param {boolean} progress - Show progress bar
 * @param {function} onModeChange - Callback when mode dropdown changes
 * @param {function} onClose - Callback when close button clicked
 * @param {function} onSoundToggle - Callback for sound toggle
 * @param {function} onFullscreenToggle - Callback for fullscreen toggle
 * @param {function} onShuffle - Callback for shuffle
 * @param {boolean} soundEnabled - Is sound enabled
 * @param {boolean} isFullscreen - Is fullscreen active
 */

const MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

export default function StudyHeader({
  mode,
  setTitle,
  currentCard,
  totalCards,
  progress,
  onModeChange,
  onClose,
  onSoundToggle,
  onFullscreenToggle,
  onShuffle,
  soundEnabled = true,
  isFullscreen = false,
}) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [isFS, setIsFS] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFS(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    if (onFullscreenToggle) onFullscreenToggle();
  };

  const currentModeConfig = MODES.find((m) => m.id === mode) || MODES[0];
  const CurrentIcon = currentModeConfig.icon;
  const progressPercent = totalCards > 0 ? (currentCard / totalCards) * 100 : 0;

  return (
    <div className="study-header">
      {/* Left section */}
      <div className="study-header__left">
        <div className="study-header__mode-selector">
          <button
            className="study-header__mode-btn"
            onClick={() => setModeMenuOpen((v) => !v)}
            aria-label="Chuyển chế độ học"
          >
            <CurrentIcon size={18} />
            <span className="study-header__mode-label">{currentModeConfig.label}</span>
            <ChevronDown size={14} className={`study-header__chevron ${modeMenuOpen ? 'open' : ''}`} />
          </button>

          <AnimatePresence>
            {modeMenuOpen && (
              <motion.div
                className="study-header__mode-menu"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
              >
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`study-header__mode-item ${id === mode ? 'active' : ''}`}
                    onClick={() => {
                      onModeChange?.(id);
                      setModeMenuOpen(false);
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

      {/* Center section */}
      <div className="study-header__center">
        {progress && (
          <div className="study-header__progress-wrap">
            <div className="study-header__progress-bar">
              <motion.div
                className="study-header__progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className="study-header__progress-label">
              {currentCard} / {totalCards}
            </span>
          </div>
        )}
        {setTitle && (
          <p className="study-header__title">{setTitle}</p>
        )}
      </div>

      {/* Right section */}
      <div className="study-header__right">
        {onShuffle && (
          <button
            className="study-header__icon-btn"
            onClick={onShuffle}
            aria-label="Xáo trộn"
            title="Xáo trộn"
          >
            <Shuffle size={18} />
          </button>
        )}

        <button
          className={`study-header__icon-btn ${soundEnabled ? 'active' : ''}`}
          onClick={onSoundToggle}
          aria-label="Bật/tắt âm thanh"
          title="Âm thanh"
        >
          <Volume2 size={18} />
        </button>

        <button
          className="study-header__icon-btn"
          onClick={handleFullscreenClick}
          aria-label="Toàn màn hình"
          title="Toàn màn hình"
        >
          {isFS ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <button
          className="study-header__icon-btn study-header__close-btn"
          onClick={onClose}
          aria-label="Đóng"
          title="Đóng"
        >
          <X size={18} />
        </button>
      </div>

      {/* Click outside to close menu */}
      {modeMenuOpen && (
        <div
          className="study-header__backdrop"
          onClick={() => setModeMenuOpen(false)}
        />
      )}

      <style>{`
        .study-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #fff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          gap: 16px;
          min-height: 60px;
        }

        [data-theme='dark'] .study-header {
          background: #151922;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        .study-header__left {
          display: flex;
          align-items: center;
          min-width: 160px;
        }

        .study-header__mode-selector {
          position: relative;
        }

        .study-header__mode-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #f6f7fb;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1a1a2e;
          transition: all 0.15s ease;
        }

        [data-theme='dark'] .study-header__mode-btn {
          background: #1e2332;
          border-color: rgba(255, 255, 255, 0.1);
          color: #e8eaed;
        }

        .study-header__mode-btn:hover {
          background: #eef0f7;
        }

        [data-theme='dark'] .study-header__mode-btn:hover {
          background: #252c3f;
        }

        .study-header__mode-label {
          font-size: 0.875rem;
        }

        .study-header__chevron {
          transition: transform 0.2s ease;
        }

        .study-header__chevron.open {
          transform: rotate(180deg);
        }

        .study-header__mode-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 200px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          padding: 6px;
          z-index: 200;
        }

        [data-theme='dark'] .study-header__mode-menu {
          background: #1e2332;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .study-header__mode-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1a1a2e;
          text-align: left;
          transition: background 0.12s ease;
        }

        [data-theme='dark'] .study-header__mode-item {
          color: #e8eaed;
        }

        .study-header__mode-item:hover {
          background: #f0f1f6;
        }

        [data-theme='dark'] .study-header__mode-item:hover {
          background: #252c3f;
        }

        .study-header__mode-item.active {
          background: #e8edff;
          color: #2c5ef5;
        }

        [data-theme='dark'] .study-header__mode-item.active {
          background: rgba(44, 94, 245, 0.15);
          color: #6b8cff;
        }

        .study-header__center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .study-header__progress-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          max-width: 400px;
        }

        .study-header__progress-bar {
          flex: 1;
          height: 6px;
          background: #e8eaf0;
          border-radius: 3px;
          overflow: hidden;
        }

        [data-theme='dark'] .study-header__progress-bar {
          background: rgba(255, 255, 255, 0.1);
        }

        .study-header__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2c5ef5, #6b8cff);
          border-radius: 3px;
        }

        .study-header__progress-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #8a8fa8;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .study-header__title {
          font-size: 0.8rem;
          color: #8a8fa8;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 400px;
        }

        .study-header__right {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 160px;
          justify-content: flex-end;
        }

        .study-header__icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.15s ease;
        }

        [data-theme='dark'] .study-header__icon-btn {
          color: #868e96;
        }

        .study-header__icon-btn:hover {
          background: #f0f1f6;
          color: #1a1a2e;
        }

        [data-theme='dark'] .study-header__icon-btn:hover {
          background: #252c3f;
          color: #e8eaed;
        }

        .study-header__icon-btn.active {
          background: #e8edff;
          color: #2c5ef5;
        }

        [data-theme='dark'] .study-header__icon-btn.active {
          background: rgba(44, 94, 245, 0.15);
          color: #6b8cff;
        }

        .study-header__close-btn:hover {
          background: #fee2e2 !important;
          color: #ef4444 !important;
        }

        [data-theme='dark'] .study-header__close-btn:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: #f87171 !important;
        }

        .study-header__backdrop {
          position: fixed;
          inset: 0;
          z-index: 150;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .study-header {
            padding: 10px 16px;
            min-height: 54px;
          }

          .study-header__left {
            min-width: auto;
          }

          .study-header__mode-label {
            display: none;
          }

          .study-header__right {
            min-width: auto;
            gap: 0;
          }

          .study-header__progress-label {
            display: none;
          }

          .study-header__title {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
