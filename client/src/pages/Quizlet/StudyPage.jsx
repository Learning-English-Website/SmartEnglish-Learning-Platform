import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Volume2,
  RotateCcw, Maximize2, Minimize2, Keyboard, Lightbulb,
  BookOpen, Brain, ClipboardCheck, Box,
  Shuffle, VolumeX, ChevronDown, ArrowLeft, Settings, Star,
  Eye, Check, X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { progressService } from '../../services/progressService';
import { TestMode, MatchMode } from '../../components/study';
import './StudyPage.css';

const STUDY_MODES = [
  { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: BookOpen },
  { id: 'learn', label: 'Học', icon: Brain },
  { id: 'test', label: 'Kiểm tra', icon: ClipboardCheck },
  { id: 'match', label: 'Khớp thẻ', icon: Box },
];

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const mode = location.pathname.split('/').pop() || 'flashcards';
  const returnTo = location.state?.returnTo || `/flashcards/sets/${id}`;

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [roundCards, setRoundCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [learningCards, setLearningCards] = useState(new Set());
  const [nextRoundIds, setNextRoundIds] = useState(new Set());
  const [roundNum, setRoundNum] = useState(1);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const audioRef = useRef(null);

  // Header state
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFS, setIsFS] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [starredCards, setStarredCards] = useState(new Set());

  /* ── Auth check ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/flashcards/sets/${id}/${mode}`, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, id, mode]);

  /* ── Fetch data ──────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, cardsRes, schedulesRes] = await Promise.all([
        setService.getById(id),
        cardService.getBySetId(id),
        progressService.getCardSchedules(id),
      ]);
      setStudySet(setRes?.data ?? setRes);
      
      const cardsData = cardsRes?.data ?? cardsRes;
      const rawCards = Array.isArray(cardsData) ? cardsData : [];
      setCards(rawCards);

      const schedules = schedulesRes?.data ?? schedulesRes;
      const statusMap = new Map();
      if (Array.isArray(schedules)) {
        schedules.forEach(item => {
          statusMap.set(item.cardId, item.flashcardStatus);
        });
      }

      const initialKnown = new Set();
      const initialLearning = new Set();
      rawCards.forEach(c => {
        const stat = statusMap.get(c._id) || 'NEW';
        if (stat === 'KNOWN') {
          initialKnown.add(c._id);
        } else if (stat === 'LEARNING') {
          initialLearning.add(c._id);
        }
      });
      setKnownCards(initialKnown);
      setLearningCards(initialLearning);

      const activeCards = rawCards.filter(c => !initialKnown.has(c._id));
      setRoundCards(activeCards);
      setCurrentIdx(0);
      setRoundNum(1);
      setNextRoundIds(new Set());
      setIsSessionComplete(activeCards.length === 0 && rawCards.length > 0);
    } catch (err) {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentCard = roundCards[currentIdx];
  const totalCards = roundCards.length;

  /* ── Navigation ────────────────────────────────────────────────────────── */
  const goNext = useCallback(() => {
    if (currentIdx < totalCards - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => setCurrentIdx((p) => p + 1), 150);
    }
  }, [currentIdx, totalCards]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => setCurrentIdx((p) => p - 1), 150);
    }
  }, [currentIdx]);

  /* ── Flip ─────────────────────────────────────────────────────────────── */
  const handleFlip = () => setIsFlipped((p) => !p);

  /* ── Fullscreen ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleFsChange = () => setIsFS(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  /* ── Shuffle ─────────────────────────────────────────────────────────── */
  const handleShuffle = useCallback(() => {
    setRoundCards(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setCurrentIdx(0);
    setIsFlipped(false);
    setNextRoundIds(new Set());
    setIsShuffled(true);
    toast.success('Đã xáo trộn thẻ');
  }, []);

  /* ── Mode change ──────────────────────────────────────────────────────── */
  const handleModeChange = useCallback((m) => {
    if (m === 'flashcards') setModeDropdownOpen(false);
    else if (m === 'learn') navigate(`/flashcards/sets/${id}/learn`, { state: { returnTo } });
    else if (m === 'test') navigate(`/flashcards/sets/${id}/test`, { state: { returnTo } });
    else if (m === 'match') navigate(`/flashcards/sets/${id}/match`, { state: { returnTo } });
    setModeDropdownOpen(false);
  }, [id, navigate, returnTo]);

  /* ── Round ending logic ───────────────────────────────────────────────── */
  const handleRoundEnd = useCallback((nextIds) => {
    setIsFlipped(false);
    setShowHint(false);

    if (nextIds.size > 0) {
      const nextRoundCards = cards.filter(c => nextIds.has(c._id));
      setRoundCards(nextRoundCards);
      setNextRoundIds(new Set());
      setCurrentIdx(0);
      setRoundNum(prev => prev + 1);
      toast.success(`Bắt đầu vòng ${roundNum + 1} với ${nextIds.size} thẻ chưa thuộc!`);
    } else {
      setIsSessionComplete(true);
      toast.success('Chúc mừng! Bạn đã hoàn thành bộ thẻ.');
    }
  }, [cards, roundNum]);

  /* ── Mark correct/incorrect ─────────────────────────────────────────── */
  const handleCorrect = useCallback(() => {
    if (roundCards.length === 0) return;
    const currentCard = roundCards[currentIdx];
    if (!currentCard) return;
    const cardId = currentCard._id;

    setKnownCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setLearningCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });

    progressService.updateFlashcardStatus(cardId, 'KNOWN').catch(err => {
      console.error('Failed to update flashcard status:', err);
    });

    if (currentIdx < totalCards - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => setCurrentIdx((p) => p + 1), 300);
    } else {
      const updatedNextRoundIds = new Set(nextRoundIds);
      setTimeout(() => handleRoundEnd(updatedNextRoundIds), 300);
    }
  }, [currentIdx, roundCards, totalCards, nextRoundIds, handleRoundEnd]);

  const handleIncorrect = useCallback(() => {
    if (roundCards.length === 0) return;
    const currentCard = roundCards[currentIdx];
    if (!currentCard) return;
    const cardId = currentCard._id;

    setNextRoundIds(prev => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setLearningCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });

    progressService.updateFlashcardStatus(cardId, 'LEARNING').catch(err => {
      console.error('Failed to update flashcard status:', err);
    });

    if (currentIdx < totalCards - 1) {
      setIsFlipped(false);
      setShowHint(false);
      setTimeout(() => setCurrentIdx((p) => p + 1), 300);
    } else {
      const updatedNextRoundIds = new Set(nextRoundIds);
      updatedNextRoundIds.add(cardId);
      setTimeout(() => handleRoundEnd(updatedNextRoundIds), 300);
    }
  }, [currentIdx, roundCards, totalCards, nextRoundIds, handleRoundEnd]);

  /* ── Keyboard shortcuts ───────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); handleFlip(); }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === '1' || e.key === 'i') handleIncorrect();
      if (e.key === '2' || e.key === 'k') handleCorrect();
      if (e.key === 'Escape') navigate(`/flashcards/sets/${id}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, navigate, id, handleCorrect, handleIncorrect]);

  /* ── Reset ────────────────────────────────────────────────────────────── */
  const handleReset = async () => {
    try {
      await progressService.resetSetFlashcardProgress(id);
      setKnownCards(new Set());
      setLearningCards(new Set());
      setRoundCards(cards);
      setNextRoundIds(new Set());
      setRoundNum(1);
      setCurrentIdx(0);
      setIsSessionComplete(false);
      setIsFlipped(false);
      setShowHint(false);
      toast.success('Đã đặt lại tiến trình học thẻ');
    } catch (err) {
      console.error('Failed to reset set flashcard progress:', err);
      toast.error('Không thể đặt lại tiến độ');
    }
  };

  const toggleStar = useCallback((cardId) => {
    setStarredCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
        toast.success('Đã bỏ đánh dấu sao');
      } else {
        next.add(cardId);
        toast.success('Đã đánh dấu sao');
      }
      return next;
    });
  }, []);

  const speakCard = useCallback((text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  const getWordHint = useCallback((word) => {
    if (!word) return '';
    const clean = word.trim();
    if (clean.length === 0) return '';
    const first = clean.charAt(0);
    let rest = '';
    for (let i = 1; i < clean.length; i++) {
      const char = clean.charAt(i);
      if (/[a-zA-Z0-9]/.test(char)) {
        rest += '_';
      } else {
        rest += char;
      }
    }
    return first + rest;
  }, []);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="ql2-page">
        <div className="ql2-loading">
          <motion.div
            className="ql2-loading__icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <BookOpen size={48} />
          </motion.div>
          <span className="ql2-loading__text">Đang tải...</span>
        </div>
      </div>
    );
  }

  // Render TestMode when mode is 'test'
  if (mode === 'test') {
    return (
      <TestMode
        cards={cards.map(c => ({ id: c._id, front: c.front, back: c.back }))}
        setTitle={studySet.title}
        onClose={() => navigate(returnTo)}
        onModeChange={(newMode) => navigate(`/flashcards/sets/${id}/${newMode}`, { state: { returnTo } })}
        onComplete={(results) => {
          console.log('[StudyPage] Test completed:', results);
        }}
      />
    );
  }

  // Render MatchMode when mode is 'match'
  if (mode === 'match') {
    return (
      <MatchMode
        cards={cards}
        setId={id}
        setTitle={studySet.title}
        onClose={() => navigate(returnTo)}
        onModeChange={(newMode) => navigate(`/flashcards/sets/${id}/${newMode}`, { state: { returnTo } })}
      />
    );
  }

  if (error || !studySet) {
    return (
      <div className="ql2-page">
        <div className="ql2-loading">
          <p style={{ color: 'var(--ql2-error)' }}>{error || 'Không tìm thấy bộ thẻ'}</p>
          <button className="ql2-btn ql2-btn--ghost" onClick={() => navigate(returnTo)}>
            <ChevronLeft size={16} />Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="ql2-page">
        <div className="ql2-loading">
          <p style={{ color: 'var(--ql2-text-muted)' }}>Không có thẻ để học</p>
          <button className="ql2-btn ql2-btn--ghost" onClick={() => navigate(returnTo)}>
            <ChevronLeft size={16} />Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (isSessionComplete && cards.length > 0) {
    const knownCount = knownCards.size;
    const learningCount = learningCards.size;
    const totalCount = cards.length;

    // Percentages for the progress bars
    const knownPct = totalCount > 0 ? (knownCount / totalCount) * 100 : 0;
    const learningPct = totalCount > 0 ? (learningCount / totalCount) * 100 : 0;
    const remainingCount = Math.max(0, totalCount - knownCount - learningCount);
    const remainingPct = totalCount > 0 ? (remainingCount / totalCount) * 100 : 0;

    return (
      <div className="ql2-page session-complete-page">
        <header className="ql2-header">
          <div className="ql2-header__left">
            <button className="ql2-header__back" onClick={() => navigate(returnTo)}>
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', marginLeft: '12px' }}>
              Kết quả học thẻ
            </span>
          </div>
        </header>

        <div className="completion-container">
          <div className="confetti-decor" />
          
          <div className="completion-card">
            <h2 className="completion-title">Chà, bạn nắm bài thật chắc!</h2>
            <p className="completion-subtitle">Bạn đã sắp xếp tất cả các thẻ ghi nhớ.</p>

            <div className="completion-content-layout">
              {/* Left Column - Progress Ring and bars */}
              <div className="completion-left-col">
                <div className="completion-progress-ring-box">
                  <svg className="completion-progress-ring" width="140" height="140">
                    <circle 
                      className="ring-bg" 
                      stroke="rgba(0,0,0,0.05)" 
                      strokeWidth="10" 
                      fill="transparent" 
                      r="58" 
                      cx="70" 
                      cy="70"
                    />
                    <circle 
                      className="ring-fill" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      fill="transparent" 
                      r="58" 
                      cx="70" 
                      cy="70"
                      strokeDasharray="364.4"
                      strokeDashoffset={364.4 - (364.4 * knownPct) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="ring-center-content">
                    <Check size={36} color="#10b981" strokeWidth={3} />
                  </div>
                </div>

                <div className="completion-stats-bars">
                  <div className="stat-row">
                    <div className="stat-info">
                      <span className="stat-label text-known">Đã biết</span>
                      <span className="stat-value">{knownCount}</span>
                    </div>
                    <div className="stat-progress-track">
                      <div className="stat-progress-fill bg-known" style={{ width: `${knownPct}%` }} />
                    </div>
                  </div>

                  <div className="stat-row">
                    <div className="stat-info">
                      <span className="stat-label text-learning">Đang học</span>
                      <span className="stat-value">{learningCount}</span>
                    </div>
                    <div className="stat-progress-track">
                      <div className="stat-progress-fill bg-learning" style={{ width: `${learningPct}%` }} />
                    </div>
                  </div>

                  <div className="stat-row">
                    <div className="stat-info">
                      <span className="stat-label text-remaining">Còn lại</span>
                      <span className="stat-value">{remainingCount}</span>
                    </div>
                    <div className="stat-progress-track">
                      <div className="stat-progress-fill bg-remaining" style={{ width: `${remainingPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Next Steps */}
              <div className="completion-right-col">
                <h3 className="next-steps-title">Bước tiếp theo</h3>
                
                <button 
                  className="next-step-btn primary-btn"
                  onClick={() => navigate(`/flashcards/sets/${id}/learn`, { state: { returnTo } })}
                >
                  <Brain size={20} />
                  <div className="btn-text-box">
                    <span className="btn-main-text">Ôn luyện với các câu hỏi</span>
                    <span className="btn-sub-text">Học sâu hơn với chế độ Học</span>
                  </div>
                </button>

                <button 
                  className="next-step-btn secondary-btn"
                  onClick={handleReset}
                >
                  <RotateCcw size={20} />
                  <div className="btn-text-box">
                    <span className="btn-main-text">Đặt lại Thẻ ghi nhớ</span>
                    <span className="btn-sub-text">Học lại toàn bộ thẻ từ đầu</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="completion-footer">
          <button 
            className="footer-action-btn"
            onClick={() => {
              setIsSessionComplete(false);
              setRoundCards([cards[cards.length - 1]]);
              setCurrentIdx(0);
              setNextRoundIds(new Set());
            }}
          >
            Quay lại câu hỏi cuối cùng
          </button>
          <button 
            className="footer-action-btn primary"
            onClick={() => navigate(`/flashcards/sets/${id}`)}
          >
            Nhấp để quay lại Bộ thẻ
          </button>
        </footer>
      </div>
    );
  }

  const overallProgressNum = cards.length > 0 ? (cards.length - roundCards.length + currentIdx + 1) : 0;
  const progressPct = cards.length > 0 ? (overallProgressNum / cards.length) * 100 : 0;

  return (
    <div className="ql2-page">
      {/* Floating decorative elements */}
      <div className="ql2-page__decoration ql2-page__decoration--1" />
      <div className="ql2-page__decoration ql2-page__decoration--2" />

      {/* Header - giống hệt StudySetLearn */}
      <header className="ql2-header">
        <div className="ql2-header__left">
          <button className="ql2-header__back" onClick={() => navigate(returnTo)}>
            <ArrowLeft size={20} />
          </button>

          <div className="study-header__mode-selector" style={{ position: 'relative', marginLeft: '12px' }}>
            <button
              className="study-header__mode-btn"
              onClick={() => setModeDropdownOpen((v) => !v)}
              aria-label="Chuyển chế độ học"
            >
              <BookOpen size={18} />
              <span className="study-header__mode-label">Thẻ ghi nhớ</span>
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
                  {STUDY_MODES.map(({ id: mId, label, icon: Icon }) => (
                    <button
                      key={mId}
                      className={`study-header__mode-item ${mId === 'flashcards' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModeChange(mId);
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

        <div className="ql2-header__center">
          <div className="ql2-progress-bar">
            <div className="ql2-progress-bar__track">
              <div
                className="ql2-progress-bar__batch current"
                style={{ '--puck-pos': 0 }}
                data-tooltip={`${overallProgressNum} / ${cards.length}`}
              >
                <div className="ql2-progress-bar__batch-bg" />
                <div
                  className="ql2-progress-bar__batch-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="ql2-progress-bar__total">{cards.length}</div>
          </div>
        </div>

        <div className="ql2-header__right">
          <button
            className="ql2-header__btn"
            onClick={handleReset}
            title="Học lại"
          >
            <RotateCcw size={18} />
          </button>
          <button
            className={`ql2-header__btn ${isShuffled ? 'active' : ''}`}
            onClick={handleShuffle}
            title="Xáo trộn"
          >
            <Shuffle size={18} />
          </button>
          <button
            className={`ql2-header__btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Âm thanh"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="ql2-header__btn"
            onClick={handleFullscreenClick}
            title="Toàn màn hình"
          >
            {isFS ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Backdrop for mode dropdown */}
        {modeDropdownOpen && (
          <div
            className="study-header__backdrop"
            onClick={() => setModeDropdownOpen(false)}
          />
        )}
      </header>

      <div className="review-body">
        {/* Bucket Counter Row */}
        <div className="ql-flashcard-bucket-counter">
          <div className="bucket-counter-item learning-bucket">
            <span className="bucket-number">{learningCards.size}</span>
            <span className="bucket-label">Đang học</span>
          </div>
          <div className="bucket-counter-item known-bucket">
            <span className="bucket-label">Đã biết</span>
            <span className="bucket-number">{knownCards.size}</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="review-card-perspective">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="review-flashcard-motion-wrapper"
              style={{ width: '100%', height: '100%' }}
            >
              <motion.div
                className={`review-flashcard ${isFlipped ? 'flipped' : ''}`}
                onClick={handleFlip}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ transformStyle: 'preserve-3d' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleFlip()}
              >
                {/* Front Side */}
                <div className="card-face card-front">
                  <div className="card-top-hint">THẺ GHI NHỚ</div>

                  {/* Top-left Star & Hint buttons */}
                  {currentCard && (
                    <div className="card-top-left-group">
                      <button
                        className={`card-star-btn ${starredCards.has(currentCard._id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(currentCard._id);
                        }}
                        title="Đánh dấu sao"
                      >
                        <Star
                          size={20}
                          fill={starredCards.has(currentCard._id) ? '#f59e0b' : 'none'}
                          color={starredCards.has(currentCard._id) ? '#f59e0b' : 'currentColor'}
                        />
                      </button>

                      <button
                        className={`card-hint-btn ${showHint ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(!showHint);
                        }}
                        title="Gợi ý"
                      >
                        <Lightbulb size={20} />
                        {showHint && (
                          <span className="card-hint-tooltip" onClick={(e) => e.stopPropagation()}>
                            {currentCard.hint || `Gợi ý: ${getWordHint(currentCard.front)}`}
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Top-right Pronunciation button */}
                  {currentCard?.pronunciation && (
                    <div 
                      className="card-audio-top-right" 
                      onClick={(e) => { e.stopPropagation(); speakCard(currentCard.front); }}
                      title="Phát âm"
                    >
                      <Volume2 size={20} className="speak-icon" />
                      <span className="card-ipa-tooltip">{currentCard.pronunciation}</span>
                    </div>
                  )}

                  <div className="card-front-center-group">
                    <div className="card-main-word">
                      {currentCard?.front}
                    </div>
                  </div>

                  <div className="flip-prompt">
                    <Eye size={16} /> Click vào thẻ hoặc nhấn Phím Cách để xem đáp án
                  </div>
                </div>

                {/* Back Side */}
                <div className="card-face card-back">
                  <div className="card-top-hint">ĐỊNH NGHĨA</div>

                  {/* Top-left Star button */}
                  {currentCard && (
                    <div className="card-top-left-group">
                      <button
                        className={`card-star-btn ${starredCards.has(currentCard._id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(currentCard._id);
                        }}
                        title="Đánh dấu sao"
                      >
                        <Star
                          size={20}
                          fill={starredCards.has(currentCard._id) ? '#f59e0b' : 'none'}
                          color={starredCards.has(currentCard._id) ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    </div>
                  )}

                  <div className={`card-back-content ${currentCard?.imageUrl ? 'has-image' : 'no-image'}`}>
                    <div className="card-back-info">
                      <div className="card-back-meaning">
                        {currentCard?.back}
                      </div>

                      {currentCard?.example && (
                        <p className="card-back-example">"{currentCard.example}"</p>
                      )}

                      {currentCard?.collocation && (
                        <div className="card-back-extra">
                          <strong>Cụm từ:</strong> {currentCard.collocation}
                        </div>
                      )}

                      {currentCard?.relatedWords && (
                        <div className="card-back-extra">
                          <strong>Từ liên quan:</strong> {currentCard.relatedWords}
                        </div>
                      )}
                    </div>

                    {currentCard?.imageUrl && (
                      <div className="card-back-image-wrapper">
                        <img
                          alt={currentCard?.back}
                          src={currentCard.imageUrl}
                          className="card-back-image"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flip-prompt">
                    <Eye size={16} /> Click vào thẻ để quay lại mặt trước
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            className={`ql2-nav-btn ql2-nav-btn--prev ${currentIdx === 0 ? 'disabled' : ''}`}
            onClick={goPrev}
            disabled={currentIdx === 0}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className={`ql2-nav-btn ql2-nav-btn--next ${currentIdx === totalCards - 1 ? 'disabled' : ''}`}
            onClick={goNext}
            disabled={currentIdx === totalCards - 1}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Rating buttons (always visible) */}
        <div className="rating-container-circle">
          <button 
            className="rate-circle-btn rate-circle-again" 
            onClick={(e) => { e.stopPropagation(); handleIncorrect(); }} 
            title="Đang học (Phím 1)"
          >
            <X size={24} />
          </button>
          <button 
            className="rate-circle-btn rate-circle-remembered" 
            onClick={(e) => { e.stopPropagation(); handleCorrect(); }} 
            title="Đã biết (Phím 2)"
          >
            <Check size={24} />
          </button>
        </div>

      </div>
    </div>
  );
}
