import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, ClipboardCheck, X, Volume2, Maximize2, Minimize2,
  ArrowLeft, FileText, ChevronDown, Check, BookOpen, Brain, Box
} from 'lucide-react';
import { progressService } from '../../services/progressService';
import { gamificationService } from '../../api/gamificationService';
import { useGamification } from '../../context/GamificationContext';
import { toast } from 'react-hot-toast';

// Study modes for dropdown selector
const MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

// Vocabulary fallback list used for distractors if the card set is too small (< 4 cards)
const FALLBACK_VOCAB = [
  'apple', 'banana', 'orange', 'table', 'chair', 'house', 'car', 'book', 'pen', 'school',
  'teacher', 'student', 'water', 'bread', 'food', 'friend', 'family', 'time', 'year', 'day',
  'work', 'life', 'world', 'hand', 'eye', 'head', 'face', 'body', 'heart', 'mother',
  'father', 'brother', 'sister', 'son', 'daughter', 'baby', 'dog', 'cat', 'bird', 'fish'
];

// Helper to normalize written answers
const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?]$/, '');
};

// ─── Test Header ─────────────────────────────────────────────────────────────
function TestHeader({ setTitle, onClose, onModeChange, soundEnabled, onSoundToggle, isFullscreen, onFullscreen }) {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const currentModeConfig = MODES.find((m) => m.id === 'test') || MODES[2];
  const CurrentIcon = currentModeConfig.icon;

  return (
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
                    className={`study-header__mode-item ${mId === 'test' ? 'active' : ''}`}
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
        <span className="ql2-header__title">{setTitle || 'Kiểm tra'}</span>
      </div>

      <div className="ql2-header__right">
        <button
          className={`ql2-header__btn ${soundEnabled ? 'active' : ''}`}
          onClick={onSoundToggle}
          title="Phát âm thanh"
        >
          <Volume2 size={18} />
        </button>
        <button
          className="ql2-header__btn"
          onClick={onFullscreen}
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {modeDropdownOpen && (
        <div className="study-header__backdrop" onClick={() => setModeDropdownOpen(false)} />
      )}
    </header>
  );
}

