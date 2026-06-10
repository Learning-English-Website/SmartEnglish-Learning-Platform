import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Volume2,
  RotateCcw, Maximize2, Minimize2, Keyboard, Lightbulb,
  BookOpen, Brain, ClipboardCheck, Box,
  Shuffle, VolumeX, ChevronDown, ArrowLeft, Settings, Star,
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
  const returnTo = location.state?.returnTo || `/study-sets/${id}`;

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [learningCards, setLearningCards] = useState(new Set());
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
      navigate(`/login?redirect=/study-sets/${id}/${mode}`, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, id, mode]);

  /* ── Fetch data ──────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [setRes, cardsRes] = await Promise.all([
        setService.getById(id),
        cardService.getBySetId(id),
      ]);
      setStudySet(setRes?.data ?? setRes);
      const cardsData = cardsRes?.data ?? cardsRes;
      setCards(Array.isArray(cardsData) ? cardsData : []);
    } catch (err) {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentCard = cards[currentIdx];
  const totalCards = cards.length;

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
    setCards(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setCurrentIdx(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setLearningCards(new Set());
    setIsShuffled(true);
    toast.success('Đã xáo trộn thẻ');
  }, []);

  /* ── Mode change ──────────────────────────────────────────────────────── */
  const handleModeChange = useCallback((m) => {
    if (m === 'flashcards') setModeDropdownOpen(false);
    else if (m === 'learn') navigate(`/study-sets/${id}/learn`, { state: { returnTo } });
    else if (m === 'test') navigate(`/study-sets/${id}/test`, { state: { returnTo } });
    else if (m === 'match') navigate(`/study-sets/${id}/match`, { state: { returnTo } });
    setModeDropdownOpen(false);
  }, [id, navigate, returnTo]);

  /* ── Mark correct/incorrect ─────────────────────────────────────────── */
  const handleCorrect = useCallback(() => {
    if (!currentCard) return;
    setKnownCards((prev) => new Set([...prev, currentCard._id]));
    setLearningCards((prev) => {
      const next = new Set(prev);
      next.delete(currentCard._id);
      return next;
    });
    progressService.updateCardProgress(currentCard._id, 3).catch(err => {
      console.error('Failed to update progress:', err);
    });
    if (currentIdx < totalCards - 1) {
      setTimeout(goNext, 300);
    } else {
      toast.success('Hoàn thành!');
    }
  }, [currentCard, currentIdx, totalCards, goNext]);

  const handleIncorrect = useCallback(() => {
    if (!currentCard) return;
    setLearningCards((prev) => new Set([...prev, currentCard._id]));
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentCard._id);
      return next;
    });
    progressService.updateCardProgress(currentCard._id, 0).catch(err => {
      console.error('Failed to update progress:', err);
    });
    if (currentIdx < totalCards - 1) {
      setTimeout(goNext, 300);
    } else {
      toast.success('Hoàn thành!');
    }
  }, [currentCard, currentIdx, totalCards, goNext]);

  /* ── Keyboard shortcuts ───────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); handleFlip(); }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === '1' || e.key === 'i') handleIncorrect();
      if (e.key === '2' || e.key === 'k') handleCorrect();
      if (e.key === 'Escape') navigate(`/study-sets/${id}`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, navigate, id, handleCorrect, handleIncorrect]);

  /* ── Reset ────────────────────────────────────────────────────────────── */
  const handleReset = () => {
    setKnownCards(new Set());
    setLearningCards(new Set());
    setCurrentIdx(0);
    setIsFlipped(false);
    toast.success('Đã đặt lại tiến độ');
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
        onModeChange={(newMode) => navigate(`/study-sets/${id}/${newMode}`, { state: { returnTo } })}
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
        onModeChange={(newMode) => navigate(`/study-sets/${id}/${newMode}`, { state: { returnTo } })}
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

  const progressPct = totalCards > 0 ? ((currentIdx + 1) / totalCards) * 100 : 0;

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
              >
                <div className="ql2-progress-bar__batch-bg" />
                <div
                  className="ql2-progress-bar__batch-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="ql2-progress-bar__total">{totalCards}</div>
          </div>
          <span className="ql2-progress-label" style={{ marginLeft: '12px' }}>
            {currentIdx + 1} / {totalCards}
          </span>
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

      <div className="ql2-content">
        {/* Main Card */}
        <div className="ql2-card-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="ql2-flashcard-wrapper"
            >
              <div
                className={`ql2-flashcard ${isFlipped ? 'ql2-flashcard--flipped' : ''}`}
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleFlip()}
              >
                {/* Front */}
                <div className="ql2-flashcard__face ql2-flashcard__front">
                  <div className="ql2-flashcard__controls">
                    <button
                      className={`ql2-hint-toggle ${showHint ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                    >
                      <Lightbulb size={14} />
                      <span className={showHint ? 'ql2-hint-mask' : ''}>
                        {showHint ? getWordHint(currentCard?.front) : 'Hiển thị gợi ý'}
                      </span>
                    </button>

                    <div className="ql2-flashcard__right-controls">
                      <button
                        className="ql2-card-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakCard(currentCard?.front);
                        }}
                        title="Nghe phát âm"
                      >
                        <Volume2 size={16} />
                      </button>

                      <button
                        className={`ql2-card-action-btn ${starredCards.has(currentCard?._id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(currentCard?._id);
                        }}
                        title="Đánh dấu sao"
                      >
                        <Star
                          size={16}
                          fill={starredCards.has(currentCard?._id) ? '#f59e0b' : 'none'}
                          color={starredCards.has(currentCard?._id) ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="ql2-flashcard__content">
                    <AnimatePresence>
                      {showHint && currentCard?.hint && (
                        <motion.div
                          className="ql2-hint-text"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          {currentCard.hint}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.h1
                      className="ql2-flashcard__word"
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      key={currentCard?._id}
                    >
                      {currentCard?.front}
                    </motion.h1>

                    {currentCard?.pronunciation && (
                      <span className="ql2-phonetic">{currentCard.pronunciation}</span>
                    )}
                  </div>

                  <div className="ql2-flashcard__hint-bottom">
                    Nhấn để lật thẻ
                  </div>
                </div>

                {/* Back */}
                <div className="ql2-flashcard__face ql2-flashcard__back">
                  <div className="ql2-flashcard__controls">
                    <span className="ql2-definition-label">Định nghĩa</span>

                    <div className="ql2-flashcard__right-controls">
                      <button
                        className={`ql2-card-action-btn ${starredCards.has(currentCard?._id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(currentCard?._id);
                        }}
                        title="Đánh dấu sao"
                      >
                        <Star
                          size={16}
                          fill={starredCards.has(currentCard?._id) ? '#f59e0b' : 'none'}
                          color={starredCards.has(currentCard?._id) ? '#f59e0b' : 'currentColor'}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="ql2-flashcard__content">
                    <div className="ql2-flashcard__back-content-layout">
                      <div className="ql2-flashcard__back-text-section">
                        <motion.h1
                          className="ql2-flashcard__word ql2-flashcard__word--back"
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          key={`back-${currentCard?._id}`}
                        >
                          {currentCard?.back}
                        </motion.h1>

                        {currentCard?.example && (
                          <p className="ql2-example">"{currentCard.example}"</p>
                        )}
                      </div>

                      {currentCard?.imageUrl && (
                        <div className="ql2-flashcard__image-container">
                          <img
                            alt={currentCard?.back}
                            src={currentCard.imageUrl}
                            className="ql2-flashcard__image"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ql2-flashcard__hint-bottom ql2-flashcard__hint-bottom--back">
                    Nhấn để lật lại
                  </div>
                </div>
              </div>
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

        {/* Action Buttons for SM-2 Spaced Repetition */}
        <div className="ql-flashcard-actions" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          <button
            className="ql-action-btn ql-action-btn--incorrect"
            onClick={handleIncorrect}
            style={{
              padding: '12px 28px',
              borderRadius: '24px',
              border: '2px solid #ef4444',
              background: '#fef2f2',
              color: '#ef4444',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            Chưa thuộc (⚡)
          </button>
          <button
            className="ql-action-btn ql-action-btn--correct"
            onClick={handleCorrect}
            style={{
              padding: '12px 28px',
              borderRadius: '24px',
              border: '2px solid #22c55e',
              background: '#f0fdf4',
              color: '#22c55e',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            Đã thuộc (✓)
          </button>
        </div>
      </div>
    </div>
  );
}
