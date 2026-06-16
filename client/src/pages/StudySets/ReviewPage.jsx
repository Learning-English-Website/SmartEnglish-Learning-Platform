import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ArrowLeft,
  Sparkles, Trophy, Zap, Volume2, Eye,
  X, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { progressService } from '../../services/progressService';
import { gamificationService } from '../../api/gamificationService';
import { useGamification } from '../../context/GamificationContext';
import './ReviewPage.css';

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setId, cardId, returnTo, reviewMode } = location.state || {};
  const isPreviewMode = reviewMode === 'new-card-preview';

  const [dueCards, setDueCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screen, setScreen] = useState('loading'); // 'loading' | 'empty' | 'study' | 'complete'
  const isSubmittingRef = useRef(false);
  
  const { triggerRewards } = useGamification();

  // Load due or new cards
  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = isPreviewMode
          ? await progressService.getNewCards(undefined, 10)
          : await progressService.getDueCards(setId);
        const loadedCards = res?.data?.data ?? res?.data ?? res ?? [];
        const cards = cardId
          ? [...loadedCards].sort((a, b) => {
              if (a._id === cardId) return -1;
              if (b._id === cardId) return 1;
              return 0;
            })
          : loadedCards;
        if (cards.length === 0) {
          setScreen('empty');
        } else {
          setDueCards(cards);
          setTotalDue(cards.length);
          setScreen('study');
        }
      } catch (err) {
        console.error('Failed to load cards:', err);
        toast.error(isPreviewMode ? 'Không thể tải danh sách từ mới' : 'Không thể tải danh sách thẻ cần ôn');
        setScreen('empty');
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [setId, cardId, isPreviewMode]);

  const currentCard = dueCards[currentIndex] || null;

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleRate = useCallback(async (quality) => {
    if (isSubmittingRef.current || !currentCard) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (isPreviewMode) {
        // Preview mode: complete learning only if marked as known (quality === 4)
        if (quality === 4) {
          await progressService.completeLearning(currentCard._id);
        }
      } else {
        // Standard review mode: update progress using SM-2
        await progressService.updateCardProgress(currentCard._id, quality);
      }
      setReviewedCount(c => c + 1);
      
      // Move to next card
      if (currentIndex + 1 >= dueCards.length) {
        setScreen('complete');
        // Trigger gamification rewards for reviews (not previews)
        if (!isPreviewMode) {
          gamificationService.triggerLearnComplete({ accuracy: 100, cardsStudied: totalDue })
            .then(r => {
              const data = r.data?.data ?? r.data;
              if (data?.xp || data?.newAchievements?.length > 0) triggerRewards(data);
            })
            .catch(console.error);
        }
      } else {
        setFlipped(false);
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
      toast.error('Có lỗi xảy ra khi cập nhật tiến độ');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [currentCard, currentIndex, dueCards.length, totalDue, triggerRewards, isPreviewMode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (screen !== 'study' || !currentCard) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped(prev => !prev);
      }

      if (['1', '2', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === '1' || e.key === 'ArrowLeft') handleRate(0); // Again
        if (e.key === '2' || e.key === 'ArrowRight') handleRate(4); // Good
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentCard, handleRate]);

  if (loading || screen === 'loading') {
    return (
      <div className="review-page loading-screen">
        <motion.div 
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={40} />
        </motion.div>
        <p>{isPreviewMode ? 'Đang tải danh sách từ mới...' : 'Đang chuẩn bị lịch ôn tập hôm nay...'}</p>
      </div>
    );
  }

  if (screen === 'empty') {
    return (
      <div className="review-page empty-screen">
        <div className="empty-content-card">
          <Trophy size={48} className="empty-icon" />
          <h2>{isPreviewMode ? 'Không còn từ mới để lướt' : 'Tuyệt vời! Không có thẻ nào cần ôn tập'}</h2>
          <p>
            {isPreviewMode 
              ? 'Bạn đã lướt xem qua toàn bộ từ mới của hệ thống rồi. Hãy tạo thêm bộ thẻ mới hoặc quay lại học nhé!'
              : 'Hôm nay bạn đã ôn tập đầy đủ tất cả các thẻ của mình rồi. Hãy tiếp tục học thêm từ mới nhé!'}
          </p>
          <div className="empty-actions">
            {!isPreviewMode && (
              <button className="rv-btn primary" onClick={() => navigate('/flashcards/learn-new')}>Học từ mới</button>
            )}
            <button className="rv-btn secondary" onClick={() => navigate('/dashboard')}>Trang chủ</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    return (
      <div className="review-page complete-screen">
        <motion.div 
          className="complete-content-card"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <Trophy size={64} className="trophy-gold" />
          <h1>{isPreviewMode ? 'Đã lướt qua toàn bộ từ mới!' : 'Hoàn thành ôn tập!'}</h1>
          <p className="subtitle">
            {isPreviewMode 
              ? `Chúc mừng bạn đã lướt xem xong ${totalDue} thẻ từ mới!`
              : `Chúc mừng bạn đã ôn tập xong tất cả ${totalDue} thẻ hôm nay!`}
          </p>
          
          {!isPreviewMode && (
            <div className="xp-reward-box">
              <Zap size={20} className="xp-icon" />
              <span>Bạn đã được cộng điểm và tích lũy XP!</span>
            </div>
          )}

          <div className="complete-actions">
            <button className="rv-btn primary" onClick={() => navigate('/dashboard')}>Trở lại Trang chủ</button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPercent = totalDue > 0 ? Math.round((reviewedCount / totalDue) * 100) : 0;

  return (
    <div className="review-page">
      <div className="review-header">
        <button className="back-btn" onClick={() => navigate(returnTo || '/dashboard')}>
          <ArrowLeft size={20} />
          <span>Thoát</span>
        </button>
        <div className="progress-container">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-text">
            {isPreviewMode 
              ? `Đang lướt từ mới: ${reviewedCount}/${totalDue}`
              : `Hoàn thành: ${reviewedCount}/${totalDue} thẻ`}
          </span>
        </div>
        <div className="header-icon-box">
          <BookOpen size={20} />
        </div>
      </div>

      <div className="review-body">
        <div className="review-card-perspective">
          <motion.div 
            className={`review-flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(prev => !prev)}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Front Side */}
            <div className="card-face card-front">
              <div className="card-top-hint">THẺ GHI NHỚ</div>
              
              {currentCard?.pronunciation && (
                <div 
                  className="card-audio-top-right" 
                  onClick={(e) => { e.stopPropagation(); speak(currentCard.front); }}
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
              
              <div className={`card-back-content ${currentCard?.imageUrl ? 'has-image' : 'no-image'}`}>
                <div className="card-back-info">
                  <div className="card-back-meaning">{currentCard?.back}</div>
                  
                  {currentCard?.example && (
                    <div className="card-back-example">"{currentCard.example}"</div>
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
                      src={currentCard.imageUrl} 
                      alt={currentCard.back} 
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
        </div>

        {/* Rating buttons (always visible) */}
        <div className="rating-container-circle">
          <button 
            className="rate-circle-btn rate-circle-again" 
            onClick={(e) => { e.stopPropagation(); handleRate(0); }} 
            disabled={isSubmitting}
            title="Chưa nhớ (Phím 1 hoặc Mũi tên Trái)"
          >
            <X size={24} />
          </button>
          <button 
            className="rate-circle-btn rate-circle-remembered" 
            onClick={(e) => { e.stopPropagation(); handleRate(4); }} 
            disabled={isSubmitting}
            title="Đã nhớ (Phím 2 hoặc Mũi tên Phải)"
          >
            <Check size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
