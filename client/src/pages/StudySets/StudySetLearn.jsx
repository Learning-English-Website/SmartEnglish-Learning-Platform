import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, ClipboardCheck, Box,
  Volume2, VolumeX, Settings, ChevronLeft,
  Shuffle, RotateCcw,
  CheckCircle, XCircle, ChevronRight,
  ArrowLeft, X, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { progressService } from '../../services/progressService';
import './StudySetLearn.css';

const CARD_BATCH_SIZE = 6;
const TING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/953/953-preview.mp3';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STUDY_MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

const QuizletProgressBar = ({ totalCards, currentIndex, correctCards, wrongCards, batchSize = CARD_BATCH_SIZE }) => {
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

          return (
            <div
              key={segmentIdx}
              className={`quizlet-progress__segment ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="quizlet-progress__cards">
                {Array.from({ length: batchSize }).map((_, cardIdx) => {
                  const absoluteIndex = segment.start + cardIdx;
                  if (absoluteIndex >= totalCards) return <div key={cardIdx} className="quizlet-progress__card empty" />;

                  const isCardCorrect = correctCards.has(absoluteIndex);
                  const isCardWrong = wrongCards.has(absoluteIndex);
                  const isCardCurrent = absoluteIndex === currentIndex;

                  return (
                    <div
                      key={cardIdx}
                      className={`quizlet-progress__card ${isCardCorrect ? 'correct' : ''} ${isCardWrong ? 'wrong' : ''} ${isCardCurrent ? 'current' : ''} ${(isCardCorrect || isCardWrong) ? 'answered' : ''}`}
                    />
                  );
                })}
              </div>
              <span className="quizlet-progress__segment-label">{segment.end}</span>
            </div>
          );
        })}
      </div>
      <div className="quizlet-progress__text">
        <span className="quizlet-progress__count">{currentIndex} / {totalCards}</span>
      </div>
    </div>
  );
};

export default function StudySetLearn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState(new Map()); // SM-2 schedules from server

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCards, setCorrectCards] = useState(new Set());
  const [wrongCards, setWrongCards] = useState(new Set());
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Settings state
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [includeMultipleChoice, setIncludeMultipleChoice] = useState(true);
  const [includeTypeAnswer, setIncludeTypeAnswer] = useState(true);

  const inputRef = useRef(null);
  const audioRef = useRef(null);

  // Load schedules from server on mount
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const response = await progressService.getCardSchedules(id);
        const serverSchedules = response.data || [];
        console.log('[StudySetLearn] API Response raw:', JSON.stringify(serverSchedules));
        const scheduleMap = new Map();
        serverSchedules.forEach(s => {
          const key = s.cardId.toString();
          console.log('[StudySetLearn] Adding schedule:', key, 'repetitions:', s.repetitions, 'nextReview:', s.nextReview);
          scheduleMap.set(key, s);
        });
        setSchedules(scheduleMap);
        console.log('[StudySetLearn] Loaded schedules map size:', scheduleMap.size);
      } catch (err) {
        console.log('[StudySetLearn] No existing schedules');
      }
    };
    loadSchedules();
  }, [id]);

  // Get due cards based on SM-2 schedules
  // SM-2 Logic:
  // - Card đúng: repetitions tăng, nextReview trong tương lai (1, 6, n*EF ngày)
  // - Card sai: repetitions reset về 0, nextReview = hôm nay (interval = 0)
  // => Chỉ hiện cards có nextReview <= now (cards quá hạn)
  const dueCards = useMemo(() => {
    const now = new Date();
    console.log('[StudySetLearn] Filtering cards:', { cardsCount: cards.length, schedulesCount: schedules.size, now: now.toISOString() });

    const due = [];

    cards.forEach(card => {
      const schedule = schedules.get(card._id);
      console.log('[StudySetLearn] Card:', card._id, 'Schedule:', schedule ? { repetitions: schedule.repetitions, nextReview: schedule.nextReview } : 'NONE');

      if (!schedule) {
        // New card (never learned) - NOT due yet
        console.log('[StudySetLearn] Card', card._id, '-> NEW (no schedule)');
      } else {
        // Check if card is due for review
        const nextReview = new Date(schedule.nextReview);
        if (nextReview <= now) {
          // Card is overdue - include in session
          due.push({ ...card, isOverdue: true, nextReview: schedule.nextReview, schedule });
          console.log('[StudySetLearn] Card', card._id, '-> DUE (overdue)');
        } else {
          // Card not yet due
          console.log('[StudySetLearn] Card', card._id, '-> NOT YET (due:', nextReview.toISOString(), ')');
        }
      }
    });

    // Sort by how overdue (oldest first)
    due.sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());

    console.log('[StudySetLearn] Filter result:', { dueCount: due.length, totalCards: cards.length });
    console.log('[StudySetLearn] Due cards:', due.map(c => ({ id: c._id, nextReview: c.nextReview })));

    return due;
  }, [cards, schedules]);

  // Build session based on due cards
  const sessionCards = useMemo(() => {
    let result = [];
    if (includeMultipleChoice) result.push(...dueCards.map(c => ({ ...c, sessionType: 'multiple-choice' })));
    if (includeTypeAnswer) result.push(...dueCards.map(c => ({ ...c, sessionType: 'type-answer' })));
    return result;
  }, [dueCards, includeMultipleChoice, includeTypeAnswer]);

  const totalItems = sessionCards.length;
  const currentCard = sessionCards[currentIdx] || null;

  // Options for multiple choice - show Vietnamese (back) and English options
  const options = useMemo(() => {
    if (!currentCard || currentCard.sessionType !== 'multiple-choice') return [];
    const others = cards
      .filter(c => c._id !== currentCard._id)
      .map(c => ({ id: c._id, text: c.front }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return shuffleArray([{ id: currentCard._id, text: currentCard.front }, ...others]);
  }, [currentCard, cards]);

  const playCorrectSound = useCallback(() => {
    if (!soundEnabled) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  useEffect(() => {
    audioRef.current = new Audio(TING_SOUND_URL);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [setRes, cardsRes] = await Promise.all([
          setService.getById(id),
          cardService.getBySetId(id),
        ]);
        setStudySet(setRes?.data ?? setRes);
        setCards(shuffleArray([...(cardsRes?.data ?? cardsRes ?? [])]));
      } catch {
        toast.error('Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (currentCard?.sessionType === 'type-answer' && inputRef.current && !answered) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIdx, currentCard, answered]);

  useEffect(() => {
    setSelectedOption(null);
    setTypedAnswer('');
    setAnswered(false);
    setIsCorrect(false);
    setShowAnswer(false);
  }, [currentIdx]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isComplete) return;
      if (e.key === 'Enter' && currentCard?.sessionType === 'type-answer' && !answered && typedAnswer.trim()) {
        handleTypeAnswer();
      } else if (e.key === 'ArrowRight' && answered) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, answered, typedAnswer, currentCard, isComplete]);

  const handleAnswer = useCallback((opt) => {
    if (answered) return;
    setSelectedOption(opt.id);
    setAnswered(true);
    const correct_ = opt.id === currentCard._id;
    setIsCorrect(correct_);

    if (correct_) {
      setCorrectCards(prev => new Set([...prev, currentIdx]));
      playCorrectSound();
      // Auto advance on correct answer
      setTimeout(() => {
        handleNext();
      }, 800);
    } else {
      setWrongCards(prev => new Set([...prev, currentIdx]));
      setShowAnswer(true);
    }

    if (currentCard) {
      progressService.updateCardProgress(currentCard._id, correct_ ? 2 : 0).catch(() => {});
    }
  }, [answered, currentCard, currentIdx, playCorrectSound]);

  const handleTypeAnswer = useCallback(() => {
    if (answered || !typedAnswer.trim()) return;
    setAnswered(true);
    const correct_ = typedAnswer.trim().toLowerCase() === currentCard?.front.trim().toLowerCase();
    setIsCorrect(correct_);

    if (correct_) {
      setCorrectCards(prev => new Set([...prev, currentIdx]));
      playCorrectSound();
      // Auto advance on correct answer
      setTimeout(() => {
        handleNext();
      }, 800);
    } else {
      setWrongCards(prev => new Set([...prev, currentIdx]));
      setShowAnswer(true);
    }

    if (currentCard) {
      progressService.updateCardProgress(currentCard._id, correct_ ? 2 : 0).catch(() => {});
    }
  }, [answered, typedAnswer, currentCard, currentIdx, playCorrectSound]);

  // Handle "Không biết" - show answer and wait for user to click "Tiếp"
  const handleDontKnow = useCallback(() => {
    if (answered) return; // Already answered or showed answer

    setAnswered(true);
    setShowAnswer(true);
    setWrongCards(prev => new Set([...prev, currentIdx]));

    if (currentCard) {
      progressService.updateCardProgress(currentCard._id, 0).catch(() => {});
    }
  }, [answered, currentCard, currentIdx]);

  const handleNext = useCallback(() => {
    setAnswered(false);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsCorrect(false);
    setShowAnswer(false);

    if (currentIdx < totalItems - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentIdx, totalItems]);

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setCorrectCards(new Set());
    setWrongCards(new Set());
    setAnswered(false);
    setIsCorrect(false);
    setIsComplete(false);
    setShowAnswer(false);
    setIsShuffled(false);
    setCards(shuffleArray([...dueCards]));
  }, [dueCards]);

  const handleShuffle = useCallback(() => {
    setCards(shuffleArray([...dueCards]));
    setCurrentIdx(0);
    setCorrectCards(new Set());
    setWrongCards(new Set());
    setAnswered(false);
    setIsCorrect(false);
    setIsComplete(false);
    setShowAnswer(false);
    setIsShuffled(true);
  }, [dueCards]);

  const handleModeChange = useCallback((mode) => {
    if (mode === 'flashcards') navigate(`/study-sets/${id}/flashcards`);
    else if (mode === 'learn') navigate(`/study-sets/${id}/learn`);
    else if (mode === 'test') navigate(`/study-sets/${id}/test`);
    else if (mode === 'match') navigate(`/study-sets/${id}/match`);
    setModeDropdownOpen(false);
  }, [id, navigate]);

  const speakCard = (text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const handleMultipleChoiceToggle = (checked) => {
    if (!checked && includeTypeAnswer) {
      setIncludeMultipleChoice(false);
    } else if (!checked && !includeTypeAnswer) {
      return;
    } else {
      setIncludeMultipleChoice(checked);
    }
  };

  const handleTypeAnswerToggle = (checked) => {
    if (!checked && includeMultipleChoice) {
      setIncludeTypeAnswer(false);
    } else if (!checked && !includeMultipleChoice) {
      return;
    } else {
      setIncludeTypeAnswer(checked);
    }
  };

  if (loading) return (
    <div className="ql-learn-page ql-learn-page--fill">
      <div className="ql-learn-loading">
        <div className="ql-learn-loading__spinner" />
        <span>Đang chuẩn bị bài học...</span>
      </div>
    </div>
  );

  // Show message when no cards are due for review
  if (dueCards.length === 0 && schedules.size > 0) {
    return (
      <div className="ql-learn-page ql-learn-page--fill">
        <div className="ql-learn-complete">
          <motion.div
            className="ql-learn-complete__card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="ql-learn-complete__emoji">🎉</div>
            <h2 className="ql-learn-complete__title">Tất cả đã hoàn thành!</h2>
            <p className="ql-learn-complete__subtitle">
              Không có thẻ nào cần ôn tập ngay lúc này.
              <br />
              Quay lại vào ngày mai để tiếp tục học!
            </p>
            <div className="ql-learn-complete__actions">
              <button
                className="ql-learn-complete__btn ql-learn-complete__btn--secondary"
                onClick={() => navigate(`/study-sets/${id}`)}
              >
                <ArrowLeft size={16} />
                Quay về bộ thẻ
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correct = correctCards.size;
    const wrong = wrongCards.size;
    const score = totalItems > 0 ? Math.round((correct / totalItems) * 100) : 0;
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="ql-learn-page ql-learn-page--fill">
        <div className="ql-learn-complete">
          <motion.div
            className="ql-learn-complete__card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="ql-learn-complete__emoji">
              {score >= 80 ? '🏆' : score >= 50 ? '💪' : '📚'}
            </div>
            <h1 className="ql-learn-complete__title">
              {score >= 80 ? 'Xuất sắc!' : score >= 50 ? 'Khá tốt!' : 'Cần cố gắng thêm!'}
            </h1>
            <p className="ql-learn-complete__subtitle">
              Bạn đã hoàn thành <strong>{studySet?.title}</strong>
            </p>

            <div className="ql-learn-complete__score-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="qlScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4255ff" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <circle className="ql-score-bg" cx="60" cy="60" r="52" />
                <circle
                  className="ql-score-fill"
                  cx="60" cy="60" r="52"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="ql-learn-complete__score-inner">
                <span className="ql-learn-complete__score-num">{score}%</span>
                <span className="ql-learn-complete__score-label">Điểm</span>
              </div>
            </div>

            <div className="ql-learn-complete__stats">
              <div className="ql-learn-complete__stat ql-learn-complete__stat--correct">
                <CheckCircle size={16} />
                <span className="ql-learn-complete__stat-num">{correct}</span>
                <span className="ql-learn-complete__stat-label">Đúng</span>
              </div>
              <div className="ql-learn-complete__stat ql-learn-complete__stat--wrong">
                <XCircle size={16} />
                <span className="ql-learn-complete__stat-num">{wrong}</span>
                <span className="ql-learn-complete__stat-label">Sai</span>
              </div>
              <div className="ql-learn-complete__stat ql-learn-complete__stat--total">
                <BookOpen size={16} />
                <span className="ql-learn-complete__stat-num">{totalItems}</span>
                <span className="ql-learn-complete__stat-label">Tổng câu</span>
              </div>
            </div>

            <div className="ql-learn-complete__actions">
              <button className="ql-btn ql-btn--primary" onClick={handleRestart}>
                <RotateCcw size={15} />
                Học lại
              </button>
              <button className="ql-btn ql-btn--outline" onClick={() => navigate(`/study-sets/${id}`)}>
                <ArrowLeft size={15} />
                Quay lại học phần
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="ql-learn-page ql-learn-page--fill">
      {/* Header - No back button, just settings */}
      <header className="ql-learn-header">
        <div className="ql-learn-header__left">
          {/* Mode Selector - Quizlet Style */}
          <div className="ql-learn-mode-selector">
            <button
              className="ql-learn-mode-selector__current"
              onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
            >
              <Brain size={16} />
              <span>Học</span>
              <ChevronUp size={14} className={`ql-learn-mode-selector__arrow ${modeDropdownOpen ? 'open' : ''}`} />
            </button>

            <AnimatePresence>
              {modeDropdownOpen && (
                <motion.div
                  className="ql-learn-mode-selector__dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {STUDY_MODES.map(({ id: mId, label, icon: Icon }) => (
                    <button
                      key={mId}
                      className={`ql-learn-mode-selector__item ${mId === 'learn' ? 'active' : ''}`}
                      onClick={() => handleModeChange(mId)}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="ql-learn-header__center">
          <QuizletProgressBar
            totalCards={totalItems}
            currentIndex={currentIdx}
            correctCards={correctCards}
            wrongCards={wrongCards}
          />
        </div>

        <div className="ql-learn-header__right">
          <button
            className={`ql-learn-header__btn ${settingsOpen ? 'active' : ''}`}
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Cài đặt"
            title="Cài đặt"
          >
            <Settings size={20} />
          </button>
          <button
            className="ql-learn-header__btn ql-learn-header__btn--close"
            onClick={() => navigate(`/study-sets/${id}`)}
            aria-label="Đóng"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="ql-learn-settings-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="ql-learn-settings-panel__header">
              <span className="ql-learn-settings-panel__title">Cài đặt</span>
              <button
                className="ql-learn-settings-panel__close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ql-learn-settings-panel__group">
              <span className="ql-learn-settings-panel__label">Tùy chọn</span>

              <button
                className={`ql-learn-settings-toggle ${isShuffled ? 'active' : ''}`}
                onClick={() => {
                  const newShuffled = !isShuffled;
                  setIsShuffled(newShuffled);
                  const newCards = newShuffled ? shuffleArray([...dueCards]) : [...dueCards].sort((a, b) => a._id.localeCompare(b._id));
                  setCards(newCards);
                  setCurrentIdx(0);
                  setCorrectCards(new Set());
                  setWrongCards(new Set());
                  setAnswered(false);
                  setIsCorrect(false);
                  setIsComplete(false);
                  setShowAnswer(false);
                }}
              >
                <Shuffle size={16} />
                <span>Xáo trộn thẻ</span>
                <div className={`ql-learn-settings-toggle__switch ${isShuffled ? 'on' : ''}`}>
                  <div className="ql-learn-settings-toggle__switch-thumb" />
                </div>
              </button>

              <button
                className={`ql-learn-settings-toggle ${soundEnabled ? 'active' : ''}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>Âm thanh</span>
                <div className={`ql-learn-settings-toggle__switch ${soundEnabled ? 'on' : ''}`}>
                  <div className="ql-learn-settings-toggle__switch-thumb" />
                </div>
              </button>
            </div>

            <div className="ql-learn-settings-panel__divider" />

            <div className="ql-learn-settings-panel__group">
              <span className="ql-learn-settings-panel__label">Loại câu hỏi</span>

              <label className="ql-learn-settings-checkbox">
                <input
                  type="checkbox"
                  checked={includeMultipleChoice}
                  onChange={(e) => handleMultipleChoiceToggle(e.target.checked)}
                />
                <span className="ql-learn-settings-checkbox__box">
                  {includeMultipleChoice && <CheckCircle size={12} />}
                </span>
                <span className="ql-learn-settings-checkbox__label">Trắc nghiệm</span>
              </label>

              <label className="ql-learn-settings-checkbox">
                <input
                  type="checkbox"
                  checked={includeTypeAnswer}
                  onChange={(e) => handleTypeAnswerToggle(e.target.checked)}
                />
                <span className="ql-learn-settings-checkbox__box">
                  {includeTypeAnswer && <CheckCircle size={12} />}
                </span>
                <span className="ql-learn-settings-checkbox__label">Tự luận</span>
              </label>
            </div>

            <div className="ql-learn-settings-panel__divider" />

            <div className="ql-learn-settings-panel__info">
              <span className="ql-learn-settings-panel__info-correct">
                <CheckCircle size={14} />
                {correctCards.size} đúng
              </span>
              <span className="ql-learn-settings-panel__info-wrong">
                <XCircle size={14} />
                {wrongCards.size} sai
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="ql-learn-main">
        <div className="ql-learn-container">
          <div className="ql-learn-score-badges">
            <span className="ql-learn-score-badge ql-learn-score-badge--correct">
              <CheckCircle size={14} />
              {correctCards.size}
            </span>
            <span className="ql-learn-score-badge ql-learn-score-badge--wrong">
              <XCircle size={14} />
              {wrongCards.size}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              className="ql-learn-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="ql-learn-card__mode-badge">
                <span>{currentCard?.sessionType === 'multiple-choice' ? 'Trắc nghiệm' : 'Tự luận'}</span>
              </div>

              {/* Question - Show Vietnamese (back) */}
              <div className="ql-learn-card__question">
                <div className="ql-learn-card__term-label">Định nghĩa</div>
                <div className="ql-learn-card__term-text">{currentCard?.back}</div>
                <button
                  className="ql-learn-card__audio-btn"
                  onClick={() => speakCard(currentCard?.front)}
                  aria-label="Phát âm"
                  title="Phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              {/* Multiple Choice - Show English options */}
              {currentCard?.sessionType === 'multiple-choice' && (
                <>
                  <div className="ql-learn-card__prompt">Chọn thuật ngữ tiếng Anh đúng</div>
                  <div className="ql-learn-card__options">
                    {options.map((opt, i) => {
                      const isSelected = selectedOption === opt.id;
                      const isCorrectOpt = opt.id === currentCard?._id;

                      let optClass = 'ql-learn-option';
                      if (answered) {
                        if (isCorrectOpt) optClass += ' correct';
                        else if (isSelected) optClass += ' wrong';
                        else if (!showAnswer) optClass += ' dimmed';
                      }

                      return (
                        <motion.button
                          key={opt.id}
                          className={optClass}
                          onClick={() => handleAnswer(opt)}
                          disabled={answered}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
                          <span className="ql-learn-option__letter">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="ql-learn-option__text">{opt.text}</span>
                          {answered && isCorrectOpt && <CheckCircle size={16} className="ql-learn-option__icon ql-learn-option__icon--correct" />}
                          {answered && isSelected && !isCorrectOpt && <XCircle size={16} className="ql-learn-option__icon ql-learn-option__icon--wrong" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Type Answer - Enter English */}
              {currentCard?.sessionType === 'type-answer' && (
                <div className="ql-learn-type-answer">
                  <input
                    ref={inputRef}
                    type="text"
                    className={`ql-learn-type-answer__input ${answered ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                    placeholder="Nhập thuật ngữ tiếng Anh..."
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTypeAnswer()}
                    disabled={answered}
                    autoComplete="off"
                  />

                  {!answered && (
                    <button
                      className="ql-learn-type-answer__submit"
                      onClick={handleTypeAnswer}
                      disabled={!typedAnswer.trim()}
                    >
                      Kiểm tra
                    </button>
                  )}

                  {answered && isCorrect && (
                    <div className="ql-learn-feedback ql-learn-feedback--correct">
                      <CheckCircle size={14} />
                      Chính xác!
                    </div>
                  )}

                  {showAnswer && !isCorrect && (
                    <div className="ql-learn-feedback ql-learn-feedback--wrong">
                      <XCircle size={14} />
                      Đáp án đúng: <strong>{currentCard?.front}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Show answer message for "Không biết" */}
              {showAnswer && !isCorrect && (
                <motion.div
                  className="ql-learn-retry-message"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Thử lại câu hỏi này sau!
                </motion.div>
              )}

              {/* Actions */}
              {answered && (
                <motion.div
                  className="ql-learn-card__actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="ql-learn-card__nav-btns ql-learn-card__nav-btns--single">
                    <button
                      className="ql-btn ql-btn--outline ql-btn--sm"
                      onClick={handleDontKnow}
                      disabled={showAnswer} // Disable after showing answer
                    >
                      <XCircle size={14} />
                      Không biết
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Don't know link for multiple choice before answer */}
              {!answered && currentCard?.sessionType === 'multiple-choice' && (
                <div className="ql-learn-card__footer">
                  <button className="ql-learn-dont-know" onClick={handleDontKnow}>
                    Không biết
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Navigation */}
          <div className="ql-learn-bottom-nav">
            <button
              className="ql-learn-bottom-nav__btn"
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <div className="ql-learn-bottom-progress">
              <div className="ql-learn-bottom-progress__bar">
                <motion.div
                  className="ql-learn-bottom-progress__fill"
                  animate={{ width: `${(currentIdx / totalItems) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <button
              className="ql-learn-bottom-nav__btn ql-learn-bottom-nav__btn--primary"
              onClick={handleNext}
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
