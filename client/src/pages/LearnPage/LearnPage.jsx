import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, RotateCcw, Brain,
  CheckCircle2, XCircle, Eye, EyeOff, Volume2,
  X, Zap, Trophy, Target, Flame
} from 'lucide-react';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner';
import './LearnPage.css';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ────────────────────────────────────────────────────────
// Card component — 3D flip
// ────────────────────────────────────────────────────────
function FlashCard({ card, isFlipped, onFlip, onSpeak }) {
  return (
    <div className="lp-card-scene" onClick={onFlip}>
      <motion.div
        className="lp-card"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className="lp-card-face lp-card-front">
          <div className="lp-card-eyebrow">Thuật ngữ</div>
          <div className="lp-card-content">{card.front}</div>
          <div className="lp-card-hint">Nhấn để lật thẻ</div>
        </div>

        {/* Back */}
        <div className="lp-card-face lp-card-back">
          <div className="lp-card-eyebrow">Định nghĩa</div>
          <div className="lp-card-content">{card.back}</div>
          <div className="lp-card-hint">Nhấn để lật lại</div>
        </div>
      </motion.div>

      {/* Speak button sits outside the flip container */}
      <button
        className="lp-speak-btn"
        onClick={(e) => { e.stopPropagation(); onSpeak(card.back); }}
        title="Phát âm"
      >
        <Volume2 size={15} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Progress dot strip
// ────────────────────────────────────────────────────────
function ProgressDots({ total, current, answered }) {
  return (
    <div className="lp-progress-dots">
      {Array.from({ length: Math.min(total, 30) }, (_, i) => {
        const idx = total > 30 ? Math.floor((i / 29) * (total - 1)) : i;
        const isCurrent = idx === current;
        const isDone = answered[idx];
        return (
          <div
            key={i}
            className={[
              'lp-dot',
              isCurrent ? 'lp-dot--active' : '',
              isDone ? 'lp-dot--done' : '',
            ].filter(Boolean).join(' ')}
          />
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Results screen
// ────────────────────────────────────────────────────────
function ResultsScreen({ stats, setTitle, onRetry, onBack }) {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (pct / 100) * circumference;
  const grade =
    pct >= 90 ? { emoji: '🏆', label: 'Xuất sắc!', sub: 'Bạn đã nắm vững hoàn toàn!' } :
    pct >= 70 ? { emoji: '🌟', label: 'Tốt lắm!', sub: 'Chỉ cần ôn tập thêm một chút.' } :
    pct >= 50 ? { emoji: '💪', label: 'Cố gắng hơn!', sub: 'Hãy học lại những thẻ chưa thuộc.' } :
    { emoji: '📚', label: 'Cần luyện tập!', sub: 'Đừng bỏ cuộc, bắt đầu lại ngay!' };

  return (
    <motion.div
      className="lp-results"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="lp-results-badge">{grade.emoji}</div>
      <h1 className="lp-results-title">{grade.label}</h1>
      <p className="lp-results-sub">{grade.sub}</p>
      <p className="lp-results-set">{setTitle}</p>

      {/* Score ring */}
      <div className="lp-score-ring">
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <circle cx="65" cy="65" r="52" fill="none" stroke="var(--lp-border)" strokeWidth="9" />
          <circle
            cx="65" cy="65" r="52" fill="none"
            stroke="url(#rg)" strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="lp-score-ring-inner">
          <span className="lp-score-ring-pct">{pct}%</span>
          <span className="lp-score-ring-lbl">Điểm</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="lp-results-stats">
        <div className="lp-stat-card">
          <CheckCircle2 size={20} className="lp-stat-icon lp-stat-icon--correct" />
          <span className="lp-stat-num">{stats.correct}</span>
          <span className="lp-stat-lbl">Đúng</span>
        </div>
        <div className="lp-stat-card">
          <XCircle size={20} className="lp-stat-icon lp-stat-icon--wrong" />
          <span className="lp-stat-num">{stats.wrong}</span>
          <span className="lp-stat-lbl">Sai</span>
        </div>
        <div className="lp-stat-card">
          <Target size={20} className="lp-stat-icon lp-stat-icon--neutral" />
          <span className="lp-stat-num">{stats.total}</span>
          <span className="lp-stat-lbl">Tổng thẻ</span>
        </div>
        <div className="lp-stat-card">
          <Flame size={20} className="lp-stat-icon lp-stat-icon--streak" />
          <span className="lp-stat-num">{stats.bestStreak}</span>
          <span className="lp-stat-lbl">Chuỗi tốt nhất</span>
        </div>
      </div>

      {/* Actions */}
      <div className="lp-results-actions">
        <button className="lp-btn lp-btn--ghost" onClick={onBack}>
          <ChevronLeft size={16} />Quay lại
        </button>
        <button className="lp-btn lp-btn--primary" onClick={onRetry}>
          <RotateCcw size={16} />Học lại
        </button>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────
// Main LearnPage
// ────────────────────────────────────────────────────────
export default function LearnPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Session tracking
  const [answered, setAnswered] = useState([]); // array of null | 'correct' | 'wrong'
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Session type: 'browse' | 'learn'
  const [sessionType, setSessionType] = useState('learn');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [setRes, cardsRes] = await Promise.all([
          setService.getById(id),
          cardService.getBySetId(id),
        ]);
        const loadedSet = setRes?.data ?? setRes;
        const loadedCards = Array.isArray(cardsRes?.data)
          ? cardsRes.data
          : (cardsRes ?? []);
        setStudySet(loadedSet);
        setCards(shuffleArray(loadedCards));
      } catch {
        toast.error('Không thể tải học phần.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Reset card state on navigation
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (isDone) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setIsFlipped((f) => !f); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDone, currentIdx, cards.length]);

  const handleNext = useCallback(() => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setIsDone(true);
    }
  }, [currentIdx, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
    }
  }, [currentIdx]);

  const markAnswer = (isCorrect) => {
    const newAnswered = [...answered];
    newAnswered[currentIdx] = isCorrect ? 'correct' : 'wrong';
    setAnswered(newAnswered);

    if (isCorrect) {
      setCorrect((c) => c + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }
    setIsFlipped(true);
  };

  const handleRetry = () => {
    setCards(shuffleArray([...cards]));
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsDone(false);
    setAnswered([]);
    setCorrect(0);
    setWrong(0);
    setStreak(0);
    setBestStreak(0);
  };

  const progressPct = cards.length > 0 ? ((currentIdx + (answered[currentIdx] ? 1 : 0)) / cards.length) * 100 : 0;
  const currentCard = cards[currentIdx];
  const answeredCount = answered.filter(Boolean).length;
  const accuracy = answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : 0;

  if (loading) return <LoadingSpinner fullScreen text="Đang tải học phần..." />;

  if (!studySet || cards.length === 0) {
    return (
      <div className="lp-page">
        <div className="lp-empty">
          <Brain size={48} className="lp-empty-icon" />
          <h2>Không tìm thấy học phần</h2>
          <p>Hoặc học phần này chưa có thẻ nào.</p>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────
  if (isDone) {
    return (
      <div className="lp-page">
        <ResultsScreen
          stats={{ total: cards.length, correct, wrong, bestStreak }}
          setTitle={studySet.title}
          onRetry={handleRetry}
          onBack={() => navigate(`/study-sets/${id}`)}
        />
      </div>
    );
  }

  // ── Active learning screen ────────────────────────────────
  return (
    <div className="lp-page">

      {/* Top bar */}
      <div className="lp-topbar">
        <div className="lp-topbar-left">
          <button className="lp-topbar-back" onClick={() => navigate(`/study-sets/${id}`)}>
            <ChevronLeft size={16} />
          </button>
          <div className="lp-topbar-set">
            <Brain size={15} className="lp-topbar-icon" />
            <span className="lp-topbar-title">{studySet.title}</span>
          </div>
        </div>

        <div className="lp-topbar-center">
          <div className="lp-progress-track">
            <motion.div
              className="lp-progress-fill"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
          <span className="lp-progress-label">{currentIdx + 1} / {cards.length}</span>
        </div>

        <div className="lp-topbar-right">
          <button className="lp-topbar-close" onClick={() => navigate(`/study-sets/${id}`)} title="Đóng">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="lp-stats-bar">
        <div className="lp-stats-left">
          <div className="lp-stat-pill lp-stat-pill--correct">
            <CheckCircle2 size={13} />{correct} đúng
          </div>
          <div className="lp-stat-pill lp-stat-pill--wrong">
            <XCircle size={13} />{wrong} sai
          </div>
          {streak >= 2 && (
            <motion.div
              className="lp-streak-pill"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Flame size={13} />{streak} chuỗi
            </motion.div>
          )}
        </div>
        {answeredCount > 0 && (
          <div className="lp-accuracy-pill">
            <Target size={13} />{accuracy}% chính xác
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lp-content">

        {/* Progress dots */}
        <ProgressDots total={cards.length} current={currentIdx} answered={answered} />

        {/* Card area */}
        <div className="lp-card-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="lp-card-wrapper"
            >
              <FlashCard
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((f) => !f)}
                onSpeak={speak}
              />
            </motion.div>
          </AnimatePresence>

          {/* Flip button */}
          <div className="lp-flip-row">
            <button
              className="lp-btn lp-btn--flip"
              onClick={() => setIsFlipped((f) => !f)}
            >
              <RotateCcw size={15} />Lật thẻ
            </button>
          </div>

          {/* Answer buttons */}
          {!answered[currentIdx] ? (
            <div className="lp-answer-row">
              <button
                className="lp-btn lp-btn--wrong"
                onClick={() => markAnswer(false)}
              >
                <XCircle size={18} />Chưa thuộc
              </button>
              <button
                className="lp-btn lp-btn--correct"
                onClick={() => markAnswer(true)}
              >
                <CheckCircle2 size={18} />Đã thuộc
              </button>
            </div>
          ) : (
            <div className="lp-answer-feedback">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`lp-feedback-badge ${answered[currentIdx] === 'correct' ? 'lp-feedback-badge--correct' : 'lp-feedback-badge--wrong'}`}
              >
                {answered[currentIdx] === 'correct' ? (
                  <><CheckCircle2 size={16} />Chính xác!</>
                ) : (
                  <><XCircle size={16} />Chưa đúng. Đáp án: {currentCard?.back}</>
                )}
              </motion.div>
              <button
                className="lp-btn lp-btn--primary lp-btn--next"
                onClick={handleNext}
              >
                {currentIdx < cards.length - 1 ? (
                  <>Tiếp theo <ChevronRight size={16} /></>
                ) : (
                  <>Hoàn thành <Trophy size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Navigation strip */}
        <div className="lp-nav-strip">
          <button
            className="lp-nav-arrow"
            onClick={handlePrev}
            disabled={currentIdx === 0}
            title="Thẻ trước"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="lp-nav-info">
            <span className="lp-nav-current">{currentIdx + 1}</span>
            <span className="lp-nav-sep">/</span>
            <span className="lp-nav-total">{cards.length}</span>
          </div>

          <button
            className="lp-nav-arrow"
            onClick={handleNext}
            disabled={currentIdx === cards.length - 1}
            title="Thẻ tiếp"
          >
            <ChevronRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}
