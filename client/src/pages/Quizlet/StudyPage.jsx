import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Volume2, Check, XCircle,
  RotateCcw, Maximize2, Keyboard, Lightbulb, RefreshCw, Moon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import './StudyPage.css';

// Study modes
const MODES = {
  flashcards: { label: 'Thẻ ghi nhớ', color: '#f97316' },
  learn: { label: 'Học', color: '#8b5cf6' },
  test: { label: 'Kiểm tra', color: '#10b981' },
  match: { label: 'Khớp thẻ', color: '#f59e0b' },
};

export default function StudyPage() {
  const { id, mode } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const currentModeConfig = MODES[mode] || MODES.flashcards;

  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [learningCards, setLearningCards] = useState(new Set());
  const [trackProgress, setTrackProgress] = useState(true);
  const audioRef = useRef(null);

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
      setSet(setRes?.data ?? setRes);
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
  }, [goNext, goPrev, navigate, id]);

  /* ── Mark correct/incorrect ─────────────────────────────────────────── */
  const handleCorrect = useCallback(() => {
    if (!currentCard) return;
    setKnownCards((prev) => new Set([...prev, currentCard._id]));
    setLearningCards((prev) => {
      const next = new Set(prev);
      next.delete(currentCard._id);
      return next;
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
    if (currentIdx < totalCards - 1) {
      setTimeout(goNext, 300);
    } else {
      toast.success('Hoàn thành!');
    }
  }, [currentCard, currentIdx, totalCards, goNext]);

  /* ── Reset ────────────────────────────────────────────────────────────── */
  const handleReset = () => {
    setKnownCards(new Set());
    setLearningCards(new Set());
    setCurrentIdx(0);
    setIsFlipped(false);
    toast.success('Đã đặt lại tiến độ');
  };

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="sf-container">
        <div className="sf-loading">
          <div className="sf-spinner"></div>
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error || !set || cards.length === 0) {
    return (
      <div className="sf-container">
        <div className="sf-error">
          <p>{error || 'Không có thẻ để học'}</p>
          <button className="sf-back-btn" onClick={() => navigate(`/study-sets/${id}`)}>
            <ChevronLeft size={18} />
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-container">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header className="sf-topbar">
        <button className="sf-back-btn" onClick={() => navigate(`/study-sets/${id}`)}>
          <ChevronLeft size={20} />
          <span>Quay lại</span>
        </button>

        <div className="sf-topbar-center">
          <span className="sf-title">{set.title}</span>
          <span className="sf-counter">{currentIdx + 1} / {totalCards}</span>
        </div>

        <div className="sf-topbar-right">
          <button className="sf-icon-btn" onClick={handleReset} title="Học lại">
            <RefreshCw size={18} />
          </button>
          <button className="sf-icon-btn" onClick={() => document.documentElement.requestFullscreen?.()} title="Toàn màn hình">
            <Maximize2 size={18} />
          </button>
        </div>
      </header>

      {/* ── Progress Pills ─────────────────────────────────────────────── */}
      <div className="sf-progress-bar">
        <div 
          className="sf-progress-fill" 
          style={{ width: `${((currentIdx + 1) / totalCards) * 100}%` }}
        />
      </div>

      {/* ── Status Badges ──────────────────────────────────────────────── */}
      <div className="sf-badges">
        <div className="sf-badge sf-badge--learning">
          <span className="sf-badge-dot sf-badge-dot--orange"></span>
          <span>Đang học</span>
          <span className="sf-badge-count">{learningCards.size}</span>
        </div>
        <div className="sf-badge sf-badge--known">
          <span className="sf-badge-dot sf-badge-dot--green"></span>
          <span>Đã biết</span>
          <span className="sf-badge-count">{knownCards.size}</span>
        </div>
      </div>

      {/* ── Main Card ──────────────────────────────────────────────────── */}
      <div className="sf-card-area">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="sf-flashcard-wrapper"
          >
            <div
              className={`sf-card ${isFlipped ? 'sf-card--flipped' : ''}`}
              onClick={handleFlip}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleFlip()}
            >
              {/* Front */}
              <div className="sf-card-face sf-card-front">
                <div className="sf-card-controls">
                  <button 
                    className={`sf-hint-toggle ${showHint ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                  >
                    <Lightbulb size={14} />
                    <span>Gợi ý</span>
                  </button>
                </div>

                <div className="sf-card-content">
                  <AnimatePresence>
                    {showHint && currentCard?.hint && (
                      <motion.div 
                        className="sf-hint-text"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {currentCard.hint}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <motion.h1 
                    className="sf-card-word"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    key={currentCard?._id}
                  >
                    {currentCard?.front}
                  </motion.h1>
                  
                  {currentCard?.pronunciation && (
                    <span className="sf-phonetic">{currentCard.pronunciation}</span>
                  )}
                </div>
              </div>

              {/* Back */}
              <div className="sf-card-face sf-card-back">
                <div className="sf-card-controls">
                  <span className="sf-definition-label">Định nghĩa</span>
                </div>

                <div className="sf-card-content">
                  <motion.h1 
                    className="sf-card-word"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    key={`back-${currentCard?._id}`}
                  >
                    {currentCard?.back}
                  </motion.h1>
                  
                  {currentCard?.example && (
                    <p className="sf-example">"{currentCard.example}"</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
          className={`sf-nav-btn sf-nav-btn--prev ${currentIdx === 0 ? 'disabled' : ''}`}
          onClick={goPrev}
          disabled={currentIdx === 0}
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          className={`sf-nav-btn sf-nav-btn--next ${currentIdx === totalCards - 1 ? 'disabled' : ''}`}
          onClick={goNext}
          disabled={currentIdx === totalCards - 1}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* ── Floating Shortcut Bar ──────────────────────────────────────── */}
      <div className="sf-shortcut-bar">
        <Keyboard size={16} />
        <span>Nhấn <kbd>Space</kbd> hoặc click để lật thẻ</span>
      </div>

      {/* ── Bottom Controls ────────────────────────────────────────────── */}
      <div className="sf-bottom-controls">
        {/* Left: Progress Toggle */}
        <label className="sf-progress-toggle">
          <input 
            type="checkbox" 
            checked={trackProgress}
            onChange={(e) => setTrackProgress(e.target.checked)}
          />
          <span className="sf-toggle-track">
            <span className="sf-toggle-thumb"></span>
          </span>
          <span className="sf-toggle-label">Theo dõi tiến độ</span>
        </label>

        {/* Center: Answer Buttons */}
        <div className="sf-answer-btns">
          <motion.button 
            className="sf-answer-btn sf-answer-btn--wrong"
            onClick={handleIncorrect}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <XCircle size={28} />
          </motion.button>
          <motion.button 
            className="sf-answer-btn sf-answer-btn--correct"
            onClick={handleCorrect}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check size={28} />
          </motion.button>
        </div>

        {/* Right: Actions */}
        <div className="sf-action-btns">
          <button className="sf-action-btn" onClick={handleReset} title="Học lại">
            <RotateCcw size={18} />
          </button>
          <button 
            className="sf-action-btn" 
            onClick={() => document.documentElement.requestFullscreen?.()}
            title="Toàn màn hình"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
