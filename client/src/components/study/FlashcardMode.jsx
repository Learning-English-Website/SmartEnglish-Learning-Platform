import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2 } from 'lucide-react';
import StudyHeader from './StudyHeader';

/**
 * FlashcardMode - Quizlet-style flashcard study
 * @param {array} cards - Array of card objects { id, front, back, audioUrl? }
 * @param {string} setTitle - Title of the flashcard set
 * @param {function} onClose - Callback when closed
 * @param {function} onComplete - Callback when session completes
 */
export default function FlashcardMode({ cards = [], setTitle = '', onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shuffledCards, setShuffledCards] = useState(cards);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);

  const displayCards = isShuffled ? shuffledCards : cards;
  const totalCards = displayCards.length;
  const currentCard = displayCards[currentIndex];

  // Shuffle function
  const shuffle = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
    setShuffleSeed((v) => v + 1);
  }, [cards]);

  // Reset shuffle
  const resetShuffle = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, totalCards]);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= totalCards) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, totalCards]);

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setIsFlipped(false);
    setCurrentIndex((v) => v - 1);
  };

  const handleNext = () => {
    if (currentIndex >= totalCards - 1) {
      onComplete?.();
      return;
    }
    setIsFlipped(false);
    setCurrentIndex((v) => v + 1);
  };

  const handleFlip = () => setIsFlipped((v) => !v);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleModeChange = (mode) => {
    // Mode change is handled by parent
  };

  // Play audio
  const speakCard = (text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (soundEnabled && currentCard?.front) {
      speakCard(currentCard.front);
    }
  }, [currentIndex, soundEnabled]);

  if (!currentCard) {
    return (
      <div className="study-mode-wrap">
        <StudyHeader
          mode="flashcards"
          setTitle={setTitle}
          currentCard={0}
          totalCards={0}
          progress={false}
          onModeChange={handleModeChange}
          onClose={onClose}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreen}
          onShuffle={shuffle}
        />
        <div className="study-mode-empty">
          <p>Không có thẻ để hiển thị.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="study-mode-wrap">
      <StudyHeader
        mode="flashcards"
        setTitle={setTitle}
        currentCard={currentIndex + 1}
        totalCards={totalCards}
        progress
        onModeChange={handleModeChange}
        onClose={onClose}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((v) => !v)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreen}
        onShuffle={isShuffled ? resetShuffle : shuffle}
      />

      <div className="flashcard-mode">
        <div className="flashcard-mode__container">
          {/* Card counter */}
          <div className="flashcard-mode__counter">
            <span className="flashcard-mode__counter-num">{currentIndex + 1}</span>
            <span className="flashcard-mode__counter-sep">/</span>
            <span className="flashcard-mode__counter-total">{totalCards}</span>
          </div>

          {/* Flashcard */}
          <div className="flashcard-mode__card-area">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${shuffleSeed}`}
                className="flashcard"
                onClick={handleFlip}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <motion.div
                  className="flashcard__inner"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front */}
                  <div className="flashcard__face flashcard__face--front">
                    <span className="flashcard__side-label">Thuật ngữ</span>
                    <div className="flashcard__content">
                      <p className="flashcard__text">{currentCard.front}</p>
                    </div>
                    <button
                      className="flashcard__audio-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakCard(currentCard.front);
                      }}
                      aria-label="Phát âm"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>

                  {/* Back */}
                  <div
                    className="flashcard__face flashcard__face--back"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <span className="flashcard__side-label">Định nghĩa</span>
                    <div className="flashcard__content">
                      <p className="flashcard__text">{currentCard.back}</p>
                    </div>
                    <button
                      className="flashcard__audio-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakCard(currentCard.back);
                      }}
                      aria-label="Phát âm"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Hint text */}
          <p className="flashcard-mode__hint">Nhấn hoặc nhấn phím cách để lật thẻ</p>

          {/* Navigation controls */}
          <div className="flashcard-mode__controls">
            <button
              className="flashcard-mode__control-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Thẻ trước"
            >
              <ChevronLeft size={22} />
              <span>Trước</span>
            </button>

            <button
              className={`flashcard-mode__control-btn flashcard-mode__control-btn--play ${isPlaying ? 'playing' : ''}`}
              onClick={() => setIsPlaying((v) => !v)}
              aria-label={isPlaying ? 'Tạm dừng' : 'Tự động phát'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              <span>{isPlaying ? 'Dừng' : 'Phát'}</span>
            </button>

            <button
              className="flashcard-mode__control-btn"
              onClick={handleNext}
              aria-label="Thẻ sau"
            >
              <span>Tiếp</span>
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Page dots */}
          <div className="flashcard-mode__dots">
            {displayCards.slice(0, Math.min(totalCards, 12)).map((_, i) => (
              <button
                key={i}
                className={`flashcard-mode__dot ${i === currentIndex ? 'active' : ''} ${i > currentIndex ? 'future' : 'past'}`}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(i);
                }}
                aria-label={`Đến thẻ ${i + 1}`}
              />
            ))}
            {totalCards > 12 && <span className="flashcard-mode__dot-more">+{totalCards - 12}</span>}
          </div>
        </div>
      </div>

      <style>{`
        .study-mode-wrap {
          min-height: 100vh;
          background: #f6f7fb;
          display: flex;
          flex-direction: column;
        }

        [data-theme='dark'] .study-mode-wrap {
          background: #0b0e12;
        }

        .study-mode-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8a8fa8;
          font-size: 1rem;
        }

        /* Flashcard mode */
        .flashcard-mode {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 32px;
        }

        .flashcard-mode__container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
          max-width: 680px;
        }

        .flashcard-mode__counter {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #8a8fa8;
          font-variant-numeric: tabular-nums;
        }

        .flashcard-mode__counter-num {
          font-size: 1.25rem;
          color: #2c5ef5;
        }

        .flashcard-mode__card-area {
          width: 100%;
          perspective: 1200px;
        }

        /* Flashcard */
        .flashcard {
          width: 100%;
          aspect-ratio: 4 / 3;
          cursor: pointer;
          max-height: 420px;
        }

        .flashcard__inner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .flashcard__face {
          position: absolute;
          inset: 0;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: box-shadow 0.2s ease;
          overflow: hidden;
        }

        [data-theme='dark'] .flashcard__face {
          background: #151922;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        .flashcard:hover .flashcard__face {
          box-shadow: 0 8px 40px rgba(44, 94, 245, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .flashcard__side-label {
          position: absolute;
          top: 16px;
          left: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a8fa8;
          background: #f0f1f6;
          padding: 3px 10px;
          border-radius: 20px;
        }

        [data-theme='dark'] .flashcard__side-label {
          background: #1e2332;
          color: #868e96;
        }

        .flashcard__content {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
          width: 100%;
          padding: 12px 0;
        }

        .flashcard__text {
          font-size: clamp(1.25rem, 3vw, 2rem);
          font-weight: 600;
          color: #1a1a2e;
          line-height: 1.3;
          margin: 0;
          word-break: break-word;
        }

        [data-theme='dark'] .flashcard__text {
          color: #e8eaed;
        }

        .flashcard__audio-btn {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.15s ease;
        }

        [data-theme='dark'] .flashcard__audio-btn {
          background: #1e2332;
          border-color: rgba(255, 255, 255, 0.1);
          color: #868e96;
        }

        .flashcard__audio-btn:hover {
          background: #2c5ef5;
          border-color: #2c5ef5;
          color: #fff;
        }

        .flashcard-mode__hint {
          font-size: 0.8rem;
          color: #b0b4c4;
          margin: 0;
        }

        /* Controls */
        .flashcard-mode__controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .flashcard-mode__control-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #fff;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.15s ease;
        }

        [data-theme='dark'] .flashcard-mode__control-btn {
          background: #1e2332;
          border-color: rgba(255, 255, 255, 0.1);
          color: #868e96;
        }

        .flashcard-mode__control-btn:hover:not(:disabled) {
          background: #f0f1f6;
          border-color: rgba(0, 0, 0, 0.2);
        }

        [data-theme='dark'] .flashcard-mode__control-btn:hover:not(:disabled) {
          background: #252c3f;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .flashcard-mode__control-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .flashcard-mode__control-btn--play {
          padding: 10px 24px;
          background: #2c5ef5;
          border-color: #2c5ef5;
          color: #fff;
        }

        .flashcard-mode__control-btn--play:hover:not(:disabled) {
          background: #1d4fd8;
          border-color: #1d4fd8;
        }

        .flashcard-mode__control-btn--play.playing {
          background: #ef4444;
          border-color: #ef4444;
        }

        /* Dots */
        .flashcard-mode__dots {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 480px;
        }

        .flashcard-mode__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }

        .flashcard-mode__dot.past {
          background: #c7d0f0;
        }

        .flashcard-mode__dot.future {
          background: #e8eaf0;
        }

        [data-theme='dark'] .flashcard-mode__dot.past {
          background: #2c5ef5;
        }

        [data-theme='dark'] .flashcard-mode__dot.future {
          background: rgba(255, 255, 255, 0.1);
        }

        .flashcard-mode__dot.active {
          width: 24px;
          border-radius: 4px;
          background: #2c5ef5;
        }

        .flashcard-mode__dot-more {
          font-size: 0.7rem;
          color: #b0b4c4;
          margin-left: 2px;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .flashcard-mode {
            padding: 16px 12px 24px;
          }

          .flashcard {
            aspect-ratio: 3 / 4;
            max-height: 360px;
          }

          .flashcard__face {
            padding: 24px 20px;
            border-radius: 20px;
          }

          .flashcard__text {
            font-size: 1.25rem;
          }

          .flashcard-mode__controls {
            gap: 8px;
          }

          .flashcard-mode__control-btn {
            padding: 9px 14px;
            font-size: 0.8rem;
          }

          .flashcard-mode__control-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
