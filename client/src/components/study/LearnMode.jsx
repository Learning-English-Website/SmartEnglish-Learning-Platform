import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb, ChevronLeft, ChevronRight, Settings, Volume2, X } from 'lucide-react';
import StudyHeader from './StudyHeader';

/**
 * LearnMode - Quizlet-style Learn mode with multiple choice, type answer, flashcards
 * @param {array} cards - Array of card objects { id, front, back }
 * @param {string} setTitle - Title of the flashcard set
 * @param {function} onClose - Callback when closed
 * @param {function} onComplete - Callback when session completes with results
 */
export default function LearnMode({ cards = [], setTitle = '', onClose, onComplete }) {
  const [learnType, setLearnType] = useState('multiple-choice'); // 'multiple-choice' | 'type-answer' | 'flashcard'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isCorrectTyped, setIsCorrectTyped] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wrongCards, setWrongCards] = useState([]);
  const [sessionDone, setSessionDone] = useState(false);
  const inputRef = useRef(null);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];
  const progressPercent = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;

  // Options recomputed on each render so they refresh per card
  const options = currentCard
    ? [
        ...cards
          .filter((c) => c.id !== currentCard.id)
          .map((c) => c.back)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3),
        currentCard.back,
      ].sort(() => Math.random() - 0.5)
    : [];

  // Refocus input on new card
  useEffect(() => {
    if (learnType === 'type-answer' && inputRef.current && !isAnswered) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, learnType, isAnswered]);

  // Reset state on card change
  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
    setTypedAnswer('');
    setShowHint(false);
    setIsCorrectTyped(null);
    setIsFlipped(false);
  }, [currentIndex]);

  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    const correct = option === currentCard.back;
    if (correct) {
      setCorrectCount((v) => v + 1);
    } else {
      setWrongCount((v) => v + 1);
      setWrongCards((prev) => [...prev, currentCard.id]);
    }
  };

  const handleTypeAnswer = () => {
    if (isAnswered) return;
    const trimmed = typedAnswer.trim().toLowerCase();
    const correct = trimmed === currentCard.back.trim().toLowerCase();
    setIsAnswered(true);
    setIsCorrectTyped(correct);
    if (correct) {
      setCorrectCount((v) => v + 1);
    } else {
      setWrongCount((v) => v + 1);
      setWrongCards((prev) => [...prev, currentCard.id]);
    }
  };

  const handleTypeKeyDown = (e) => {
    if (e.key === 'Enter') handleTypeAnswer();
  };

  const handleFlip = () => {
    if (isAnswered) return;
    setIsFlipped(true);
    setWrongCount((v) => v + 1);
    setWrongCards((prev) => [...prev, currentCard.id]);
    setIsAnswered(true);
  };

  const handleKnow = () => {
    setCorrectCount((v) => v + 1);
    moveNext();
  };

  const handleDontKnow = () => {
    setWrongCount((v) => v + 1);
    setWrongCards((prev) => [...prev, currentCard.id]);
    moveNext();
  };

  const moveNext = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setTypedAnswer('');
    setShowHint(false);
    setIsCorrectTyped(null);
    setIsFlipped(false);

    if (currentIndex < totalCards - 1) {
      setCurrentIndex((v) => v + 1);
    } else {
      setSessionDone(true);
      onComplete?.({
        correct: correctCount,
        wrong: wrongCount,
        total: totalCards,
        accuracy: Math.round((correctCount / totalCards) * 100),
      });
    }
  };

  const handleNext = () => {
    if (!isAnswered) return;
    moveNext();
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((v) => v - 1);
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

  const speakCard = (text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  // Session complete
  if (sessionDone) {
    const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
    return (
      <div className="study-mode-wrap">
        <StudyHeader
          mode="learn"
          setTitle={setTitle}
          currentCard={totalCards}
          totalCards={totalCards}
          progress
          onClose={onClose}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreen}
        />
        <div className="learn-complete">
          <motion.div
            className="learn-complete__card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="learn-complete__score">{accuracy}%</div>
            <h2 className="learn-complete__title">
              {accuracy >= 80 ? 'Xuất sắc!' : accuracy >= 50 ? 'Khá tốt!' : 'Cần cố gắng thêm!'}
            </h2>
            <p className="learn-complete__subtitle">
              Bạn trả lời đúng {correctCount} trên {totalCards} câu
            </p>
            <div className="learn-complete__stats">
              <div className="learn-complete__stat">
                <CheckCircle size={20} color="#10b981" />
                <span>{correctCount} đúng</span>
              </div>
              <div className="learn-complete__stat">
                <XCircle size={20} color="#ef4444" />
                <span>{wrongCount} sai</span>
              </div>
            </div>
            <div className="learn-complete__actions">
              <button className="btn-glassline-primary" onClick={() => {
                setCurrentIndex(0);
                setCorrectCount(0);
                setWrongCount(0);
                setSessionDone(false);
                setWrongCards([]);
              }}>
                Học lại
              </button>
              <button className="learn-complete__btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
        <style>{`
          .learn-complete {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f6f7fb;
          }
          [data-theme='dark'] .learn-complete { background: #0b0e12; }
          .learn-complete__card {
            background: #fff;
            border-radius: 28px;
            padding: 48px 40px;
            text-align: center;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          [data-theme='dark'] .learn-complete__card {
            background: #151922;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
          }
          .learn-complete__score {
            font-size: 5rem;
            font-weight: 700;
            color: #2c5ef5;
            line-height: 1;
            margin-bottom: 12px;
          }
          .learn-complete__title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 8px;
          }
          [data-theme='dark'] .learn-complete__title { color: #e8eaed; }
          .learn-complete__subtitle {
            font-size: 0.95rem;
            color: #8a8fa8;
            margin-bottom: 24px;
          }
          .learn-complete__stats {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 32px;
          }
          .learn-complete__stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            font-weight: 600;
            color: #4a5568;
          }
          [data-theme='dark'] .learn-complete__stat { color: #868e96; }
          .learn-complete__actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .learn-complete__btn-secondary {
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
          [data-theme='dark'] .learn-complete__btn-secondary {
            border-color: rgba(255,255,255,0.12);
            color: #868e96;
          }
          .learn-complete__btn-secondary:hover {
            background: #f0f1f6;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="study-mode-wrap">
      <StudyHeader
        mode="learn"
        setTitle={setTitle}
        currentCard={currentIndex + 1}
        totalCards={totalCards}
        progress
        onClose={onClose}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((v) => !v)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreen}
      />

      <div className="learn-mode">
        {/* Settings panel */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              className="learn-mode__settings-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="learn-mode__settings-header">
                <span className="learn-mode__settings-title">Cài đặt</span>
                <button
                  className="learn-mode__settings-close"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="learn-mode__settings-group">
                <p className="learn-mode__settings-label">Chế độ học</p>
                <div className="learn-mode__settings-options">
                  {[
                    { id: 'multiple-choice', label: 'Trắc nghiệm' },
                    { id: 'type-answer', label: 'Tự luận' },
                    { id: 'flashcard', label: 'Thẻ ghi nhớ' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      className={`learn-mode__settings-option ${learnType === opt.id ? 'active' : ''}`}
                      onClick={() => {
                        setLearnType(opt.id);
                        setIsAnswered(false);
                        setSelectedOption(null);
                        setTypedAnswer('');
                        setIsFlipped(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="learn-mode__settings-info">
                <CheckCircle size={14} color="#10b981" />
                <span>{correctCount} đúng</span>
                <XCircle size={14} color="#ef4444" />
                <span>{wrongCount} sai</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile settings toggle */}
        <button
          className="learn-mode__settings-toggle"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label="Cài đặt"
        >
          <Settings size={20} />
        </button>

        {/* Main content */}
        <div className={`learn-mode__content ${settingsOpen ? 'with-settings' : ''}`}>
          <div className="learn-mode__container">
            {/* Score badge */}
            <div className="learn-mode__score-badges">
              <span className="learn-mode__score-badge learn-mode__score-badge--correct">
                <CheckCircle size={14} /> {correctCount}
              </span>
              <span className="learn-mode__score-badge learn-mode__score-badge--wrong">
                <XCircle size={14} /> {wrongCount}
              </span>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="learn-mode__question-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Question */}
                <div className="learn-mode__question-section">
                  <span className="learn-mode__section-label">Thuật ngữ</span>
                  <h2 className="learn-mode__question">{currentCard?.front}</h2>
                  <button
                    className="learn-mode__sound-btn"
                    onClick={() => speakCard(currentCard?.front)}
                    aria-label="Phát âm"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>

                {/* Answer area */}
                <div className="learn-mode__answer-section">
                  {learnType === 'multiple-choice' && (
                    <div className="learn-mode__options">
                      {(isAnswered ? options : options).map((opt, i) => {
                        const isSelected = selectedOption === opt;
                        const isCorrect = opt === currentCard?.back;
                        let optClass = 'learn-mode__option';
                        if (isAnswered) {
                          if (isCorrect) optClass += ' correct';
                          else if (isSelected && !isCorrect) optClass += ' wrong';
                        }
                        return (
                          <motion.button
                            key={`${currentIndex}-${i}`}
                            className={optClass}
                            onClick={() => handleSelectOption(opt)}
                            disabled={isAnswered}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                          >
                            <span className="learn-mode__option-letter">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="learn-mode__option-text">{opt}</span>
                            {isAnswered && isCorrect && <CheckCircle size={18} color="#10b981" className="learn-mode__option-icon" />}
                            {isAnswered && isSelected && !isCorrect && <XCircle size={18} color="#ef4444" className="learn-mode__option-icon" />}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {learnType === 'type-answer' && (
                    <div className="learn-mode__type-answer">
                      <div className="learn-mode__input-wrap">
                        <input
                          ref={inputRef}
                          type="text"
                          className={`learn-mode__input ${isAnswered ? (isCorrectTyped ? 'is-correct' : 'is-wrong') : ''}`}
                          placeholder="Nhập đáp án..."
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                          onKeyDown={handleTypeKeyDown}
                          disabled={isAnswered}
                          autoComplete="off"
                        />
                        {!isAnswered && (
                          <button
                            className="learn-mode__hint-btn"
                            onClick={() => setShowHint((v) => !v)}
                            aria-label="Gợi ý"
                            title="Gợi ý"
                          >
                            <Lightbulb size={18} />
                          </button>
                        )}
                      </div>
                      {showHint && !isAnswered && (
                        <motion.div
                          className="learn-mode__hint"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          Gợi ý: {currentCard?.back.charAt(0)}...
                        </motion.div>
                      )}
                      {isAnswered && !isCorrectTyped && (
                        <div className="learn-mode__correct-answer">
                          <CheckCircle size={14} color="#10b981" />
                          Đáp án đúng: <strong>{currentCard?.back}</strong>
                        </div>
                      )}
                      {!isAnswered && (
                        <button
                          className="learn-mode__submit-btn"
                          onClick={handleTypeAnswer}
                          disabled={!typedAnswer.trim()}
                        >
                          Kiểm tra
                        </button>
                      )}
                    </div>
                  )}

                  {learnType === 'flashcard' && (
                    <div className="learn-mode__flashcard-answer">
                      <motion.div
                        className={`learn-mode__mini-card ${isFlipped ? 'flipped' : ''}`}
                        onClick={handleFlip}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="learn-mode__mini-card-inner">
                          <div className="learn-mode__mini-card-front">
                            <span className="learn-mode__mini-card-label">Định nghĩa</span>
                            <p className="learn-mode__mini-card-text">{currentCard?.back}</p>
                          </div>
                        </div>
                      </motion.div>
                      <p className="learn-mode__flashcard-prompt">
                        Bạn có nhớ thuật ngữ này không?
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {isAnswered && (
                  <motion.div
                    className="learn-mode__actions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {learnType !== 'flashcard' ? (
                      <>
                        <button
                          className="learn-mode__action-btn learn-mode__action-btn--secondary"
                          onClick={handleDontKnow}
                        >
                          <XCircle size={16} />
                          Tôi không biết
                        </button>
                        <button
                          className="learn-mode__action-btn learn-mode__action-btn--primary"
                          onClick={handleKnow}
                        >
                          <CheckCircle size={16} />
                          Tôi biết rồi
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="learn-mode__action-btn learn-mode__action-btn--secondary"
                          onClick={handleDontKnow}
                        >
                          <XCircle size={16} />
                          Chưa nhớ
                        </button>
                        <button
                          className="learn-mode__action-btn learn-mode__action-btn--primary"
                          onClick={handleKnow}
                        >
                          <CheckCircle size={16} />
                          Đã nhớ
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="learn-mode__nav">
              <button
                className="learn-mode__nav-btn"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Câu trước"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="learn-mode__progress-track">
                <motion.div
                  className="learn-mode__progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <button
                className="learn-mode__nav-btn"
                onClick={handleNext}
                disabled={!isAnswered}
                aria-label="Câu tiếp"
              >
                <ChevronRight size={20} />
              </button>
            </div>
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
        [data-theme='dark'] .study-mode-wrap { background: #0b0e12; }

        .learn-mode {
          flex: 1;
          display: flex;
          position: relative;
        }

        /* Settings panel */
        .learn-mode__settings-panel {
          position: fixed;
          right: 16px;
          top: 80px;
          width: 260px;
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          z-index: 50;
        }
        [data-theme='dark'] .learn-mode__settings-panel {
          background: #151922;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .learn-mode__settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .learn-mode__settings-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1a1a2e;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        [data-theme='dark'] .learn-mode__settings-title { color: #e8eaed; }

        .learn-mode__settings-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #8a8fa8;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .learn-mode__settings-close:hover {
          background: #f0f1f6;
          color: #1a1a2e;
        }

        .learn-mode__settings-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #8a8fa8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .learn-mode__settings-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .learn-mode__settings-option {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid rgba(0,0,0,0.08);
          background: transparent;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
          text-align: left;
          transition: all 0.15s;
        }
        [data-theme='dark'] .learn-mode__settings-option {
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .learn-mode__settings-option:hover {
          background: #f0f1f6;
        }
        [data-theme='dark'] .learn-mode__settings-option:hover {
          background: #1e2332;
        }
        .learn-mode__settings-option.active {
          background: #e8edff;
          border-color: #2c5ef5;
          color: #2c5ef5;
        }
        [data-theme='dark'] .learn-mode__settings-option.active {
          background: rgba(44,94,245,0.15);
          border-color: #6b8cff;
          color: #6b8cff;
        }

        .learn-mode__settings-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 0.8rem;
          font-weight: 600;
          color: #8a8fa8;
        }
        [data-theme='dark'] .learn-mode__settings-info {
          border-top-color: rgba(255,255,255,0.06);
        }

        /* Mobile settings toggle */
        .learn-mode__settings-toggle {
          display: none;
          position: fixed;
          bottom: 24px;
          right: 20px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #2c5ef5;
          border: none;
          cursor: pointer;
          color: #fff;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(44,94,245,0.3);
          z-index: 40;
        }

        /* Main content */
        .learn-mode__content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px 32px;
          transition: margin-right 0.3s ease;
        }

        .learn-mode__container {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Score badges */
        .learn-mode__score-badges {
          display: flex;
          gap: 10px;
        }

        .learn-mode__score-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .learn-mode__score-badge--correct {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .learn-mode__score-badge--wrong {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Question card */
        .learn-mode__question-card {
          background: #fff;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        [data-theme='dark'] .learn-mode__question-card {
          background: #151922;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .learn-mode__question-section {
          position: relative;
          text-align: center;
          margin-bottom: 28px;
        }

        .learn-mode__section-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a8fa8;
          background: #f0f1f6;
          padding: 3px 12px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 12px;
        }
        [data-theme='dark'] .learn-mode__section-label {
          background: #1e2332;
          color: #868e96;
        }

        .learn-mode__question {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.3;
          margin: 0;
        }
        [data-theme='dark'] .learn-mode__question { color: #e8eaed; }

        .learn-mode__sound-btn {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: transparent;
          cursor: pointer;
          color: #8a8fa8;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        [data-theme='dark'] .learn-mode__sound-btn {
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .learn-mode__sound-btn:hover {
          background: #2c5ef5;
          border-color: #2c5ef5;
          color: #fff;
        }

        /* Options */
        .learn-mode__options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .learn-mode__option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #f8f9fc;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          font-size: 0.925rem;
          font-weight: 500;
          color: #1a1a2e;
          text-align: left;
          transition: all 0.15s;
          width: 100%;
        }
        [data-theme='dark'] .learn-mode__option {
          background: #1e2332;
          color: #e8eaed;
        }
        .learn-mode__option:hover:not(:disabled) {
          background: #eef0f7;
          border-color: #c7d0f0;
        }
        [data-theme='dark'] .learn-mode__option:hover:not(:disabled) {
          background: #252c3f;
          border-color: rgba(44,94,245,0.3);
        }
        .learn-mode__option:disabled {
          cursor: default;
        }
        .learn-mode__option.correct {
          background: rgba(16, 185, 129, 0.08);
          border-color: #10b981;
          color: #059669;
        }
        .learn-mode__option.wrong {
          background: rgba(239, 68, 68, 0.08);
          border-color: #ef4444;
          color: #dc2626;
        }

        .learn-mode__option-letter {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(44,94,245,0.1);
          color: #2c5ef5;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .learn-mode__option.correct .learn-mode__option-letter {
          background: rgba(16,185,129,0.15);
          color: #10b981;
        }
        .learn-mode__option.wrong .learn-mode__option-letter {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }

        .learn-mode__option-text {
          flex: 1;
        }

        .learn-mode__option-icon {
          margin-left: auto;
          flex-shrink: 0;
        }

        /* Type answer */
        .learn-mode__type-answer {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .learn-mode__input-wrap {
          position: relative;
        }

        .learn-mode__input {
          width: 100%;
          padding: 14px 48px 14px 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 500;
          color: #1a1a2e;
          background: #f8f9fc;
          outline: none;
          transition: all 0.15s;
        }
        [data-theme='dark'] .learn-mode__input {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #e8eaed;
        }
        .learn-mode__input:focus {
          border-color: #2c5ef5;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(44,94,245,0.1);
        }
        .learn-mode__input.is-correct {
          border-color: #10b981;
          background: rgba(16,185,129,0.05);
        }
        .learn-mode__input.is-wrong {
          border-color: #ef4444;
          background: rgba(239,68,68,0.05);
        }

        .learn-mode__hint-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: none;
          background: rgba(44,94,245,0.08);
          cursor: pointer;
          color: #2c5ef5;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .learn-mode__hint-btn:hover {
          background: rgba(44,94,245,0.15);
        }

        .learn-mode__hint {
          padding: 10px 14px;
          background: rgba(44,94,245,0.06);
          border-radius: 10px;
          font-size: 0.85rem;
          color: #2c5ef5;
          font-weight: 500;
        }

        .learn-mode__correct-answer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: rgba(16,185,129,0.08);
          border-radius: 10px;
          font-size: 0.875rem;
          color: #059669;
        }
        .learn-mode__correct-answer strong {
          color: #10b981;
        }

        .learn-mode__submit-btn {
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: #2c5ef5;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .learn-mode__submit-btn:hover:not(:disabled) {
          background: #1d4fd8;
        }
        .learn-mode__submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Flashcard answer */
        .learn-mode__flashcard-answer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .learn-mode__mini-card {
          width: 100%;
          padding: 24px;
          background: #f8f9fc;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }
        [data-theme='dark'] .learn-mode__mini-card {
          background: #1e2332;
        }
        .learn-mode__mini-card:hover {
          border-color: #c7d0f0;
        }

        .learn-mode__mini-card-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a8fa8;
          background: #eef0f7;
          padding: 3px 10px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 12px;
        }
        [data-theme='dark'] .learn-mode__mini-card-label {
          background: rgba(255,255,255,0.06);
          color: #868e96;
        }

        .learn-mode__mini-card-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0;
          line-height: 1.4;
        }
        [data-theme='dark'] .learn-mode__mini-card-text { color: #e8eaed; }

        .learn-mode__flashcard-prompt {
          font-size: 0.875rem;
          color: #8a8fa8;
          margin: 0;
        }

        /* Actions */
        .learn-mode__actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        [data-theme='dark'] .learn-mode__actions {
          border-top-color: rgba(255,255,255,0.06);
        }

        .learn-mode__action-btn {
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

        .learn-mode__action-btn--secondary {
          background: #f0f1f6;
          color: #4a5568;
        }
        [data-theme='dark'] .learn-mode__action-btn--secondary {
          background: #1e2332;
          color: #868e96;
        }
        .learn-mode__action-btn--secondary:hover {
          background: #e4e7f0;
        }
        [data-theme='dark'] .learn-mode__action-btn--secondary:hover {
          background: #252c3f;
        }

        .learn-mode__action-btn--primary {
          background: #2c5ef5;
          color: #fff;
        }
        .learn-mode__action-btn--primary:hover {
          background: #1d4fd8;
        }

        /* Navigation */
        .learn-mode__nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .learn-mode__nav-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4a5568;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        [data-theme='dark'] .learn-mode__nav-btn {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .learn-mode__nav-btn:hover:not(:disabled) {
          background: #f0f1f6;
          border-color: rgba(0,0,0,0.2);
        }
        .learn-mode__nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .learn-mode__progress-track {
          flex: 1;
          height: 6px;
          background: #e8eaf0;
          border-radius: 3px;
          overflow: hidden;
        }
        [data-theme='dark'] .learn-mode__progress-track {
          background: rgba(255,255,255,0.1);
        }

        .learn-mode__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2c5ef5, #6b8cff);
          border-radius: 3px;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .learn-mode__settings-panel {
            display: none;
          }

          .learn-mode__settings-toggle {
            display: flex;
          }

          .learn-mode__question-card {
            padding: 24px 20px;
            border-radius: 20px;
          }
        }

        @media (max-width: 480px) {
          .learn-mode__content {
            padding: 16px 12px 24px;
          }

          .learn-mode__score-badges {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
