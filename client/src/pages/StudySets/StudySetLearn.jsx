import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, ClipboardCheck, Box,
  Volume2, Settings, ChevronLeft, ChevronDown,
  Maximize2, Minimize2, Shuffle, RotateCcw,
  CheckCircle, XCircle, ChevronRight,
  Sparkles, ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import './StudySetLearn.css';

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

export default function StudySetLearn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      } catch { toast.error('Không thể tải dữ liệu.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const options = useMemo(() => {
    if (!cards.length || !cards[currentIdx]) return [];
    const correct = cards[currentIdx];
    const others = cards.filter((_, i) => i !== currentIdx);
    return shuffleArray([correct, ...shuffleArray([...others]).slice(0, 3)]).map((c) => ({
      id: c._id,
      text: c.back,
    }));
  }, [cards, currentIdx]);

  const handleAnswer = useCallback((opt) => {
    if (answered) return;
    setSelectedOption(opt.id);
    setAnswered(true);
    const correct_ = opt.id === cards[currentIdx]._id;
    setIsCorrect(correct_);
    if (correct_) {
      setCorrectCount((k) => k + 1);
    } else {
      setWrongCount((u) => u + 1);
    }
  }, [answered, cards, currentIdx]);

  const handleNext = useCallback(() => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setIsCorrect(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIdx, cards.length]);

  const handleDontKnow = useCallback(() => {
    if (answered) return;
    setWrongCount((u) => u + 1);
    setAnswered(true);
    setIsCorrect(false);
    setSelectedOption(null);
  }, [answered]);

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setWrongCount(0);
    setIsComplete(false);
    setCards(shuffleArray([...cards]));
  }, [cards]);

  const handleShuffle = useCallback(() => {
    setCards(shuffleArray([...cards]));
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
  }, [cards]);

  const handleModeChange = useCallback((mode) => {
    if (mode === 'flashcards') navigate(`/study-sets/${id}/flashcards`);
    else if (mode === 'learn') navigate(`/study-sets/${id}/learn`);
    else if (mode === 'test') navigate(`/study-sets/${id}/test`);
    else if (mode === 'match') navigate(`/study-sets/${id}/match`);
    setModeMenuOpen(false);
  }, [id, navigate]);

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

  const totalCards = cards.length;
  const currentCard = cards[currentIdx];
  const progressPercent = totalCards > 0 ? ((currentIdx) / totalCards) * 100 : 0;

  if (loading) return (
    <div className="ql-learn-page ql-learn-page--fill">
      <div className="ql-learn-loading">
        <div className="ql-learn-loading__spinner" />
        <span>Đang chuẩn bị bài học...</span>
      </div>
    </div>
  );

  /* ── Complete Screen ────────────────────────────────────────────────── */
  if (isComplete) {
    const total = correctCount + wrongCount;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
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
                  <span className="ql-learn-complete__stat-num">{correctCount}</span>
                  <span className="ql-learn-complete__stat-label">Đúng</span>
                </div>
                <div className="ql-learn-complete__stat ql-learn-complete__stat--wrong">
                  <XCircle size={16} />
                  <span className="ql-learn-complete__stat-num">{wrongCount}</span>
                  <span className="ql-learn-complete__stat-label">Sai</span>
                </div>
                <div className="ql-learn-complete__stat ql-learn-complete__stat--total">
                  <BookOpen size={16} />
                  <span className="ql-learn-complete__stat-num">{totalCards}</span>
                  <span className="ql-learn-complete__stat-label">Tổng thẻ</span>
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

  /* ── Main Study Screen ──────────────────────────────────────────────── */
  return (
    <div className="ql-learn-page ql-learn-page--fill">
      <div className="ql-learn-main">
        <div className="ql-learn-container">

          {/* Score badges */}
          <div className="ql-learn-score-badges">
            <span className="ql-learn-score-badge ql-learn-score-badge--correct">
              <CheckCircle size={13} />
              {correctCount} đúng
            </span>
            <span className="ql-learn-score-badge ql-learn-score-badge--wrong">
              <XCircle size={13} />
              {wrongCount} sai
            </span>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              className="ql-learn-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {/* Card Header */}
              <div className="ql-learn-card__header">
                <div className="ql-learn-card__badge">
                  <Brain size={11} />
                  Học
                </div>
                <div className="ql-learn-card__header-right">
                  <button
                    className={`ql-learn-card__sound-btn ${soundEnabled ? 'active' : ''}`}
                    onClick={() => setSoundEnabled((v) => !v)}
                    title={soundEnabled ? 'Tắt âm' : 'Bật âm'}
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    className="ql-learn-card__mode-btn"
                    onClick={() => setModeMenuOpen((v) => !v)}
                    title="Chế độ học"
                  >
                    <Settings size={15} />
                  </button>
                  <span className="ql-learn-card__progress-label">
                    {currentIdx + 1} / {totalCards}
                  </span>
                </div>
              </div>

              {/* Mode Menu */}
              <AnimatePresence>
                {modeMenuOpen && (
                  <motion.div
                    className="ql-learn-mode-menu"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {STUDY_MODES.map(({ id: mId, label, icon: Icon }) => (
                      <button
                        key={mId}
                        className={`ql-learn-mode-menu__item ${mId === 'learn' ? 'active' : ''}`}
                        onClick={() => handleModeChange(mId)}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Question */}
              <div className="ql-learn-card__question">
                <div className="ql-learn-card__term-label">Thuật ngữ</div>
                <div className="ql-learn-card__term-text">{currentCard?.front}</div>
                <button
                  className="ql-learn-card__audio-btn"
                  onClick={() => speakCard(currentCard?.front)}
                  aria-label="Phát âm"
                  title="Phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="ql-learn-card__progress-bar-wrap">
                <div className="ql-learn-card__progress-bar">
                  <motion.div
                    className="ql-learn-card__progress-fill"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Prompt */}
              <div className="ql-learn-card__prompt">
                Chọn định nghĩa đúng
              </div>

              {/* Options */}
              <div className="ql-learn-card__options">
                {options.map((opt, i) => {
                  const isSelected = selectedOption === opt.id;
                  const isCorrectOpt = opt.id === currentCard?._id;

                  let optClass = 'ql-learn-option';
                  let letterClass = 'ql-learn-option__letter';
                  let textClass = 'ql-learn-option__text';

                  if (answered) {
                    if (isCorrectOpt) {
                      optClass += ' correct';
                      letterClass += ' correct';
                      textClass += ' correct';
                    } else if (isSelected) {
                      optClass += ' wrong';
                      letterClass += ' wrong';
                      textClass += ' wrong';
                    } else {
                      optClass += ' dimmed';
                      textClass += ' dimmed';
                    }
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
                      <span className={letterClass}>{String.fromCharCode(65 + i)}</span>
                      <span className={textClass}>{opt.text}</span>
                      {answered && isCorrectOpt && <CheckCircle size={16} className="ql-learn-option__icon ql-learn-option__icon--correct" />}
                      {answered && isSelected && !isCorrectOpt && <XCircle size={16} className="ql-learn-option__icon ql-learn-option__icon--wrong" />}
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions after answer */}
              {answered && (
                <motion.div
                  className="ql-learn-card__actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {!isCorrect && (
                    <div className="ql-learn-feedback ql-learn-feedback--wrong">
                      <XCircle size={14} />
                      Đáp án đúng: <strong>{currentCard?.back}</strong>
                    </div>
                  )}
                  {isCorrect && (
                    <div className="ql-learn-feedback ql-learn-feedback--correct">
                      <CheckCircle size={14} />
                      Chính xác!
                    </div>
                  )}
                  <div className="ql-learn-card__nav-btns">
                    <button className="ql-btn ql-btn--outline ql-btn--sm" onClick={handleDontKnow}>
                      Chưa biết
                    </button>
                    <button className="ql-btn ql-btn--primary ql-btn--sm" onClick={handleNext}>
                      {currentIdx < totalCards - 1 ? (
                        <>Tiếp theo <ChevronRight size={14} /></>
                      ) : (
                        <>Hoàn thành <Sparkles size={14} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Don't know link */}
              {!answered && (
                <div className="ql-learn-card__footer">
                  <button className="ql-learn-dont-know" onClick={handleDontKnow}>
                    Không biết
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Progress */}
          <div className="ql-learn-bottom-nav">
            <button
              className="ql-learn-bottom-nav__btn"
              onClick={() => {
                if (currentIdx > 0) {
                  setCurrentIdx((i) => i - 1);
                  setSelectedOption(null);
                  setAnswered(false);
                  setIsCorrect(false);
                }
              }}
              disabled={currentIdx === 0}
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <div className="ql-learn-bottom-progress">
              <div className="ql-learn-bottom-progress__bar">
                <motion.div
                  className="ql-learn-bottom-progress__fill"
                  animate={{ width: `${progressPercent}%` }}
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
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="ql-learn-settings-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ql-learn-settings-panel__header">
              <span className="ql-learn-settings-panel__title">Cài đặt</span>
              <button
                className="ql-learn-settings-panel__close"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="ql-learn-settings-panel__group">
              <div className="ql-learn-settings-panel__label">Chế độ học</div>
              {STUDY_MODES.map(({ id: mId, label, icon: Icon }) => (
                <button
                  key={mId}
                  className={`ql-learn-settings-option ${mId === 'learn' ? 'active' : ''}`}
                  onClick={() => handleModeChange(mId)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="ql-learn-settings-panel__divider" />

            <div className="ql-learn-settings-panel__info">
              <span className="ql-learn-settings-panel__info-correct">
                <CheckCircle size={13} /> {correctCount} đúng
              </span>
              <span className="ql-learn-settings-panel__info-wrong">
                <XCircle size={13} /> {wrongCount} sai
              </span>
            </div>

            <div className="ql-learn-settings-panel__hint">
              Đáp án đúng được hiển thị sau khi bạn chọn
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
