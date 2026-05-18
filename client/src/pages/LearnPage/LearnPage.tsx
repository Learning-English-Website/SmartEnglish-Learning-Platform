import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, Volume2, VolumeX, Settings, Shuffle,
  CheckCircle, XCircle, ChevronRight, Brain, Loader2
} from 'lucide-react';
import { useSpacedRepetition, CardSchedule, getDefaultSchedule } from '../../hooks/useSpacedRepetition';
import { progressService } from '../../services/progressService';
import { CARD_BATCH_SIZE } from './studyTypes';

// Sound effect URLs (using free sound effects)
const TING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Quizlet-style progress bar with segments
 */
const QuizletProgressBar = ({
  totalCards,
  currentIndex,
  correctCards,
  wrongCards,
  batchSize = CARD_BATCH_SIZE
}: {
  totalCards: number;
  currentIndex: number;
  correctCards: Set<number>;
  wrongCards: Set<number>;
  batchSize?: number;
}) => {
  // Calculate segments (each segment = batchSize cards)
  const segments = useMemo(() => {
    const result = [];
    const numSegments = Math.ceil(totalCards / batchSize);
    for (let i = 0; i < numSegments; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalCards);
      result.push({ start, end, index: i });
    }
    return result;
  }, [totalCards, batchSize]);

  const currentSegmentIndex = Math.floor(currentIndex / batchSize);

  return (
    <div className="quizlet-progress">
      <div className="quizlet-progress__bar">
        {segments.map((segment, segmentIdx) => {
          const isCompleted = segment.end <= currentIndex;
          const isCurrent = segmentIdx === currentSegmentIndex;
          const isUpcoming = segmentIdx > currentSegmentIndex;

          return (
            <div
              key={segmentIdx}
              className={`quizlet-progress__segment ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
              style={{ flex: batchSize }}
            >
              {/* Individual cards in segment */}
              <div className="quizlet-progress__cards">
                {Array.from({ length: batchSize }).map((_, cardIdx) => {
                  const absoluteIndex = segment.start + cardIdx;
                  if (absoluteIndex >= totalCards) return <div key={cardIdx} className="quizlet-progress__card empty" />;

                  const isCardCorrect = correctCards.has(absoluteIndex);
                  const isCardWrong = wrongCards.has(absoluteIndex);
                  const isCardCurrent = absoluteIndex === currentIndex;
                  const isCardAnswered = isCardCorrect || isCardWrong;

                  return (
                    <div
                      key={cardIdx}
                      className={`quizlet-progress__card ${isCardCorrect ? 'correct' : ''} ${isCardWrong ? 'wrong' : ''} ${isCardCurrent ? 'current' : ''} ${isCardAnswered ? 'answered' : ''}`}
                    />
                  );
                })}
              </div>

              {/* Segment number */}
              <span className="quizlet-progress__segment-label">
                {segment.end}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress text */}
      <div className="quizlet-progress__text">
        <span className="quizlet-progress__count">
          {currentIndex} / {totalCards}
        </span>
      </div>
    </div>
  );
};

/**
 * Quizlet-style Learn Page with spaced repetition
 */
interface LearnPageProps {
  cards: Array<{ id: string; front: string; back: string }>;
  setTitle: string;
  setId: string; // Required for SM-2 persistence
  onClose: () => void;
  onComplete?: (results: {
    correct: number;
    wrong: number;
    total: number;
    accuracy: number;
  }) => void;
}

export default function LearnPage({
  cards,
  setTitle,
  setId,
  onClose,
  onComplete
}: LearnPageProps) {
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCards, setCorrectCards] = useState<Set<number>>(new Set());
  const [wrongCards, setWrongCards] = useState<Set<number>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [learnMode, setLearnMode] = useState<'multiple-choice' | 'type-answer'>('multiple-choice');
  const [sessionDone, setSessionDone] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, number>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load schedules from server on mount
  useEffect(() => {
    if (!setId) return;

    const loadSchedules = async () => {
      try {
        const response = await progressService.getCardSchedules(setId);
        const serverSchedules: CardSchedule[] = response.data || [];

        // Update local schedules with server data
        serverSchedules.forEach(schedule => {
          updateScheduleFromServer(schedule.cardId, schedule);
        });
        setSchedulesLoaded(true);
      } catch (err) {
        console.log('[LearnPage] No existing schedules, using defaults');
        setSchedulesLoaded(true);
      }
    };

    loadSchedules();
  }, [setId]);

  // Helper to update schedule from server
  const updateScheduleFromServer = (cardId: string, schedule: CardSchedule) => {
    setPendingUpdates(prev => {
      const next = new Map(prev);
      next.set(cardId, schedule as any);
      return next;
    });
  };

  // Spaced repetition hook
  const { updateSchedule, getSchedule, schedules } = useSpacedRepetition(
    cards.map(c => {
      const serverSchedule = pendingUpdates.get(c.id) as CardSchedule | undefined;
      return serverSchedule || getDefaultSchedule(c.id);
    })
  );

  // Get due cards (cards that are due for review)
  const dueCards = useMemo(() => {
    if (!schedulesLoaded) return cards;
    const now = new Date();
    return cards.filter(card => {
      const schedule = schedules.get(card.id);
      if (!schedule) return true; // New card, always due
      return new Date(schedule.nextReview) <= now;
    });
  }, [cards, schedules, schedulesLoaded]);

  // Learning order with SM-2 priority
  const learningOrder = useMemo(() => {
    const order: Array<{ cardId: string; mode: 'multiple-choice' | 'type-answer' }> = [];

    // First: cards with repetitions > 0 (review cards) - sorted by overdue time
    const reviewCards = dueCards.filter(card => {
      const schedule = schedules.get(card.id);
      return schedule && schedule.repetitions > 0;
    }).sort((a, b) => {
      const scheduleA = schedules.get(a.id);
      const scheduleB = schedules.get(b.id);
      if (!scheduleA || !scheduleB) return 0;
      return new Date(scheduleA.nextReview).getTime() - new Date(scheduleB.nextReview).getTime();
    });

    // Then: new cards (repetitions === 0)
    const newCards = dueCards.filter(card => {
      const schedule = schedules.get(card.id);
      return !schedule || schedule.repetitions === 0;
    });

    [...reviewCards, ...newCards].forEach(card => {
      order.push({ cardId: card.id, mode: 'multiple-choice' });
      order.push({ cardId: card.id, mode: 'type-answer' });
    });

    return order;
  }, [dueCards, schedules, schedulesLoaded]);

  // Current card based on learning order
  const currentLearningItem = learningOrder[currentIndex];
  const currentCard = useMemo(() => {
    if (!currentLearningItem) return null;
    return cards.find(c => c.id === currentLearningItem.cardId) || null;
  }, [currentLearningItem, cards]);

  const currentMode = currentLearningItem?.mode || 'multiple-choice';
  const totalItems = learningOrder.length;

  // Play correct answer sound
  const playCorrectSound = useCallback(() => {
    if (!soundEnabled) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(TING_SOUND_URL);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Focus input on type answer mode
  useEffect(() => {
    if (currentMode === 'type-answer' && inputRef.current && !isAnswered) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, currentMode, isAnswered]);

  // Reset state on card change
  useEffect(() => {
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswered(false);
    setIsCorrect(null);
    setShowHint(false);
  }, [currentIndex]);

  // Handle multiple choice selection
  const handleSelectOption = useCallback((option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const correct = option === currentCard?.back;
    setIsCorrect(correct);

    if (correct) {
      setCorrectCards(prev => new Set([...prev, currentIndex]));
      playCorrectSound();
      // Update SM-2 schedule: quality = 2 (Good)
      if (currentCard) {
        updateSchedule(currentCard.id, 2);
      }
    } else {
      setWrongCards(prev => new Set([...prev, currentIndex]));
      // Update SM-2 schedule: quality = 0 (Again)
      if (currentCard) {
        updateSchedule(currentCard.id, 0);
      }
    }
  }, [isAnswered, currentCard, currentIndex, updateSchedule, playCorrectSound]);

  // Handle type answer submission
  const handleTypeAnswer = useCallback(() => {
    if (isAnswered || !typedAnswer.trim()) return;

    setIsAnswered(true);
    const correct = typedAnswer.trim().toLowerCase() === currentCard?.back.trim().toLowerCase();
    setIsCorrect(correct);

    if (correct) {
      setCorrectCards(prev => new Set([...prev, currentIndex]));
      playCorrectSound();
      if (currentCard) {
        updateSchedule(currentCard.id, 2);
      }
    } else {
      setWrongCards(prev => new Set([...prev, currentIndex]));
      if (currentCard) {
        updateSchedule(currentCard.id, 0);
      }
    }
  }, [isAnswered, typedAnswer, currentCard, currentIndex, updateSchedule, playCorrectSound]);

  // Handle "Don't Know" (mark as wrong and move on)
  const handleDontKnow = useCallback(() => {
    if (!isAnswered) {
      setWrongCards(prev => new Set([...prev, currentIndex]));
      if (currentCard) {
        updateSchedule(currentCard.id, 0);
      }
    }
    moveNext();
  }, [isAnswered, currentCard, currentIndex, updateSchedule]);

  // Handle "Know" (mark as correct and move on)
  const handleKnow = useCallback(() => {
    if (!isAnswered) {
      setCorrectCards(prev => new Set([...prev, currentIndex]));
      playCorrectSound();
      if (currentCard) {
        updateSchedule(currentCard.id, 2);
      }
    }
    moveNext();
  }, [isAnswered, currentCard, updateSchedule, playCorrectSound]);

  // Move to next card
  const moveNext = useCallback(() => {
    setIsAnswered(false);
    setSelectedOption(null);
    setTypedAnswer('');
    setShowHint(false);
    setIsCorrect(null);

    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionDone(true);
      const correct = correctCards.size + (isAnswered && isCorrect ? 1 : 0);
      const wrong = wrongCards.size + (isAnswered && !isCorrect ? 1 : 0);
      onComplete?.({
        correct: correctCards.size,
        wrong: wrongCards.size,
        total: totalItems,
        accuracy: Math.round((correctCards.size / totalItems) * 100),
      });
    }
  }, [currentIndex, totalItems, correctCards, wrongCards, isAnswered, isCorrect, onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionDone) return;

      if (e.key === 'Enter' && currentMode === 'type-answer' && !isAnswered && typedAnswer.trim()) {
        handleTypeAnswer();
      } else if (e.key === ' ' && isAnswered) {
        e.preventDefault();
        moveNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && isAnswered) {
        moveNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAnswered, typedAnswer, currentMode, sessionDone, handleTypeAnswer, moveNext]);

  // Save schedules to server when session is done
  useEffect(() => {
    if (!sessionDone || !setId) return;

    const saveSchedules = async () => {
      console.log('[LearnPage] Session complete, saving schedules...');
      const updates = Array.from(schedules.entries());
      for (const [cardId, schedule] of updates) {
        try {
          // Determine quality based on whether card was answered correctly
          const cardIndices = learningOrder
            .map((item, idx) => ({ ...item, idx }))
            .filter(item => item.cardId === cardId);

          const correctIndices = cardIndices.filter(item => correctCards.has(item.idx));
          const wrongIndices = cardIndices.filter(item => wrongCards.has(item.idx));

          // Quality = average of correct/total for this card
          let quality = 2; // Default Good
          if (wrongIndices.length > 0 && correctIndices.length === 0) {
            quality = 0; // All wrong = Again
          } else if (correctIndices.length > wrongIndices.length) {
            quality = 3; // Mostly correct = Easy
          }

          await progressService.updateCardProgress(cardId, quality);
        } catch (err) {
          console.error(`[LearnPage] Failed to save schedule for card ${cardId}:`, err);
        }
      }
      console.log('[LearnPage] All schedules saved');
    };

    saveSchedules();
  }, [sessionDone, setId, schedules, correctCards, wrongCards, learningOrder]);

  // Handle shuffle
  const handleShuffle = useCallback(() => {
    setIsShuffled(true);
    // Reshuffle remaining cards
    setCurrentIndex(0);
    setCorrectCards(new Set());
    setWrongCards(new Set());
    setSessionDone(false);
  }, []);

  // Session complete screen
  if (sessionDone) {
    const correct = correctCards.size;
    const wrong = wrongCards.size;
    const accuracy = totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0;

    return (
      <div className="quizlet-learn">
        <div className="quizlet-learn__complete">
          <motion.div
            className="quizlet-learn__complete-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="quizlet-learn__complete-score">{accuracy}%</div>
            <h2 className="quizlet-learn__complete-title">
              {accuracy >= 80 ? 'Xuất sắc!' : accuracy >= 50 ? 'Khá tốt!' : 'Cần cố gắng thêm!'}
            </h2>
            <p className="quizlet-learn__complete-subtitle">
              Bạn trả lời đúng {correct} trên {totalItems} câu
            </p>
            <div className="quizlet-learn__complete-stats">
              <div className="quizlet-learn__complete-stat correct">
                <CheckCircle size={20} />
                <span>{correct} đúng</span>
              </div>
              <div className="quizlet-learn__complete-stat wrong">
                <XCircle size={20} />
                <span>{wrong} sai</span>
              </div>
            </div>
            <div className="quizlet-learn__complete-actions">
              <button
                className="quizlet-learn__btn-primary"
                onClick={() => {
                  setCurrentIndex(0);
                  setCorrectCards(new Set());
                  setWrongCards(new Set());
                  setSessionDone(false);
                  setIsShuffled(false);
                }}
              >
                Học lại
              </button>
              <button className="quizlet-learn__btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </motion.div>
        </div>

        <style>{quizletStyles}</style>
      </div>
    );
  }

  // No cards state
  if (!currentCard) {
    return (
      <div className="quizlet-learn">
        <div className="quizlet-learn__empty">
          <p>Không có thẻ để học.</p>
          <button onClick={onClose}>Đóng</button>
        </div>
        <style>{quizletStyles}</style>
      </div>
    );
  }

  return (
    <div className="quizlet-learn">
      {/* Header */}
      <header className="quizlet-learn__header">
        <div className="quizlet-learn__header-left">
          <button
            className="quizlet-learn__header-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="quizlet-learn__header-title">
            <Brain size={20} />
            <span>{setTitle}</span>
          </div>
        </div>

        <div className="quizlet-learn__header-center">
          <QuizletProgressBar
            totalCards={totalItems}
            currentIndex={currentIndex}
            correctCards={correctCards}
            wrongCards={wrongCards}
          />
        </div>

        <div className="quizlet-learn__header-right">
          <button
            className={`quizlet-learn__header-btn ${isShuffled ? 'active' : ''}`}
            onClick={handleShuffle}
            aria-label="Xáo trộn"
            title="Xáo trộn"
          >
            <Shuffle size={20} />
          </button>
          <button
            className={`quizlet-learn__header-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(v => !v)}
            aria-label="Âm thanh"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            className="quizlet-learn__header-btn"
            onClick={() => setSettingsOpen(v => !v)}
            aria-label="Cài đặt"
            title="Cài đặt"
          >
            <Settings size={20} />
          </button>
          <button
            className="quizlet-learn__header-btn quizlet-learn__header-btn--close"
            onClick={onClose}
            aria-label="Thoát"
            title="Thoát"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="quizlet-learn__settings"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="quizlet-learn__settings-header">
              <span>Cài đặt</span>
              <button onClick={() => setSettingsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="quizlet-learn__settings-section">
              <label>Chế độ học</label>
              <div className="quizlet-learn__settings-options">
                {['multiple-choice', 'type-answer'].map(mode => (
                  <button
                    key={mode}
                    className={currentMode === mode ? 'active' : ''}
                    onClick={() => {
                      setLearnMode(mode as 'multiple-choice' | 'type-answer');
                      // Don't switch mid-question
                    }}
                    disabled
                  >
                    {mode === 'multiple-choice' ? 'Trắc nghiệm' : 'Tự luận'}
                  </button>
                ))}
              </div>
            </div>
            <div className="quizlet-learn__settings-info">
              <div className="quizlet-learn__settings-stat correct">
                <CheckCircle size={14} />
                <span>{correctCards.size} đúng</span>
              </div>
              <div className="quizlet-learn__settings-stat wrong">
                <XCircle size={14} />
                <span>{wrongCards.size} sai</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="quizlet-learn__main">
        <div className="quizlet-learn__container">
          {/* Score badges */}
          <div className="quizlet-learn__score-badges">
            <span className="quizlet-learn__score-badge correct">
              <CheckCircle size={14} />
              {correctCards.size}
            </span>
            <span className="quizlet-learn__score-badge wrong">
              <XCircle size={14} />
              {wrongCards.size}
            </span>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="quizlet-learn__card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Mode indicator */}
              <div className="quizlet-learn__card-mode">
                <span className="quizlet-learn__mode-badge">
                  {currentMode === 'multiple-choice' ? 'Trắc nghiệm' : 'Tự luận'}
                </span>
              </div>

              {/* Question */}
              <div className="quizlet-learn__question-section">
                <span className="quizlet-learn__section-label">Thuật ngữ</span>
                <h2 className="quizlet-learn__question">{currentCard.front}</h2>
              </div>

              {/* Answer Area */}
              <div className="quizlet-learn__answer-section">
                {currentMode === 'multiple-choice' && (
                  <div className="quizlet-learn__options">
                    {options.map((option, idx) => {
                      const isSelected = selectedOption === option;
                      const isCorrectOption = option === currentCard.back;

                      let optClass = 'quizlet-learn__option';
                      if (isAnswered) {
                        if (isCorrectOption) optClass += ' correct';
                        else if (isSelected) optClass += ' wrong';
                        else optClass += ' dimmed';
                      }

                      return (
                        <motion.button
                          key={idx}
                          className={optClass}
                          onClick={() => handleSelectOption(option)}
                          disabled={isAnswered}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <span className="quizlet-learn__option-letter">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="quizlet-learn__option-text">{option}</span>
                          {isAnswered && isCorrectOption && (
                            <CheckCircle size={18} className="quizlet-learn__option-icon" />
                          )}
                          {isAnswered && isSelected && !isCorrectOption && (
                            <XCircle size={18} className="quizlet-learn__option-icon" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {currentMode === 'type-answer' && (
                  <div className="quizlet-learn__type-answer">
                    <div className="quizlet-learn__input-wrap">
                      <input
                        ref={inputRef}
                        type="text"
                        className={`quizlet-learn__input ${isAnswered ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                        placeholder="Nhập đáp án..."
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTypeAnswer()}
                        disabled={isAnswered}
                        autoComplete="off"
                      />
                    </div>

                    {isAnswered && !isCorrect && (
                      <div className="quizlet-learn__correct-answer">
                        <CheckCircle size={14} />
                        <span>Đáp án đúng: <strong>{currentCard.back}</strong></span>
                      </div>
                    )}

                    {!isAnswered && (
                      <button
                        className="quizlet-learn__submit-btn"
                        onClick={handleTypeAnswer}
                        disabled={!typedAnswer.trim()}
                      >
                        Kiểm tra
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {isAnswered && (
                <motion.div
                  className="quizlet-learn__actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    className="quizlet-learn__action-btn secondary"
                    onClick={handleDontKnow}
                  >
                    <XCircle size={16} />
                    Chưa biết
                  </button>
                  <button
                    className="quizlet-learn__action-btn primary"
                    onClick={handleKnow}
                  >
                    <CheckCircle size={16} />
                    Đã biết
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="quizlet-learn__nav">
            <button
              className="quizlet-learn__nav-btn"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="quizlet-learn__nav-info">
              <span className="quizlet-learn__nav-label">
                {currentIndex + 1} / {totalItems}
              </span>
            </div>

            <button
              className="quizlet-learn__nav-btn"
              onClick={moveNext}
              disabled={!isAnswered && currentIndex < totalItems - 1}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </main>

      <style>{quizletStyles}</style>
    </div>
  );
}

// CSS Styles
const quizletStyles = `
  .quizlet-learn {
    min-height: 100vh;
    background: #f6f7fb;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  [data-theme='dark'] .quizlet-learn {
    background: #0b0e12;
  }

  /* Header */
  .quizlet-learn__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    gap: 12px;
    flex-wrap: wrap;
  }

  [data-theme='dark'] .quizlet-learn__header {
    background: #151922;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .quizlet-learn__header-left,
  .quizlet-learn__header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .quizlet-learn__header-center {
    flex: 1;
    max-width: 400px;
    min-width: 200px;
  }

  .quizlet-learn__header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #1a1a2e;
    font-size: 0.95rem;
  }

  [data-theme='dark'] .quizlet-learn__header-title {
    color: #e8eaed;
  }

  .quizlet-learn__header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    border-radius: 10px;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.15s;
  }

  .quizlet-learn__header-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #1a1a2e;
  }

  .quizlet-learn__header-btn.active {
    background: rgba(44, 94, 245, 0.1);
    color: #2c5ef5;
  }

  .quizlet-learn__header-btn--close:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* Progress Bar */
  .quizlet-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .quizlet-progress__bar {
    display: flex;
    gap: 3px;
    align-items: flex-end;
  }

  .quizlet-progress__segment {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .quizlet-progress__cards {
    display: flex;
    gap: 2px;
  }

  .quizlet-progress__card {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e5e7eb;
    transition: all 0.2s;
  }

  [data-theme='dark'] .quizlet-progress__card {
    background: #374151;
  }

  .quizlet-progress__card.correct {
    background: #10b981;
  }

  .quizlet-progress__card.wrong {
    background: #ef4444;
  }

  .quizlet-progress__card.current {
    transform: scale(1.3);
    box-shadow: 0 0 0 2px rgba(44, 94, 245, 0.3);
  }

  .quizlet-progress__card.answered {
    border-radius: 2px;
  }

  .quizlet-progress__card.empty {
    background: transparent;
  }

  .quizlet-progress__segment-label {
    font-size: 0.65rem;
    color: #9ca3af;
    text-align: center;
    font-weight: 600;
  }

  .quizlet-progress__text {
    text-align: center;
  }

  .quizlet-progress__count {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
  }

  /* Main Content */
  .quizlet-learn__main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

  .quizlet-learn__container {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Score Badges */
  .quizlet-learn__score-badges {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .quizlet-learn__score-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .quizlet-learn__score-badge.correct {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .quizlet-learn__score-badge.wrong {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* Question Card */
  .quizlet-learn__card {
    background: #fff;
    border-radius: 20px;
    padding: 28px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }

  [data-theme='dark'] .quizlet-learn__card {
    background: #1e2332;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .quizlet-learn__card-mode {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .quizlet-learn__mode-badge {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8a8fa8;
    background: #f0f1f6;
    padding: 4px 12px;
    border-radius: 20px;
  }

  [data-theme='dark'] .quizlet-learn__mode-badge {
    background: rgba(255, 255, 255, 0.06);
    color: #9ca3af;
  }

  .quizlet-learn__question-section {
    text-align: center;
    margin-bottom: 24px;
  }

  .quizlet-learn__section-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a8fa8;
    margin-bottom: 8px;
    display: block;
  }

  .quizlet-learn__question {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
    line-height: 1.3;
  }

  [data-theme='dark'] .quizlet-learn__question {
    color: #e8eaed;
  }

  /* Options */
  .quizlet-learn__options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .quizlet-learn__option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: #f8f9fc;
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.925rem;
    font-weight: 500;
    color: #1a1a2e;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
  }

  .quizlet-learn__option:hover:not(:disabled) {
    background: #eef0f7;
    border-color: rgba(44, 94, 245, 0.2);
  }

  .quizlet-learn__option:disabled {
    cursor: default;
  }

  .quizlet-learn__option.correct {
    background: rgba(16, 185, 129, 0.08);
    border-color: #10b981;
    color: #059669;
  }

  .quizlet-learn__option.wrong {
    background: rgba(239, 68, 68, 0.08);
    border-color: #ef4444;
    color: #dc2626;
  }

  .quizlet-learn__option.dimmed {
    opacity: 0.5;
  }

  .quizlet-learn__option-letter {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(44, 94, 245, 0.1);
    color: #2c5ef5;
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .quizlet-learn__option.correct .quizlet-learn__option-letter {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .quizlet-learn__option.wrong .quizlet-learn__option-letter {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .quizlet-learn__option-text {
    flex: 1;
  }

  .quizlet-learn__option-icon {
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Type Answer */
  .quizlet-learn__type-answer {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .quizlet-learn__input-wrap {
    position: relative;
  }

  .quizlet-learn__input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    color: #1a1a2e;
    background: #f8f9fc;
    outline: none;
    transition: all 0.15s;
  }

  .quizlet-learn__input:focus {
    border-color: #2c5ef5;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(44, 94, 245, 0.1);
  }

  .quizlet-learn__input.correct {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }

  .quizlet-learn__input.wrong {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .quizlet-learn__correct-answer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: rgba(16, 185, 129, 0.08);
    border-radius: 10px;
    font-size: 0.875rem;
    color: #059669;
  }

  .quizlet-learn__correct-answer strong {
    color: #10b981;
  }

  .quizlet-learn__submit-btn {
    padding: 14px;
    border-radius: 12px;
    border: none;
    background: #2c5ef5;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quizlet-learn__submit-btn:hover:not(:disabled) {
    background: #1d4fd8;
  }

  .quizlet-learn__submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Actions */
  .quizlet-learn__actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  [data-theme='dark'] .quizlet-learn__actions {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .quizlet-learn__action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    border-radius: 12px;
    border: none;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quizlet-learn__action-btn.secondary {
    background: #f0f1f6;
    color: #4a5568;
  }

  .quizlet-learn__action-btn.secondary:hover {
    background: #e4e7f0;
  }

  .quizlet-learn__action-btn.primary {
    background: #2c5ef5;
    color: #fff;
  }

  .quizlet-learn__action-btn.primary:hover {
    background: #1d4fd8;
  }

  /* Navigation */
  .quizlet-learn__nav {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .quizlet-learn__nav-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1.5px solid rgba(0, 0, 0, 0.1);
    background: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4a5568;
    transition: all 0.15s;
  }

  .quizlet-learn__nav-btn:hover:not(:disabled) {
    background: #f0f1f6;
    border-color: rgba(0, 0, 0, 0.2);
  }

  .quizlet-learn__nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .quizlet-learn__nav-info {
    flex: 1;
    text-align: center;
  }

  .quizlet-learn__nav-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #8a8fa8;
  }

  /* Settings Panel */
  .quizlet-learn__settings {
    position: fixed;
    top: 70px;
    right: 16px;
    width: 260px;
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 100;
  }

  [data-theme='dark'] .quizlet-learn__settings {
    background: #1e2332;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .quizlet-learn__settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    font-weight: 700;
    color: #1a1a2e;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  [data-theme='dark'] .quizlet-learn__settings-header {
    color: #e8eaed;
  }

  .quizlet-learn__settings-header button {
    background: none;
    border: none;
    cursor: pointer;
    color: #8a8fa8;
    padding: 4px;
  }

  .quizlet-learn__settings-section {
    margin-bottom: 16px;
  }

  .quizlet-learn__settings-section label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #8a8fa8;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .quizlet-learn__settings-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .quizlet-learn__settings-options button {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1.5px solid rgba(0, 0, 0, 0.08);
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4a5568;
    text-align: left;
    transition: all 0.15s;
  }

  .quizlet-learn__settings-options button:hover:not(:disabled) {
    background: #f0f1f6;
  }

  .quizlet-learn__settings-options button.active {
    background: rgba(44, 94, 245, 0.1);
    border-color: #2c5ef5;
    color: #2c5ef5;
  }

  .quizlet-learn__settings-options button:disabled {
    cursor: default;
  }

  .quizlet-learn__settings-info {
    display: flex;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  [data-theme='dark'] .quizlet-learn__settings-info {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .quizlet-learn__settings-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .quizlet-learn__settings-stat.correct {
    color: #10b981;
  }

  .quizlet-learn__settings-stat.wrong {
    color: #ef4444;
  }

  /* Complete Screen */
  .quizlet-learn__complete {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .quizlet-learn__complete-card {
    background: #fff;
    border-radius: 24px;
    padding: 48px 40px;
    text-align: center;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }

  [data-theme='dark'] .quizlet-learn__complete-card {
    background: #151922;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }

  .quizlet-learn__complete-score {
    font-size: 4.5rem;
    font-weight: 700;
    color: #2c5ef5;
    line-height: 1;
    margin-bottom: 12px;
  }

  .quizlet-learn__complete-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 8px;
  }

  [data-theme='dark'] .quizlet-learn__complete-title {
    color: #e8eaed;
  }

  .quizlet-learn__complete-subtitle {
    font-size: 0.95rem;
    color: #8a8fa8;
    margin-bottom: 24px;
  }

  .quizlet-learn__complete-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 32px;
  }

  .quizlet-learn__complete-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .quizlet-learn__complete-stat.correct {
    color: #10b981;
  }

  .quizlet-learn__complete-stat.wrong {
    color: #ef4444;
  }

  .quizlet-learn__complete-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .quizlet-learn__btn-primary {
    padding: 14px 20px;
    border-radius: 12px;
    border: none;
    background: #2c5ef5;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quizlet-learn__btn-primary:hover {
    background: #1d4fd8;
  }

  .quizlet-learn__btn-secondary {
    padding: 12px 20px;
    border-radius: 12px;
    border: 1.5px solid rgba(0, 0, 0, 0.12);
    background: transparent;
    color: #4a5568;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .quizlet-learn__btn-secondary:hover {
    background: #f0f1f6;
  }

  /* Empty State */
  .quizlet-learn__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #6b7280;
  }

  /* Mobile Responsive */
  @media (max-width: 640px) {
    .quizlet-learn__header {
      padding: 10px 12px;
    }

    .quizlet-learn__header-title span {
      display: none;
    }

    .quizlet-learn__header-center {
      order: 3;
      width: 100%;
      max-width: none;
      flex-basis: 100%;
    }

    .quizlet-learn__card {
      padding: 20px;
    }

    .quizlet-learn__question {
      font-size: 1.25rem;
    }

    .quizlet-learn__settings {
      width: calc(100% - 32px);
      right: 16px;
      left: 16px;
    }
  }
`;

export default LearnPage;