// ─── Setup Modal (Ảnh 1) ──────────────────────────────────────────────────────
function SetupModal({ cards, onStart, onClose }) {
  const starredCount = cards.filter(c => c.isStarred).length;
  
  const [starOnly, setStarOnly] = useState(false);
  const [types, setTypes] = useState({
    trueFalse: true,
    multipleChoice: true,
    typeAnswer: true,
  });

  // Available question count based on current starOnly toggle
  const availableCount = starOnly ? starredCount : cards.length;
  const maxQuestions = availableCount;
  const canStart = availableCount > 0;

  // States
  const [questionCount, setQuestionCount] = useState(() => {
    return Math.min(20, cards.length);
  });

  const toggleType = (key) => {
    const newTypes = { ...types, [key]: !types[key] };
    const activeCount = Object.values(newTypes).filter(Boolean).length;
    if (activeCount === 0) {
      toast.error('Vui lòng chọn ít nhất một loại câu hỏi!');
      return;
    }
    setTypes(newTypes);
  };

  const handleStarToggle = () => {
    if (!starOnly && starredCount === 0) {
      toast.error('Không có thẻ gắn sao nào trong bộ này!');
      return;
    }
    setStarOnly(!starOnly);
  };

  const handleStartTest = () => {
    const numCount = parseInt(questionCount, 10);
    if (isNaN(numCount) || numCount < 1) {
      toast.error('Số lượng câu hỏi không hợp lệ!');
      return;
    }
    if (!canStart || numCount > maxQuestions) {
      toast.error('Không thể tạo bài kiểm tra với cấu hình này!');
      return;
    }
    onStart({ questionCount: numCount, starOnly, types });
  };

  // Clamp the questionCount value when toggle changes without converting empty string input to 20
  useEffect(() => {
    setQuestionCount(prev => {
      if (prev === '') return '';
      if (maxQuestions === 0) return 0;
      return Math.min(Number(prev), maxQuestions);
    });
  }, [starOnly, maxQuestions]);

  return (
    <div className="ql-setup-modal-overlay">
      <motion.div
        className="ql-setup-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div className="ql-setup-modal__header">
          <h2 className="ql-setup-modal__title">Tùy chọn</h2>
          <button className="ql-setup-modal__close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="ql-setup-modal__body">
          {/* Question count input */}
          <div className="ql-setup-row">
            <div className="ql-setup-row__label">
              <span>Câu hỏi</span>
              <span className="ql-setup-row__subtext">{`(tối đa ${maxQuestions})`}</span>
            </div>
            <div className="ql-setup-row__control">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={questionCount}
                disabled={maxQuestions === 0}
                onChange={(e) => {
                  if (maxQuestions === 0) {
                    setQuestionCount(0);
                    return;
                  }
                  const rawVal = e.target.value;
                  if (rawVal === '') {
                    setQuestionCount('');
                    return;
                  }
                  // Strict cleaning: Strip non-digit characters
                  const cleanVal = rawVal.replace(/\D/g, '');
                  if (cleanVal === '') {
                    setQuestionCount('');
                    return;
                  }
                  const val = parseInt(cleanVal, 10);
                  setQuestionCount(Math.min(maxQuestions, Math.max(1, val)));
                }}
                className="ql-setup-input-num"
              />
            </div>
          </div>

          {/* Cảnh báo bài kiểm tra dài */}
          {maxQuestions > 100 && Number(questionCount) > 100 && (
            <div className="ql-setup-warning-text" style={{ fontSize: '0.85rem', color: '#f59e0b', marginTop: '-10px', marginBottom: '8px', paddingLeft: '4px' }}>
              ⚠️ Bài kiểm tra dài có thể mất nhiều thời gian thực hiện.
            </div>
          )}

          {/* Cảnh báo rỗng không có thẻ khả dụng */}
          {availableCount === 0 && (
            <div className="ql-setup-error-text" style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '-10px', marginBottom: '8px', paddingLeft: '4px' }}>
              ⚠️ Không có thẻ khả dụng để làm bài kiểm tra.
            </div>
          )}

          {/* Divider */}
          <hr className="ql-setup-divider" />

          {/* Toggles for question types (No Ghép thẻ since it is not generated) */}
          <div className="ql-setup-row">
            <span className="ql-setup-row__label">Đúng/Sai</span>
            <div className="ql-setup-row__control">
              <label className="ql-switch">
                <input
                  type="checkbox"
                  checked={types.trueFalse}
                  onChange={() => toggleType('trueFalse')}
                />
                <span className="ql-slider" />
              </label>
            </div>
          </div>

          <div className="ql-setup-row">
            <span className="ql-setup-row__label">Trắc nghiệm</span>
            <div className="ql-setup-row__control">
              <label className="ql-switch">
                <input
                  type="checkbox"
                  checked={types.multipleChoice}
                  onChange={() => toggleType('multipleChoice')}
                />
                <span className="ql-slider" />
              </label>
            </div>
          </div>

          <div className="ql-setup-row">
            <span className="ql-setup-row__label">Tự luận</span>
            <div className="ql-setup-row__control">
              <label className="ql-switch">
                <input
                  type="checkbox"
                  checked={types.typeAnswer}
                  onChange={() => toggleType('typeAnswer')}
                />
                <span className="ql-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ql-setup-modal__footer">
          <button 
            className="ql-setup-btn-start" 
            onClick={handleStartTest}
            disabled={!canStart}
            style={!canStart ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Tạo bài kiểm tra mới
          </button>
          
          <div className="ql-setup-modal__footer-links" style={{ justifyContent: 'center' }}>
            <button className="ql-setup-btn-cancel" onClick={onClose}>
              Hủy
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TestMode({ cards = [], setTitle = '', onClose, onModeChange }) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [questionId]: { status: 'answered' | 'skipped', value } }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [durationStr, setDurationStr] = useState(''); // Formatted duration
  const [allDone, setAllDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  
  const { triggerRewards } = useGamification();

  // Keep fullscreen state in sync
  useEffect(() => {
    const handleFs = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // TTS speaker
  const speakWord = (text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Focus and scroll to the next question card relatively
  const handleWrittenNext = (e) => {
    const box = e.currentTarget.closest('.ql-question-card');
    if (!box) return;
    const cardsList = Array.from(document.querySelectorAll('.ql-question-card'));
    const currentCardIdx = cardsList.indexOf(box);
    const nextCard = cardsList[currentCardIdx + 1];
    if (nextCard) {
      nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const nextInput = nextCard.querySelector('.ql-question-input');
      if (nextInput) {
        // Focus the input only if the next question card is a typeAnswer card
        setTimeout(() => nextInput.focus(), 150);
      }
    }
  };

  // Fullscreen support toggler
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  // Generator
  const handleStart = ({ questionCount, starOnly, types }) => {
    let eligibleCards = starOnly ? cards.filter(c => c.isStarred) : [...cards];
    
    if (eligibleCards.length === 0) {
      toast.error('Bộ thẻ rỗng hoặc không có thẻ gắn sao nào!');
      return;
    }

    const activeTypes = Object.entries(types)
      .filter(([k, v]) => v)
      .map(([k]) => k);

    if (activeTypes.length === 0) {
      toast.error('Vui lòng chọn ít nhất một loại câu hỏi!');
      return;
    }

    const generated = [];
    let questionIndex = 0;

    // Round-robin selection of cards and active types
    while (generated.length < questionCount) {
      const card = eligibleCards[questionIndex % eligibleCards.length];
      const type = activeTypes[questionIndex % activeTypes.length];
      const qId = `q_${questionIndex}_${card.id}`;

      if (type === 'trueFalse') {
        const isTrue = Math.random() < 0.5;
        let termToShow = card.front;

        if (!isTrue) {
          // Priority 1: distractor from the same card set (including unstarred cards)
          const otherCards = cards.filter(c => c.id !== card.id);
          if (otherCards.length > 0) {
            termToShow = otherCards[Math.floor(Math.random() * otherCards.length)].front;
          } else {
            // Priority 2: fallback vocabulary words
            termToShow = FALLBACK_VOCAB[Math.floor(Math.random() * FALLBACK_VOCAB.length)];
          }
        }

        generated.push({
          id: qId,
          cardId: card.id,
          type: 'trueFalse',
          definition: card.back,
          term: termToShow,
          correctAnswer: isTrue, // boolean true/false
        });
      } else if (type === 'multipleChoice') {
        // Priority 1: distractors from current set
        const otherTerms = [...new Set(cards.filter(c => c.id !== card.id).map(c => c.front))];
        
        // Priority 2: fallback list if set is small
        let fallbackIdx = 0;
        while (otherTerms.length < 3) {
          const word = FALLBACK_VOCAB[fallbackIdx % FALLBACK_VOCAB.length];
          if (!otherTerms.includes(word) && word !== card.front) {
            otherTerms.push(word);
          }
          fallbackIdx++;
        }

        const distractors = otherTerms.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [card.front, ...distractors].sort(() => Math.random() - 0.5);

        generated.push({
          id: qId,
          cardId: card.id,
          type: 'multipleChoice',
          definition: card.back,
          options,
          correctAnswer: card.front,
        });
      } else if (type === 'typeAnswer') {
        generated.push({
          id: qId,
          cardId: card.id,
          type: 'typeAnswer',
          definition: card.back,
          correctAnswer: card.front,
        });
      }

      questionIndex++;
    }

    // Shuffle the generated list
    const shuffled = generated.sort(() => Math.random() - 0.5);

    setQuestions(shuffled);
    setAnswers({});
    setStarted(true);
    setStartTime(Date.now());
    setAllDone(false);
  };

  // Submit test and sync SM-2 sequentially using Promise.allSettled
  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor(durationMs / 60000);
    if (minutes > 0) {
      setDurationStr(`${minutes} phút ${seconds} giây`);
    } else {
      setDurationStr(`${seconds} giây`);
    }

    // Calculate unique cards in the test
    const resultsByCard = {};
    const uniqueCardIds = new Set();

    questions.forEach(q => {
      uniqueCardIds.add(q.cardId);
      if (!resultsByCard[q.cardId]) {
        resultsByCard[q.cardId] = { total: 0, correct: 0 };
      }

      resultsByCard[q.cardId].total += 1;

      const answerObj = answers[q.id];
      const isUnanswered = !answerObj || (answerObj.status === 'answered' && (answerObj.value === undefined || answerObj.value === ''));
      const userAnswer = answerObj?.value;

      let isCorrect = false;

      if (!isUnanswered) {
        if (q.type === 'trueFalse') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'multipleChoice') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'typeAnswer') {
          isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
        }
      }

      if (isCorrect) {
        resultsByCard[q.cardId].correct += 1;
      }
    });

    let syncFailed = false;

    // Step 1: Update SM-2 progress sequentially (waiting for allSettled)
    try {
      const updatePromises = Object.entries(resultsByCard).map(([cardId, stats]) => {
        const ratio = stats.correct / stats.total;
        const quality = ratio >= 0.5 ? 4 : 0;
        return progressService.updateCardProgress(cardId, quality);
      });
      const results = await Promise.allSettled(updatePromises);
      const hasFailure = results.some(r => r.status === 'rejected');
      if (hasFailure) {
        syncFailed = true;
      }
    } catch (err) {
      console.error('[TestMode] SM-2 synchronization error:', err);
      syncFailed = true;
    }

    // Calculate total correct
    let totalCorrect = 0;
    questions.forEach(q => {
      const answerObj = answers[q.id];
      const isUnanswered = !answerObj || (answerObj.status === 'answered' && (answerObj.value === undefined || answerObj.value === ''));
      const userAnswer = answerObj?.value;

      let isCorrect = false;
      if (!isUnanswered) {
        if (q.type === 'trueFalse') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'multipleChoice') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'typeAnswer') {
          isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
        }
      }
      if (isCorrect) totalCorrect++;
    });

    const accuracy = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

    // Step 2: Trigger gamification and XP updates
    try {
      const response = await gamificationService.triggerTestComplete({
        accuracy,
        cardsStudied: uniqueCardIds.size
      });
      const data = response.data?.data ?? response.data;
      if (data?.xp || data?.newAchievements?.length > 0) {
        triggerRewards(data);
      }
    } catch (err) {
      console.error('[TestMode] Gamification failed:', err);
      syncFailed = true;
    }

    if (syncFailed) {
      setSyncWarning(true);
      toast.error('Không thể đồng bộ tiến độ lên máy chủ. Kết quả của bạn vẫn hiển thị tạm thời.');
    } else {
      setSyncWarning(false);
    }

    setIsSubmitting(false);
    setAllDone(true);

    // Scroll to top of window and scrollable areas to view the scores immediately
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const container = document.querySelector('.ql-test-body');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  // Pre-calculate score metrics for the Results screen (in top-level scope to avoid inner closures issues)
  let correctCount = 0;
  let incorrectCount = 0;
  let accuracy = 0;
  let scoreMsg = '';

  if (allDone) {
    questions.forEach(q => {
      const answerObj = answers[q.id];
      const isSkipped = answerObj?.status === 'skipped';
      const isUnanswered = !answerObj || (answerObj.status === 'answered' && (answerObj.value === undefined || answerObj.value === ''));
      const userAnswer = answerObj?.value;

      let isCorrect = false;
      if (!isSkipped && !isUnanswered) {
        if (q.type === 'trueFalse') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'multipleChoice') {
          isCorrect = userAnswer === q.correctAnswer;
        } else if (q.type === 'typeAnswer') {
          isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
        }
      }
      if (isCorrect) correctCount++;
    });

    incorrectCount = questions.length - correctCount;
    accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    scoreMsg = accuracy >= 80 
      ? 'Tuyệt vời! Kết quả học tập rất xuất sắc.'
      : accuracy >= 50 
      ? 'Khá tốt! Hãy tiếp tục phát huy nhé.' 
      : 'Hãy đối tốt với bản thân, và tiếp tục ôn luyện!';
  }

  return (
    <div className="ql-test-wrap">
      <TestHeader
        setTitle={setTitle}
        onClose={onClose}
        onModeChange={onModeChange}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        isFullscreen={isFullscreen}
        onFullscreen={handleFullscreen}
      />

      {/* Main conditional views inside the single return block to ensure <style> is always loaded */}
      {cards.length === 0 ? (
        <div className="ql-test-body">
          <div className="ql-setup-modal" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Bộ thẻ ghi nhớ rỗng!</h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.5 }}>Vui lòng thêm các thuật ngữ vào bộ thẻ trước khi thực hiện bài kiểm tra.</p>
            <button className="ql-btn-redo" style={{ width: '100%', maxWidth: '160px', marginTop: '12px' }} onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      ) : !started ? (
        <div className="ql-test-body">
          <SetupModal
            cards={cards}
            onClose={onClose}
            onStart={handleStart}
          />
        </div>
      ) : allDone ? (
        <div className="ql-test-body results-mode">
          <div className="ql-results-container">
            {syncWarning && (
              <div className="ql-sync-banner">
                <span>⚠️ Không thể đồng bộ tiến độ lên máy chủ. Kết quả của bạn vẫn hiển thị tạm thời.</span>
              </div>
            )}

            {/* Motivational message */}
            <h1 className="ql-results-msg">{scoreMsg}</h1>
            <p className="ql-results-duration">Thời gian của bạn: {durationStr}</p>

            {/* Ring charts and score pills */}
            <div className="ql-results-score-row">
              <div className="ql-results-circle-progress">
                <svg className="ql-results-svg" viewBox="0 0 100 100">
                  <circle className="ql-results-svg-bg" cx="50" cy="50" r="40" />
                  <circle
                    className="ql-results-svg-fill"
                    cx="50" cy="50" r="40"
                    strokeDasharray={`${accuracy * 2.51} 251`}
                  />
                </svg>
                <span className="ql-results-pct">{accuracy}%</span>
              </div>

              <div className="ql-results-stats-pills">
                <div className="ql-stat-pill correct">
                  <span className="ql-stat-pill__label">Đúng</span>
                  <span className="ql-stat-pill__count">{correctCount}</span>
                </div>
                <div className="ql-stat-pill wrong">
                  <span className="ql-stat-pill__label">Sai</span>
                  <span className="ql-stat-pill__count">{incorrectCount}</span>
                </div>
              </div>
            </div>

            {/* Review Section */}
            <div className="ql-review-section">
              <h2 className="ql-review-section__title">Đáp án của bạn</h2>

              <div className="ql-review-list">
                {questions.map((q, idx) => {
                  const answerObj = answers[q.id];
                  const isUnanswered = !answerObj || (answerObj.status === 'answered' && (answerObj.value === undefined || answerObj.value === ''));
                  const userAnswer = answerObj?.value;

                  let isCorrect = false;
                  if (!isUnanswered) {
                    if (q.type === 'trueFalse') {
                      isCorrect = userAnswer === q.correctAnswer;
                    } else if (q.type === 'multipleChoice') {
                      isCorrect = userAnswer === q.correctAnswer;
                    } else if (q.type === 'typeAnswer') {
                      isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
                    }
                  }

                  return (
                    <div key={q.id} className="ql-review-card">
                      {/* Top labels */}
                      {q.type !== 'trueFalse' && (
                        <div className="ql-card-header">
                          <div className="ql-card-meta">
                            <p className="ql-meta-definition">{q.definition}</p>
                          </div>
                          <span className="ql-card-index">{idx + 1}/{questions.length}</span>
                        </div>
                      )}

                      {/* Question Specific details */}
                      {q.type === 'trueFalse' && (
                        <div className="ql-card-body-tf">
                          <div className="ql-tf-cols">
                            <div className="ql-tf-col">
                              <div className="ql-tf-col-header">
                                <span className="ql-tf-col-label">Định nghĩa</span>
                              </div>
                              <p className="ql-tf-col-text">{q.definition}</p>
                            </div>
                            
                            <div className="ql-tf-col">
                              <div className="ql-tf-col-header">
                                <span className="ql-tf-col-label">Thuật ngữ</span>
                                <button className="ql-tf-sound-btn" onClick={() => speakWord(q.term)}>
                                  <Volume2 size={14} />
                                </button>
                                <span className="ql-tf-col-index">{idx + 1}/{questions.length}</span>
                              </div>
                              <p className="ql-tf-col-text">{q.term}</p>
                            </div>
                          </div>

                          {!isCorrect && (
                            <span className="ql-section-label">Thử lại câu hỏi này sau!</span>
                          )}

                          <div className="ql-tf-bottom-section">
                            <div className="ql-tf-options-group">
                              <button
                                className={`ql-tf-choice-btn ${
                                  q.correctAnswer === true ? 'selected-correct' : (userAnswer === true && !isCorrect ? 'selected-wrong' : '')
                                }`}
                                disabled
                              >
                                {q.correctAnswer === true ? (
                                  <span className="ql-choice-badge correct"><Check size={12} strokeWidth={3} /></span>
                                ) : (userAnswer === true && !isCorrect) ? (
                                  <span className="ql-choice-badge wrong"><X size={12} strokeWidth={3} /></span>
                                ) : null}
                                <span className="ql-choice-text">Đúng</span>
                              </button>
                              <button
                                className={`ql-tf-choice-btn ${
                                  q.correctAnswer === false ? 'selected-correct' : (userAnswer === false && !isCorrect ? 'selected-wrong' : '')
                                }`}
                                disabled
                              >
                                {q.correctAnswer === false ? (
                                  <span className="ql-choice-badge correct"><Check size={12} strokeWidth={3} /></span>
                                ) : (userAnswer === false && !isCorrect) ? (
                                  <span className="ql-choice-badge wrong"><X size={12} strokeWidth={3} /></span>
                                ) : null}
                                <span className="ql-choice-text">Sai</span>
                              </button>
                            </div>
                          </div>
                          {isUnanswered && (
                            <div className="ql-skipped-label-box">
                              <XCircle size={16} color="#ef4444" />
                              <span>Chưa trả lời</span>
                            </div>
                          )}
                        </div>
                      )}

                      {q.type === 'multipleChoice' && (
                        <div className="ql-card-body">
                          {!isCorrect && (
                            <span className="ql-section-label">Thử lại câu hỏi này sau!</span>
                          )}
                          <div className="ql-mcq-grid">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = userAnswer === opt;
                              const isCorrectOption = q.correctAnswer === opt;
                              
                              let btnClass = "";
                              if (isCorrectOption) btnClass = "selected-correct";
                              else if (isSelected && !isCorrect) btnClass = "selected-wrong";

                              return (
                                <button key={oIdx} className={`ql-mcq-choice-btn ${btnClass}`} disabled>
                                  {isCorrectOption ? (
                                    <span className="ql-choice-badge correct"><Check size={12} strokeWidth={3} /></span>
                                  ) : (isSelected && !isCorrect) ? (
                                    <span className="ql-choice-badge wrong"><X size={12} strokeWidth={3} /></span>
                                  ) : (
                                    <span className="ql-choice-badge">{oIdx + 1}</span>
                                  )}
                                  <span className="ql-choice-text">{opt}</span>
                                </button>
                              );
                            })}
                          </div>

                          {isUnanswered && (
                            <div className="ql-skipped-label-box">
                              <XCircle size={16} color="#ef4444" />
                              <span>Chưa trả lời</span>
                            </div>
                          )}
                        </div>
                      )}

                      {q.type === 'typeAnswer' && (
                        <div className="ql-card-body">
                          <span className="ql-section-label">Đáp án của bạn</span>
                          <div className="ql-written-review-box">
                            <input
                              type="text"
                              className={`ql-written-input-review ${isCorrect ? 'correct' : 'wrong'}`}
                              value={isUnanswered ? 'Chưa trả lời' : userAnswer}
                              disabled
                            />
                            {!isCorrect && (
                              <>
                                <span className="ql-section-label">Thử lại câu hỏi này sau!</span>
                                <div className="ql-correct-dashed-box">
                                  <Check size={16} color="#10b981" />
                                  <span>{q.correctAnswer}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions bottom */}
            <div className="ql-results-actions">
              <button
                className="ql-btn-redo"
                onClick={() => {
                  setStarted(false);
                  setQuestions([]);
                  setAnswers({});
                  setAllDone(false);
                  setSyncWarning(false);
                  setDurationStr('');
                  setIsSubmitting(false);
                }}
              >
                Làm lại
              </button>
              <button className="ql-btn-close-results" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ql-test-body scrollable-questions">
          <div className="ql-questions-container">
            {questions.map((q, idx) => {
              const answerObj = answers[q.id];
              const currentVal = answerObj?.value;

              return (
                <div key={q.id} className="ql-question-card">
                  {/* Header info */}
                  {q.type !== 'trueFalse' && (
                    <div className="ql-card-header">
                      <div className="ql-card-meta">
                        <p className="ql-meta-definition">{q.definition}</p>
                      </div>
                      <span className="ql-card-index">{idx + 1}/{questions.length}</span>
                    </div>
                  )}

                  {/* Question Type specific inputs */}
                  {q.type === 'trueFalse' && (
                    <div className="ql-card-body-tf">
                      <div className="ql-tf-cols">
                        <div className="ql-tf-col">
                          <div className="ql-tf-col-header">
                            <span className="ql-tf-col-label">Định nghĩa</span>
                          </div>
                          <p className="ql-tf-col-text">{q.definition}</p>
                        </div>
                        
                        <div className="ql-tf-col">
                          <div className="ql-tf-col-header">
                            <span className="ql-tf-col-label">Thuật ngữ</span>
                            <button className="ql-tf-sound-btn" onClick={() => speakWord(q.term)}>
                              <Volume2 size={14} />
                            </button>
                            <span className="ql-tf-col-index">{idx + 1}/{questions.length}</span>
                          </div>
                          <p className="ql-tf-col-text">{q.term}</p>
                        </div>
                      </div>

                      <div className="ql-tf-bottom-section">
                        <span className="ql-tf-section-label">Chọn câu trả lời</span>
                        <div className="ql-tf-options-group">
                          <button
                            className={`ql-tf-btn-choice ${currentVal === true ? 'active' : ''}`}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { status: 'answered', value: true } }))}
                          >
                            <span className="ql-choice-text">Đúng</span>
                          </button>
                          <button
                            className={`ql-tf-btn-choice ${currentVal === false ? 'active' : ''}`}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { status: 'answered', value: false } }))}
                          >
                            <span className="ql-choice-text">Sai</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {q.type === 'multipleChoice' && (
                    <div className="ql-card-body">
                      <div className="ql-mcq-grid">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            className={`ql-mcq-btn-choice ${currentVal === opt ? 'active' : ''}`}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { status: 'answered', value: opt } }))}
                          >
                            <span className="ql-choice-badge">{oIdx + 1}</span>
                            <span className="ql-choice-text">{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'typeAnswer' && (
                    <div className="ql-card-body">
                      <div className="ql-written-input-box">
                        <input
                          type="text"
                          className="ql-question-input"
                          placeholder="Nhập Tiếng Anh"
                          value={currentVal || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { status: 'answered', value: e.target.value } }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleWrittenNext(e);
                            }
                          }}
                        />
                        <button
                          className="ql-written-btn-next"
                          onClick={(e) => handleWrittenNext(e)}
                        >
                          Tiếp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Submit Area */}
            <div className="ql-test-submit-footer">
              <div className="ql-submit-note-icon">
                <FileText size={32} color="#2c5ef5" />
              </div>
              <p className="ql-submit-text">Tất cả đã xong! Bạn đã sẵn sàng gửi bài kiểm tra?</p>
              <button
                className="ql-btn-submit-test"
                onClick={handleSubmitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi bài kiểm tra'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Global Reset variables & layout */
        .ql-test-wrap {
          min-height: 100vh;
          background: #f6f7fb;
          color: var(--text-body);
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans);
        }
        [data-theme='dark'] .ql-test-wrap {
          background: var(--bg-page);
        }



        /* Scrollable layout and modal */
        .ql-test-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .ql-test-body.scrollable-questions, .ql-test-body.results-mode {
          align-items: flex-start;
          padding: 40px 16px;
          overflow-y: auto;
          max-height: calc(100vh - 64px);
        }

        /* Modal Settings Options */
        .ql-setup-modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 20, 25, 0.5);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          width: 100%;
        }
        [data-theme='dark'] .ql-setup-modal-overlay {
          background: rgba(11, 14, 23, 0.85);
        }
        .ql-setup-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        [data-theme='dark'] .ql-setup-modal {
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        }
        .ql-setup-modal__header {
          padding: 24px 28px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ql-setup-modal__title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-heading);
          margin: 0;
        }
        .ql-setup-modal__close-btn {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-setup-modal__close-btn:hover {
          background: #ef4444;
          color: #fff;
        }
        .ql-setup-modal__body {
          padding: 24px 28px;
          overflow-y: auto;
          max-height: 400px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Row Layout */
        .ql-setup-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 48px;
        }
        .ql-setup-row__label {
          display: flex;
          flex-direction: column;
          color: var(--text-heading);
          font-weight: 600;
          font-size: 0.95rem;
        }
        .ql-setup-row__subtext {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .ql-setup-row__badge {
          background: rgba(44, 94, 245, 0.08);
          color: var(--gl-tertiary);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          width: max-content;
          margin-top: 4px;
        }
        [data-theme='dark'] .ql-setup-row__badge {
          background: rgba(44, 94, 245, 0.15);
        }
        .ql-setup-input-num {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          color: var(--text-heading);
          width: 80px;
          padding: 8px 12px;
          text-align: center;
          font-size: 1rem;
          font-weight: 700;
          outline: none;
        }
        .ql-setup-input-num:focus {
          border-color: var(--gl-tertiary);
          box-shadow: 0 0 0 2px rgba(44, 94, 245, 0.2);
        }

        /* Switch Custom Toggle */
        .ql-switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }
        .ql-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .ql-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: rgba(15, 20, 25, 0.15);
          border-radius: 34px;
          transition: .3s;
        }
        [data-theme='dark'] .ql-slider {
          background-color: #22253c;
        }
        .ql-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: #fff;
          border-radius: 50%;
          transition: .3s;
        }
        .ql-switch input:checked + .ql-slider {
          background-color: var(--gl-tertiary);
        }
        .ql-switch input:checked + .ql-slider:before {
          transform: translateX(24px);
        }
        .ql-setup-divider {
          border: 0;
          height: 1px;
          background: var(--border-subtle);
          margin: 8px 0;
        }

        /* Collapsible menus */
        .ql-setup-collapsible {
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
        }
        .ql-setup-collapsible__trigger {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-heading);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 0.95rem;
          padding: 8px 0;
          cursor: pointer;
        }
        .ql-setup-collapsible__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ql-setup-collapsible__status {
          font-size: 0.85rem;
          color: var(--gl-tertiary);
        }
        .ql-chevron {
          transition: transform 0.2s;
        }
        .ql-chevron.open {
          transform: rotate(180deg);
        }
        .ql-setup-collapsible__content {
          overflow: hidden;
          font-size: 0.85rem;
          color: var(--text-muted);
          padding: 4px 0 8px;
          line-height: 1.5;
        }

        /* Setup Modal Footer */
        .ql-setup-modal__footer {
          padding: 24px 28px;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ql-setup-btn-start {
          background: var(--gl-tertiary);
          color: var(--gl-on-primary);
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(44, 94, 245, 0.25);
        }
        .ql-setup-btn-start:hover {
          filter: brightness(1.08);
        }
        .ql-setup-modal__footer-links {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ql-privacy-link {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .ql-setup-btn-cancel {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 8px 18px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-setup-btn-cancel:hover {
          background: var(--border-subtle);
          color: var(--text-heading);
        }

        /* Questions Container (Scrollable) */
        .ql-questions-container, .ql-results-container {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Question card layout */
        .ql-question-card, .ql-review-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        [data-theme='dark'] .ql-question-card, [data-theme='dark'] .ql-review-card {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .ql-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8px;
        }
        .ql-card-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .ql-meta-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .ql-meta-definition {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-heading);
          margin: 0;
          line-height: 1.4;
        }
        .ql-card-index {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .ql-card-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ql-meta-term-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ql-term-sound-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ql-meta-term {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-heading);
        }
        .ql-speaker-btn {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-speaker-btn:hover {
          background: rgba(44, 94, 245, 0.08);
          border-color: var(--gl-tertiary);
          color: var(--gl-tertiary);
        }

        .ql-section-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* True/False Buttons choices */
        .ql-options-group {
          display: flex;
          gap: 12px;
        }
        .ql-tf-btn-choice {
          flex: 1;
          background: var(--gl-surface);
          border: 2px solid var(--border-subtle);
          color: var(--text-heading);
          padding: 14px 20px;
          min-height: 56px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ql-tf-btn-choice:hover {
          border-color: rgba(44, 94, 245, 0.4);
          background: rgba(44, 94, 245, 0.03);
        }
        .ql-tf-btn-choice.active {
          border-color: var(--gl-tertiary);
          background: rgba(44, 94, 245, 0.08);
          color: var(--gl-tertiary);
        }
        [data-theme='dark'] .ql-tf-btn-choice.active {
          background: rgba(44, 94, 245, 0.15);
        }

        /* MCQ Grid Layout */
        .ql-mcq-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .ql-mcq-btn-choice {
          background: var(--gl-surface);
          border: 2px solid var(--border-subtle);
          color: var(--text-heading);
          padding: 14px 20px;
          min-height: 56px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ql-mcq-btn-choice:hover {
          border-color: rgba(44, 94, 245, 0.4);
          background: rgba(44, 94, 245, 0.03);
        }
        .ql-mcq-btn-choice.active {
          border-color: var(--gl-tertiary);
          background: rgba(44, 94, 245, 0.08);
          color: var(--gl-tertiary);
        }
        [data-theme='dark'] .ql-mcq-btn-choice.active {
          background: rgba(44, 94, 245, 0.15);
        }
        .ql-skip-link {
          background: transparent;
          border: none;
          color: var(--gl-tertiary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          width: max-content;
          padding: 0;
          text-align: left;
          margin-top: 4px;
        }
        .ql-skip-link:hover {
          text-decoration: underline;
        }

        /* Written layout */
        .ql-written-input-box {
          display: flex;
          gap: 12px;
        }
        .ql-question-input {
          flex: 1;
          background: var(--gl-surface);
          border: 2px solid var(--border-subtle);
          border-radius: 12px;
          color: var(--text-heading);
          padding: 14px 16px;
          font-size: 1rem;
          outline: none;
          transition: all 0.15s;
        }
        .ql-question-input:focus {
          border-color: var(--gl-tertiary);
        }
        .ql-written-btn-next {
          background: var(--gl-tertiary);
          color: var(--gl-on-primary);
          border: none;
          padding: 0 24px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-written-btn-next:hover {
          filter: brightness(1.08);
        }

        /* Bottom Submit Area */
        .ql-test-submit-footer {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }
        .ql-submit-note-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: rgba(44, 94, 245, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ql-submit-text {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-heading);
        }
        .ql-btn-submit-test {
          background: var(--gl-tertiary);
          color: var(--gl-on-primary);
          border: none;
          width: 100%;
          max-width: 240px;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-btn-submit-test:hover:not(:disabled) {
          filter: brightness(1.08);
        }
        .ql-btn-submit-test:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Results score screens (Ảnh 3) */
        .ql-sync-banner {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 12px;
          color: #dc2626;
          padding: 12px 16px;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: left;
        }
        [data-theme='dark'] .ql-sync-banner {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .ql-results-msg {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-heading);
          margin: 0 0 4px;
          text-align: left;
        }
        .ql-results-duration {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0 0 24px;
          text-align: left;
        }
        .ql-results-score-row {
          display: flex;
          align-items: center;
          gap: 32px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 24px;
        }
        
        /* Circle Progress */
        .ql-results-circle-progress {
          position: relative;
          width: 100px;
          height: 100px;
        }
        .ql-results-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .ql-results-svg-bg {
          fill: none;
          stroke: var(--border-subtle);
          stroke-width: 8;
        }
        .ql-results-svg-fill {
          fill: none;
          stroke: var(--gl-tertiary);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dasharray 0.8s ease-in-out;
        }
        .ql-results-pct {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-heading);
        }

        .ql-results-stats-pills {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .ql-stat-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .ql-stat-pill.correct {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .ql-stat-pill.wrong {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        /* Review Mode Cards Styles */
        .ql-review-section {
          margin-top: 8px;
        }
        .ql-review-section__title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-heading);
          margin-bottom: 16px;
          text-align: left;
        }
        .ql-review-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ql-tf-choice-btn, .ql-mcq-choice-btn {
          flex: 1;
          background: var(--gl-surface);
          border: 2px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 14px 20px;
          min-height: 56px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ql-mcq-choice-btn {
          text-align: left;
        }
        .ql-tf-choice-btn {
          justify-content: center;
          gap: 8px;
        }

        /* Choice prefix badges custom styling */
        .ql-choice-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--border-subtle);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .ql-tf-btn-choice:hover .ql-choice-badge, 
        .ql-mcq-btn-choice:hover .ql-choice-badge {
          border-color: var(--gl-tertiary);
          color: var(--gl-tertiary);
        }
        .ql-tf-btn-choice.active .ql-choice-badge, 
        .ql-mcq-btn-choice.active .ql-choice-badge {
          background: var(--gl-tertiary);
          border-color: var(--gl-tertiary);
          color: #fff;
        }
        .selected-correct .ql-choice-badge {
          background: #10b981 !important;
          border-color: #10b981 !important;
          color: #fff !important;
        }
        .selected-wrong .ql-choice-badge {
          background: #ef4444 !important;
          border-color: #ef4444 !important;
          color: #fff !important;
        }
        .ql-choice-text {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ql-tf-choice-btn {
          justify-content: center;
        }
        
        /* Correct / Incorrect colors on review */
        .selected-correct {
          border-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.08) !important;
          color: #10b981 !important;
          font-weight: 700;
        }
        [data-theme='dark'] .selected-correct {
          background: rgba(16, 185, 129, 0.15) !important;
        }
        .selected-wrong {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.08) !important;
          color: #ef4444 !important;
          font-weight: 700;
          text-decoration: line-through;
        }
        [data-theme='dark'] .selected-wrong {
          background: rgba(239, 68, 68, 0.15) !important;
        }

        .ql-skipped-label-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.04);
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 12px;
          border-radius: 10px;
          color: #dc2626;
          font-size: 0.9rem;
          font-weight: 600;
          margin-top: 4px;
        }
        [data-theme='dark'] .ql-skipped-label-box {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.08);
        }

        /* Written input review style */
        .ql-written-review-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ql-written-input-review {
          background: var(--gl-surface);
          border: 2px solid var(--border-subtle);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 1rem;
          color: var(--text-heading);
          outline: none;
        }
        .ql-written-input-review.correct {
          border-color: #10b981;
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          font-weight: 700;
        }
        .ql-written-input-review.wrong {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
          text-decoration: line-through;
        }

        /* Dashed green answer hint */
        .ql-correct-dashed-box {
          border: 2px dashed #10b981;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.05);
          color: #10b981;
          font-weight: 700;
          font-size: 1.05rem;
        }

        /* Results Footer redos */
        .ql-results-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }
        .ql-btn-redo {
          flex: 1;
          background: var(--gl-tertiary);
          color: var(--gl-on-primary);
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-btn-redo:hover {
          filter: brightness(1.08);
        }
        .ql-btn-close-results {
          flex: 1;
          background: var(--gl-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ql-btn-close-results:hover {
          background: var(--border-subtle);
          color: var(--text-heading);
        }

        /* 2-Column True/False Layout styling */
        .ql-card-body-tf {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ql-tf-cols {
          display: flex;
          gap: 24px;
          position: relative;
        }
        .ql-tf-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .ql-tf-col:first-child {
          border-right: 1px solid var(--border-subtle);
          padding-right: 24px;
        }
        .ql-tf-col-header {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        .ql-tf-col-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ql-tf-sound-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .ql-tf-sound-btn:hover {
          background: var(--border-subtle);
          color: var(--gl-tertiary);
        }
        .ql-tf-col-index {
          margin-left: auto;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .ql-tf-col-text {
          font-size: 1.15rem;
          font-weight: 500;
          color: var(--text-heading);
          margin: 0;
          line-height: 1.5;
          word-break: break-word;
        }
        .ql-tf-bottom-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }
        .ql-tf-section-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .ql-tf-options-group {
          display: flex;
          gap: 16px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .ql-tf-cols {
            flex-direction: column;
            gap: 16px;
          }
          .ql-tf-col:first-child {
            border-right: none;
            border-bottom: 1px solid var(--border-subtle);
            padding-right: 0;
            padding-bottom: 16px;
          }
          .ql-tf-options-group {
            flex-direction: column;
            gap: 12px;
          }
          .ql-mcq-grid {
            grid-template-columns: 1fr;
          }
          .ql-options-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
