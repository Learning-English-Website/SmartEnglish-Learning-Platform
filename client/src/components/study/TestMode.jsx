import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  ClipboardCheck, X, Volume2, Settings, Clock
} from 'lucide-react';
import StudyHeader from './StudyHeader';
import { progressService } from '../../services/progressService';

/**
 * TestMode - Quizlet-style Test mode with setup modal and question types
 * @param {array} cards - Array of card objects { id, front, back }
 * @param {string} setTitle - Title of the flashcard set
 * @param {function} onClose - Callback when closed
 * @param {function} onComplete - Callback when test completed with results
 */

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ cards, onStart, onClose }) {
  const [questionCount, setQuestionCount] = useState(Math.min(cards.length, 10));
  const [answerWith, setAnswerWith] = useState('both'); // 'term' | 'definition' | 'both'
  const [types, setTypes] = useState({
    multipleChoice: true,
    trueFalse: true,
    typeAnswer: false,
  });

  const toggleType = (key) => {
    const newTypes = { ...types, [key]: !types[key] };
    if (Object.values(newTypes).every((v) => !v)) return; // keep at least one
    setTypes(newTypes);
  };

  const activeTypes = Object.entries(types).filter(([, v]) => v).map(([k]) => k);

  const handleStart = () => {
    onStart({ questionCount, answerWith, types: activeTypes });
  };

  return (
    <div className="test-modal-overlay">
      <motion.div
        className="test-modal"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="test-modal__header">
          <div className="test-modal__icon">
            <ClipboardCheck size={24} color="#2c5ef5" />
          </div>
          <div>
            <h2 className="test-modal__title">Kiểm tra</h2>
            <p className="test-modal__subtitle">
              {cards.length} thẻ trong bộ này
            </p>
          </div>
          <button className="test-modal__close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="test-modal__body">
          {/* Question count */}
          <div className="test-modal__section">
            <label className="test-modal__label">Số câu hỏi</label>
            <div className="test-modal__count-selector">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  className={`test-modal__count-btn ${questionCount === n ? 'active' : ''}`}
                  onClick={() => setQuestionCount(Math.min(n, cards.length))}
                  disabled={n > cards.length}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={cards.length}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="test-modal__range"
            />
            <span className="test-modal__range-label">
              {questionCount} câu hỏi
            </span>
          </div>

          {/* Answer with */}
          <div className="test-modal__section">
            <label className="test-modal__label">Trả lời bằng</label>
            <div className="test-modal__toggle-group">
              {[
                { id: 'term', label: 'Thuật ngữ' },
                { id: 'definition', label: 'Định nghĩa' },
                { id: 'both', label: 'Cả hai' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`test-modal__toggle-btn ${answerWith === opt.id ? 'active' : ''}`}
                  onClick={() => setAnswerWith(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question types */}
          <div className="test-modal__section">
            <label className="test-modal__label">Loại câu hỏi</label>
            <div className="test-modal__types">
              {[
                { key: 'multipleChoice', label: 'Trắc nghiệm', icon: 'A' },
                { key: 'trueFalse', label: 'Đúng/Sai', icon: 'T/F' },
                { key: 'typeAnswer', label: 'Tự luận', icon: '✎' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`test-modal__type-btn ${types[key] ? 'active' : ''}`}
                  onClick={() => toggleType(key)}
                >
                  <span className="test-modal__type-icon">{icon}</span>
                  <span>{label}</span>
                  <span className={`test-modal__type-check ${types[key] ? 'checked' : ''}`}>
                    {types[key] && <CheckCircle size={14} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="test-modal__footer">
          <button className="test-modal__start-btn" onClick={handleStart}>
            Bắt đầu kiểm tra
            <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>

      <style>{`
        .test-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 20, 25, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 16px;
        }

        .test-modal {
          background: #fff;
          border-radius: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        [data-theme='dark'] .test-modal {
          background: #151922;
        }

        .test-modal__header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 28px 28px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        [data-theme='dark'] .test-modal__header {
          border-bottom-color: rgba(255, 255, 255, 0.06);
        }

        .test-modal__icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(44, 94, 245, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .test-modal__title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 2px;
        }

        [data-theme='dark'] .test-modal__title { color: #e8eaed; }

        .test-modal__subtitle {
          font-size: 0.85rem;
          color: #8a8fa8;
          margin: 0;
        }

        .test-modal__close {
          margin-left: auto;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #8a8fa8;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .test-modal__close:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .test-modal__body {
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .test-modal__section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .test-modal__label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #8a8fa8;
        }

        /* Count selector */
        .test-modal__count-selector {
          display: flex;
          gap: 8px;
        }

        .test-modal__count-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.15s;
        }

        .test-modal__count-btn.active {
          background: #e8edff;
          border-color: #2c5ef5;
          color: #2c5ef5;
        }

        .test-modal__count-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .test-modal__range {
          width: 100%;
          accent-color: #2c5ef5;
          cursor: pointer;
        }

        .test-modal__range-label {
          font-size: 0.8rem;
          color: #8a8fa8;
          text-align: center;
        }

        /* Toggle group */
        .test-modal__toggle-group {
          display: flex;
          gap: 8px;
        }

        .test-modal__toggle-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: transparent;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.15s;
        }

        .test-modal__toggle-btn.active {
          background: #e8edff;
          border-color: #2c5ef5;
          color: #2c5ef5;
        }

        [data-theme='dark'] .test-modal__toggle-btn.active {
          background: rgba(44, 94, 245, 0.15);
          border-color: #6b8cff;
          color: #6b8cff;
        }

        /* Type buttons */
        .test-modal__types {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .test-modal__type-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid rgba(0, 0, 0, 0.08);
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #4a5568;
          text-align: left;
          transition: all 0.15s;
        }

        [data-theme='dark'] .test-modal__type-btn {
          border-color: rgba(255, 255, 255, 0.08);
          color: #868e96;
        }

        .test-modal__type-btn.active {
          background: #e8edff;
          border-color: #2c5ef5;
          color: #1a1a2e;
        }

        [data-theme='dark'] .test-modal__type-btn.active {
          background: rgba(44, 94, 245, 0.12);
          border-color: #6b8cff;
          color: #e8eaed;
        }

        .test-modal__type-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .test-modal__type-btn.active .test-modal__type-icon {
          background: rgba(44, 94, 245, 0.15);
          color: #2c5ef5;
        }

        .test-modal__type-check {
          margin-left: auto;
          color: #b0b4c4;
          display: flex;
          align-items: center;
        }

        .test-modal__type-check.checked {
          color: #2c5ef5;
        }

        .test-modal__footer {
          padding: 20px 28px 28px;
        }

        .test-modal__start-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: #2c5ef5;
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .test-modal__start-btn:hover {
          background: #1d4fd8;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(44, 94, 245, 0.3);
        }
      `}</style>
    </div>
  );
}

// ─── Question Components ───────────────────────────────────────────────────────
function MultipleChoiceQuestion({ question, options, selected, onSelect, isAnswered }) {
  return (
    <div className="test-question">
      <p className="test-question__label">Chọn đáp án đúng</p>
      <h3 className="test-question__text">{question}</h3>
      <div className="test-question__options">
        {options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrect = isAnswered && opt === options.find((o, idx) => {
            // The correct one is the first option in shuffled context
            return false;
          });
          return (
            <motion.button
              key={i}
              className={`test-question__option ${isSelected ? 'selected' : ''} ${isAnswered && isSelected ? 'answered' : ''}`}
              onClick={() => !isAnswered && onSelect(opt)}
              disabled={isAnswered}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="test-question__option-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TrueFalseQuestion({ question, selected, onSelect, isAnswered }) {
  return (
    <div className="test-question">
      <p className="test-question__label">Đúng hay sai?</p>
      <h3 className="test-question__text">{question}</h3>
      <div className="test-question__tf-btns">
        <button
          className={`test-question__tf-btn ${selected === true ? 'selected' : ''} ${isAnswered && selected === true ? 'answered' : ''}`}
          onClick={() => !isAnswered && onSelect(true)}
          disabled={isAnswered}
        >
          <CheckCircle size={20} />
          Đúng
        </button>
        <button
          className={`test-question__tf-btn ${selected === false ? 'selected' : ''} ${isAnswered && selected === false ? 'answered' : ''}`}
          onClick={() => !isAnswered && onSelect(false)}
          disabled={isAnswered}
        >
          <XCircle size={20} />
          Sai
        </button>
      </div>
    </div>
  );
}

function TypeAnswerQuestion({ question, value, onChange, isAnswered, correctAnswer, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isAnswered && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAnswered]);

  return (
    <div className="test-question">
      <p className="test-question__label">Đáp án của bạn</p>
      <h3 className="test-question__text">{question}</h3>
      <div className="test-question__input-wrap">
        <input
          ref={inputRef}
          type="text"
          className={`test-question__input ${isAnswered ? (value.trim().toLowerCase() === correctAnswer?.trim().toLowerCase() ? 'correct' : 'wrong') : ''}`}
          placeholder="Nhập đáp án..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isAnswered && onSubmit()}
          disabled={isAnswered}
          autoComplete="off"
        />
        {!isAnswered && (
          <button
            className="test-question__submit-btn"
            onClick={onSubmit}
            disabled={!value.trim()}
          >
            Kiểm tra
          </button>
        )}
      </div>
      {isAnswered && value.trim().toLowerCase() !== correctAnswer?.trim().toLowerCase() && (
        <div className="test-question__correct-hint">
          <CheckCircle size={14} color="#10b981" />
          Đáp án đúng: <strong>{correctAnswer}</strong>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TestMode({ cards = [], setTitle = '', onClose, onComplete }) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: answer }
  const [isAnswered, setIsAnswered] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [cardResults, setCardResults] = useState({}); // { cardId: { total: 0, correct: 0, questions: [] } }
  const [isUpdating, setIsUpdating] = useState(false);

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleStart = ({ questionCount, answerWith, types }) => {
    // questionCount = number of cards to study
    const shuffled = [...cards].sort(() => Math.random() - 0.5).slice(0, questionCount);
    const built = [];

    // Initialize card results tracker
    const initialCardResults = {};
    shuffled.forEach(card => {
      initialCardResults[card.id] = { total: 0, correct: 0, questions: [] };
    });
    setCardResults(initialCardResults);

    shuffled.forEach((card, idx) => {
      const useTerm = answerWith === 'term' || answerWith === 'both';
      const useDef = answerWith === 'definition' || answerWith === 'both';

      if (useTerm && types.includes('multipleChoice')) {
        const others = cards.filter((c) => c.id !== card.id).map((c) => c.front).sort(() => Math.random() - 0.5).slice(0, 3);
        built.push({
          id: `${idx}-term-mc`,
          cardId: card.id,
          type: 'multipleChoice',
          question: card.front,
          answer: card.back,
          options: [...others, card.back].sort(() => Math.random() - 0.5),
          isTerm: true,
        });
      }

      if (useDef && types.includes('multipleChoice')) {
        const others = cards.filter((c) => c.id !== card.id).map((c) => c.back).sort(() => Math.random() - 0.5).slice(0, 3);
        built.push({
          id: `${idx}-def-mc`,
          cardId: card.id,
          type: 'multipleChoice',
          question: card.back,
          answer: card.front,
          options: [...others, card.front].sort(() => Math.random() - 0.5),
          isTerm: false,
        });
      }

      if (useTerm && types.includes('trueFalse')) {
        built.push({
          id: `${idx}-term-tf`,
          cardId: card.id,
          type: 'trueFalse',
          question: `"${card.back}" là định nghĩa của "${card.front}"?`,
          answer: true,
        });
      }

      if (useDef && types.includes('typeAnswer')) {
        built.push({
          id: `${idx}-def-type`,
          cardId: card.id,
          type: 'typeAnswer',
          question: card.front,
          answer: card.back,
          isTerm: true,
        });
      }
    });

    // Take from each card in round-robin (no slice limit - use all questions)
    const groupedByCard = {};
    built.forEach(q => {
      if (!groupedByCard[q.cardId]) {
        groupedByCard[q.cardId] = [];
      }
      groupedByCard[q.cardId].push(q);
    });

    // Round-robin through all cards
    const final = [];
    let cardIds = Object.keys(groupedByCard);
    let idx2 = 0;
    const maxIterations = built.length + 10;
    let iterations = 0;
    while (cardIds.length > 0 && iterations < maxIterations) {
      const cardId = cardIds[idx2 % cardIds.length];
      const cardQuestions = groupedByCard[cardId];
      if (cardQuestions.length > 0) {
        final.push(cardQuestions.shift());
      }
      if (cardQuestions.length === 0) {
        delete groupedByCard[cardId];
        cardIds = Object.keys(groupedByCard);
        // Don't decrement idx2, just continue
      }
      idx2++;
      iterations++;
    }

    setQuestions(final);
    setStarted(true);
  };

  const handleAnswerSelect = (answer) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
    setIsAnswered(true);

    // Track result for this card
    const question = questions[currentIndex];
    if (question?.cardId) {
      const isCorrect = checkAnswerCorrect(question, answer);
      setCardResults(prev => ({
        ...prev,
        [question.cardId]: {
          ...prev[question.cardId],
          total: (prev[question.cardId]?.total || 0) + 1,
          correct: (prev[question.cardId]?.correct || 0) + (isCorrect ? 1 : 0),
          questions: [...(prev[question.cardId]?.questions || []), { qId: question.id, isCorrect }],
        },
      }));
    }
  };

  // Helper to check if answer is correct
  const checkAnswerCorrect = (question, answer) => {
    if (question.type === 'multipleChoice') return answer === question.answer;
    if (question.type === 'trueFalse') return answer === question.answer;
    if (question.type === 'typeAnswer') return answer?.trim().toLowerCase() === question.answer?.trim().toLowerCase();
    return false;
  };

  // Calculate quality based on average correct rate
  const calculateQuality = (total, correct) => {
    if (total === 0) return 2; // Default to Good if no questions
    const ratio = correct / total;
    if (ratio === 1) return 3; // Easy - all correct
    if (ratio >= 0.5) return 2; // Good - at least half correct
    return 0; // Again - less than half correct
  };

  // Update SM-2 for all cards after test completes
  const updateAllCardProgress = async () => {
    if (Object.keys(cardResults).length === 0) return;

    setIsUpdating(true);
    const updatePromises = Object.entries(cardResults).map(([cardId, result]) => {
      const quality = calculateQuality(result.total, result.correct);
      console.log(`[TestMode] Updating card ${cardId}: quality=${quality} (${result.correct}/${result.total})`);
      return progressService.updateCardProgress(cardId, quality).catch(err => {
        console.error(`[TestMode] Failed to update card ${cardId}:`, err);
      });
    });

    await Promise.all(updatePromises);
    setIsUpdating(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((v) => v + 1);
      setIsAnswered(false);
    } else {
      // Update SM-2 progress for all cards before showing results
      updateAllCardProgress();
      setAllDone(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((v) => v - 1);
      setIsAnswered(answers[currentIndex - 1] !== undefined);
    }
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

  // Results
  if (allDone) {
    const correct = questions.reduce((acc, q, i) => {
      const userAnswer = answers[i];
      if (q.type === 'multipleChoice') return acc + (userAnswer === q.answer ? 1 : 0);
      if (q.type === 'trueFalse') return acc + (userAnswer === q.answer ? 1 : 0);
      if (q.type === 'typeAnswer') return acc + (userAnswer?.trim().toLowerCase() === q.answer?.trim().toLowerCase() ? 1 : 0);
      return acc;
    }, 0);
    const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    // Build card results summary
    const cardSummary = Object.entries(cardResults).map(([cardId, result]) => {
      const card = cards.find(c => c.id === cardId);
      const quality = calculateQuality(result.total, result.correct);
      const qualityLabel = quality === 3 ? 'Easy' : quality === 2 ? 'Good' : 'Again';
      return {
        cardId,
        front: card?.front || 'Unknown',
        total: result.total,
        correct: result.correct,
        quality,
        qualityLabel,
      };
    });

    return (
      <div className="study-mode-wrap">
        <StudyHeader
          mode="test"
          setTitle={setTitle}
          currentCard={questions.length}
          totalCards={questions.length}
          progress
          onClose={onClose}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreen}
        />
        <div className="test-results">
          <motion.div
            className="test-results__card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Updating indicator */}
            {isUpdating && (
              <div className="test-results__updating">
                <div className="test-results__updating-spinner" />
                <span>Đang cập nhật tiến độ học...</span>
              </div>
            )}

            <div className="test-results__score-wrap">
              <div className="test-results__score-ring">
                <svg viewBox="0 0 100 100" className="test-results__ring-svg">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e8eaf0" strokeWidth="8" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="#2c5ef5" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${accuracy * 2.64} 264`}
                    initial={{ strokeDasharray: `0 264` }}
                    animate={{ strokeDasharray: `${accuracy * 2.64} 264` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                <span className="test-results__score-num">{accuracy}%</span>
              </div>
            </div>
            <h2 className="test-results__title">
              {accuracy >= 80 ? 'Xuất sắc!' : accuracy >= 50 ? 'Khá tốt!' : 'Cần cố gắng thêm!'}
            </h2>
            <p className="test-results__subtitle">
              Bạn trả lời đúng {correct} trên {questions.length} câu
            </p>

            {/* Stats Summary */}
            <div className="test-results__stats">
              <div className="test-results__stat correct">
                <span className="test-results__stat-num">{correct}</span>
                <span className="test-results__stat-label">Đúng</span>
              </div>
              <div className="test-results__stat wrong">
                <span className="test-results__stat-num">{questions.length - correct}</span>
                <span className="test-results__stat-label">Sai</span>
              </div>
              <div className="test-results__stat total">
                <span className="test-results__stat-num">{questions.length}</span>
                <span className="test-results__stat-label">Tổng</span>
              </div>
            </div>

            {/* Card progress summary */}
            <div className="test-results__card-summary">
              <h3 className="test-results__section-title">Tiến độ theo thẻ (SM-2)</h3>
              <div className="test-results__cards-list">
                {cardSummary.map((summary, idx) => (
                  <div key={summary.cardId} className={`test-results__card-item quality-${summary.qualityLabel.toLowerCase()}`}>
                    <div className="test-results__card-info">
                      <span className="test-results__card-front">{summary.front}</span>
                      <span className="test-results__card-score">{summary.correct}/{summary.total} câu</span>
                    </div>
                    <div className={`test-results__card-quality quality-${summary.qualityLabel.toLowerCase()}`}>
                      {summary.qualityLabel === 'Easy' && <span className="quality-badge easy">Dễ</span>}
                      {summary.qualityLabel === 'Good' && <span className="quality-badge good">Khá</span>}
                      {summary.qualityLabel === 'Again' && <span className="quality-badge again">Học lại</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="test-results__breakdown">
              <h3 className="test-results__section-title">Chi tiết câu hỏi</h3>
              {questions.map((q, i) => {
                const userAnswer = answers[i];
                let isCorrect = false;
                if (q.type === 'multipleChoice') isCorrect = userAnswer === q.answer;
                else if (q.type === 'trueFalse') isCorrect = userAnswer === q.answer;
                else if (q.type === 'typeAnswer') isCorrect = userAnswer?.trim().toLowerCase() === q.answer?.trim().toLowerCase();
                return (
                  <div key={q.id} className={`test-results__item ${isCorrect ? 'correct' : 'wrong'}`}>
                    {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span className="test-results__item-q">{q.question}</span>
                  </div>
                );
              })}
            </div>
            <div className="test-results__actions">
              <button className="btn-glassline-primary" onClick={() => {
                setStarted(false);
                setQuestions([]);
                setAnswers({});
                setCurrentIndex(0);
                setAllDone(false);
                setIsAnswered(false);
                setCardResults({});
              }}>
                Làm lại
              </button>
              <button className="test-results__btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
        <style>{`
          .test-results__updating {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px 16px;
            background: rgba(44, 94, 245, 0.08);
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 0.875rem;
            color: #2c5ef5;
            font-weight: 500;
          }
          .test-results__updating-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(44, 94, 245, 0.2);
            border-top-color: #2c5ef5;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .test-results__stats {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 24px;
          }
          .test-results__stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 16px 24px;
            border-radius: 16px;
            min-width: 80px;
          }
          .test-results__stat.correct {
            background: rgba(16, 185, 129, 0.1);
          }
          .test-results__stat.wrong {
            background: rgba(239, 68, 68, 0.1);
          }
          .test-results__stat.total {
            background: rgba(44, 94, 245, 0.1);
          }
          .test-results__stat-num {
            font-size: 1.75rem;
            font-weight: 700;
            line-height: 1;
          }
          .test-results__stat.correct .test-results__stat-num { color: #10b981; }
          .test-results__stat.wrong .test-results__stat-num { color: #ef4444; }
          .test-results__stat.total .test-results__stat-num { color: #2c5ef5; }
          .test-results__stat-label {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #8a8fa8;
          }
          .test-results__card-summary {
            margin-bottom: 20px;
            text-align: left;
          }
          .test-results__section-title {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #8a8fa8;
            margin: 0 0 12px;
          }
          .test-results__cards-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 160px;
            overflow-y: auto;
          }
          .test-results__card-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            border-radius: 10px;
            background: #f8f9fc;
            border-left: 3px solid;
          }
          [data-theme='dark'] .test-results__card-item {
            background: #1e2332;
          }
          .test-results__card-item.quality-easy {
            border-left-color: #10b981;
          }
          .test-results__card-item.quality-good {
            border-left-color: #f59e0b;
          }
          .test-results__card-item.quality-again {
            border-left-color: #ef4444;
          }
          .test-results__card-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
            min-width: 0;
          }
          .test-results__card-front {
            font-size: 0.875rem;
            font-weight: 500;
            color: #1a1a2e;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          [data-theme='dark'] .test-results__card-front {
            color: #e8eaed;
          }
          .test-results__card-score {
            font-size: 0.75rem;
            color: #8a8fa8;
          }
          .test-results__card-quality {
            flex-shrink: 0;
          }
          .quality-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
          }
          .quality-badge.easy {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
          }
          .quality-badge.good {
            background: rgba(245, 158, 11, 0.12);
            color: #f59e0b;
          }
          .quality-badge.again {
            background: rgba(239, 68, 68, 0.12);
            color: #ef4444;
          }
          .test-results {
            flex: 1;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 32px 16px;
            background: #f6f7fb;
            overflow-y: auto;
          }
          [data-theme='dark'] .test-results { background: #0b0e12; }
          .test-results__card {
            background: #fff;
            border-radius: 28px;
            padding: 40px 36px;
            max-width: 520px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          [data-theme='dark'] .test-results__card {
            background: #151922;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
          }
          .test-results__score-wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .test-results__score-ring {
            position: relative;
            width: 120px;
            height: 120px;
          }
          .test-results__ring-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
          }
          .test-results__score-num {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: 700;
            color: #2c5ef5;
          }
          .test-results__title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a1a2e;
            margin: 0 0 8px;
          }
          [data-theme='dark'] .test-results__title { color: #e8eaed; }
          .test-results__subtitle {
            font-size: 0.95rem;
            color: #8a8fa8;
            margin: 0 0 24px;
          }
          .test-results__breakdown {
            text-align: left;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .test-results__item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.875rem;
          }
          .test-results__item.correct {
            background: rgba(16,185,129,0.08);
            color: #059669;
          }
          .test-results__item.wrong {
            background: rgba(239,68,68,0.08);
            color: #dc2626;
          }
          .test-results__item svg { flex-shrink: 0; margin-top: 2px; }
          .test-results__item-q {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .test-results__actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .test-results__btn-secondary {
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
          [data-theme='dark'] .test-results__btn-secondary {
            border-color: rgba(255,255,255,0.12);
            color: #868e96;
          }
          .test-results__btn-secondary:hover { background: #f0f1f6; }
        `}</style>
      </div>
    );
  }

  // Setup modal
  if (!started) {
    return (
      <div className="study-mode-wrap">
        <StudyHeader
          mode="test"
          setTitle={setTitle}
          currentCard={0}
          totalCards={0}
          progress={false}
          onClose={onClose}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreen}
        />
        <div className="test-mode">
          <AnimatePresence>
            <SetupModal
              cards={cards}
              onStart={handleStart}
              onClose={onClose}
            />
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Test screen
  return (
    <div className="study-mode-wrap">
      <StudyHeader
        mode="test"
        setTitle={setTitle}
        currentCard={currentIndex + 1}
        totalCards={questions.length}
        progress
        onClose={onClose}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((v) => !v)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={handleFullscreen}
      />

      <div className="test-mode">
        <div className="test-mode__container">
          {/* Progress */}
          <div className="test-mode__progress-info">
            <span className="test-mode__progress-label">
              Câu {currentIndex + 1} / {questions.length}
            </span>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="test-mode__question-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {currentQ?.type === 'multipleChoice' && (
                <MultipleChoiceQuestion
                  question={currentQ.question}
                  options={currentQ.options}
                  selected={answers[currentIndex]}
                  onSelect={handleAnswerSelect}
                  isAnswered={isAnswered}
                />
              )}

              {currentQ?.type === 'trueFalse' && (
                <TrueFalseQuestion
                  question={currentQ.question}
                  selected={answers[currentIndex]}
                  onSelect={handleAnswerSelect}
                  isAnswered={isAnswered}
                />
              )}

              {currentQ?.type === 'typeAnswer' && (
                <TypeAnswerQuestion
                  question={currentQ.question}
                  value={answers[currentIndex] || ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [currentIndex]: v }))}
                  isAnswered={isAnswered}
                  correctAnswer={currentQ.answer}
                  onSubmit={handleAnswerSelect}
                />
              )}

              {/* Feedback */}
              {isAnswered && currentQ?.type !== 'typeAnswer' && (
                <motion.div
                  className={`test-mode__feedback ${answers[currentIndex] === currentQ.answer ? 'correct' : 'wrong'}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  {answers[currentIndex] === currentQ.answer ? (
                    <><CheckCircle size={16} /> Đúng!</>
                  ) : (
                    <><XCircle size={16} /> Sai. Đáp án đúng: {currentQ.answer}</>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="test-mode__nav">
            <button
              className="test-mode__nav-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={20} />
              <span>Trước</span>
            </button>

            <div className="test-mode__dots">
              {questions.map((_, i) => (
                <button
                  key={i}
                  className={`test-mode__dot ${i === currentIndex ? 'active' : ''} ${answers[i] !== undefined ? 'answered' : ''}`}
                  onClick={() => {
                    setCurrentIndex(i);
                    setIsAnswered(answers[i] !== undefined);
                  }}
                />
              ))}
            </div>

            <button
              className="test-mode__nav-btn test-mode__nav-btn--next"
              onClick={handleNext}
            >
              <span>{currentIndex === questions.length - 1 ? 'Xong' : 'Tiếp'}</span>
              <ChevronRight size={20} />
            </button>
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

        .test-mode {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px 16px 32px;
        }

        .test-mode__container {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .test-mode__progress-info {
          display: flex;
          justify-content: center;
        }

        .test-mode__progress-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #8a8fa8;
        }

        /* Question card */
        .test-mode__question-card {
          background: #fff;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        [data-theme='dark'] .test-mode__question-card {
          background: #151922;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        /* Question styles */
        .test-question__label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a8fa8;
          margin: 0 0 12px;
        }

        .test-question__text {
          font-size: clamp(1.1rem, 2.5vw, 1.5rem);
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 24px;
          line-height: 1.3;
        }
        [data-theme='dark'] .test-question__text { color: #e8eaed; }

        /* Multiple choice options */
        .test-question__options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .test-question__option {
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
        [data-theme='dark'] .test-question__option {
          background: #1e2332;
          color: #e8eaed;
        }
        .test-question__option:hover:not(:disabled) {
          background: #eef0f7;
          border-color: #c7d0f0;
        }
        [data-theme='dark'] .test-question__option:hover:not(:disabled) {
          background: #252c3f;
          border-color: rgba(44,94,245,0.3);
        }
        .test-question__option:disabled { cursor: default; }
        .test-question__option.selected {
          border-color: #2c5ef5;
          background: #e8edff;
        }
        .test-question__option.answered {
          border-color: #10b981;
          background: rgba(16,185,129,0.08);
          color: #059669;
        }

        .test-question__option-letter {
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

        .test-question__option.answered .test-question__option-letter {
          background: rgba(16,185,129,0.15);
          color: #10b981;
        }

        /* True/False */
        .test-question__tf-btns {
          display: flex;
          gap: 12px;
        }

        .test-question__tf-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          border-radius: 14px;
          border: 2px solid rgba(0,0,0,0.1);
          background: #f8f9fc;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 700;
          color: #4a5568;
          transition: all 0.15s;
        }
        [data-theme='dark'] .test-question__tf-btn {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .test-question__tf-btn:hover:not(:disabled) {
          border-color: #c7d0f0;
          background: #eef0f7;
        }
        [data-theme='dark'] .test-question__tf-btn:hover:not(:disabled) {
          background: #252c3f;
          border-color: rgba(44,94,245,0.3);
        }
        .test-question__tf-btn:disabled { cursor: default; }
        .test-question__tf-btn.selected {
          border-color: #2c5ef5;
          background: #e8edff;
          color: #2c5ef5;
        }
        .test-question__tf-btn.answered {
          border-color: #10b981;
          background: rgba(16,185,129,0.08);
          color: #10b981;
        }

        /* Type answer */
        .test-question__input-wrap {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .test-question__input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 500;
          color: #1a1a2e;
          background: #f8f9fc;
          outline: none;
          transition: all 0.15s;
        }
        [data-theme='dark'] .test-question__input {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #e8eaed;
        }
        .test-question__input:focus {
          border-color: #2c5ef5;
          box-shadow: 0 0 0 3px rgba(44,94,245,0.1);
        }
        .test-question__input.correct {
          border-color: #10b981;
          background: rgba(16,185,129,0.05);
        }
        .test-question__input.wrong {
          border-color: #ef4444;
          background: rgba(239,68,68,0.05);
        }

        .test-question__submit-btn {
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          background: #2c5ef5;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .test-question__submit-btn:hover:not(:disabled) { background: #1d4fd8; }
        .test-question__submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .test-question__correct-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 10px 14px;
          background: rgba(16,185,129,0.08);
          border-radius: 10px;
          font-size: 0.875rem;
          color: #059669;
        }
        .test-question__correct-hint strong { color: #10b981; }

        /* Feedback */
        .test-mode__feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          margin-top: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .test-mode__feedback.correct {
          background: rgba(16,185,129,0.08);
          color: #059669;
        }
        .test-mode__feedback.wrong {
          background: rgba(239,68,68,0.08);
          color: #dc2626;
        }

        /* Navigation */
        .test-mode__nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .test-mode__nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: #fff;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        [data-theme='dark'] .test-mode__nav-btn {
          background: #1e2332;
          border-color: rgba(255,255,255,0.1);
          color: #868e96;
        }
        .test-mode__nav-btn:hover:not(:disabled) {
          background: #f0f1f6;
        }
        .test-mode__nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .test-mode__nav-btn--next {
          background: #2c5ef5;
          border-color: #2c5ef5;
          color: #fff;
        }
        .test-mode__nav-btn--next:hover { background: #1d4fd8; border-color: #1d4fd8; }

        .test-mode__dots {
          display: flex;
          gap: 4px;
          flex: 1;
          justify-content: center;
          flex-wrap: wrap;
        }

        .test-mode__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: #e8eaf0;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }
        .test-mode__dot.answered { background: #c7d0f0; }
        .test-mode__dot.active {
          width: 20px;
          border-radius: 4px;
          background: #2c5ef5;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .test-mode {
            padding: 16px 12px 24px;
          }
          .test-mode__question-card {
            padding: 24px 20px;
            border-radius: 20px;
          }
          .test-question__tf-btns { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
