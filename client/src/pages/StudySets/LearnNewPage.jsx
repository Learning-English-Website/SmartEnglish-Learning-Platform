import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, CheckCircle, XCircle, ArrowLeft, RotateCcw,
  Sparkles, Trophy, Zap, HelpCircle, Volume2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { progressService } from '../../services/progressService';
import { gamificationService } from '../../api/gamificationService';
import { useGamification } from '../../context/GamificationContext';
import './LearnNewPage.css';

export default function LearnNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviewMode, includeWritten, returnTo } = location.state || {};
  const isDuePractice = reviewMode === 'due-card-practice';
  const hasWritten = includeWritten === true;

  const [cards, setCards] = useState([]);
  const [queue, setQueue] = useState([]);
  const [streaks, setStreaks] = useState(new Map()); // cardId -> streak (0, 1, or 2)
  const [completedCardIds, setCompletedCardIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  
  const streaksRef = useRef(new Map());
  const completedCardIdsRef = useRef(new Set());
  const answeredRef = useRef(false);
  const failedCardIdsRef = useRef(new Set()); // Track cards failed during this session
  
  // Interactive study states
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [mode, setMode] = useState('mc'); // 'mc' (multiple choice) or 'ta' (type answer)
  const [totalItems, setTotalItems] = useState(0);
  
  const [screen, setScreen] = useState('loading'); // 'loading' | 'empty' | 'study' | 'complete'
  const { triggerRewards } = useGamification();
  const inputRef = useRef(null);

  // Load new or due cards
  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = isDuePractice
          ? await progressService.getDueCards(undefined)
          : await progressService.getNewCards(undefined, 10);
        const loadedCards = res?.data?.data ?? res?.data ?? res ?? [];
        if (loadedCards.length === 0) {
          setScreen('empty');
        } else {
          setCards(loadedCards);
          setQueue(loadedCards);
          setTotalItems(loadedCards.length);
          answeredRef.current = false;
          setAnswered(false);
          setScreen('study');
        }
      } catch (err) {
        console.error('Failed to load cards:', err);
        toast.error(isDuePractice ? 'Không thể tải danh sách thẻ cần ôn' : 'Không thể tải từ mới');
        setScreen('empty');
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [isDuePractice]);

  const currentCard = queue[0] || null;

  const shouldUseWritten = isDuePractice ? hasWritten : true;

  // Decide mode dynamically (alternate or random)
  useEffect(() => {
    if (currentCard) {
      const currentStreak = streaksRef.current.get(currentCard._id) || 0;
      // First round: Multiple Choice, Second round: Type Answer (only if shouldUseWritten is true)
      setMode((shouldUseWritten && currentStreak === 1) ? 'ta' : 'mc');
    }
  }, [currentCard?._id, shouldUseWritten]);

  // Focus input if typing mode
  useEffect(() => {
    if (mode === 'ta' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentCard?._id, mode]);

  // Generate MC options
  const options = useMemo(() => {
    if (!currentCard || mode !== 'mc') return [];
    
    // Find distraction options
    const others = cards
      .filter(c => c._id !== currentCard._id)
      .map(c => ({ id: c._id, text: c.front }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
      
    const pool = [{ id: currentCard._id, text: currentCard.front }, ...others];
    // Shuffle options
    return pool.sort(() => Math.random() - 0.5);
  }, [currentCard, mode, cards]);

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const targetStreak = isDuePractice ? (hasWritten ? 2 : 1) : 2;

  const completeCurrentCard = useCallback(async (cardId) => {
    // Race condition guard
    if (completedCardIdsRef.current.has(cardId)) return;

    // Mark completed in local UI state
    completedCardIdsRef.current.add(cardId);
    setCompletedCardIds(new Set(completedCardIdsRef.current));

    try {
      if (isDuePractice) {
        const hasFailed = failedCardIdsRef.current.has(cardId);
        // Call API once when card is retired from queue
        await progressService.updateCardProgress(cardId, hasFailed ? 0 : 4);
      } else {
        await progressService.completeLearning(cardId);
      }
    } catch (err) {
      console.error('Failed to update progress for card:', cardId, err);
      // Soft error: toast but let UI proceed
      toast.error('Không thể lưu tiến độ thẻ này, vui lòng thử lại sau');
    }
  }, [isDuePractice]);

  const handleAnswer = (optId) => {
    if (answeredRef.current || !currentCard) return;
    setSelectedOption(optId);
    answeredRef.current = true;
    setAnswered(true);
    const correct = optId === currentCard._id;
    setIsCorrect(correct);

    if (correct) {
      speak(currentCard.front);
    } else if (isDuePractice) {
      failedCardIdsRef.current.add(currentCard._id);
    }

    const currentStreak = streaksRef.current.get(currentCard._id) || 0;
    const newStreak = correct ? currentStreak + 1 : 0;
    streaksRef.current.set(currentCard._id, newStreak);
    setStreaks(new Map(streaksRef.current));

    if (newStreak >= targetStreak) {
      // Call helper asynchronously without awaiting so UI remains perfectly smooth
      completeCurrentCard(currentCard._id);
    }
  };

  const handleTypeAnswer = () => {
    if (answeredRef.current || !currentCard || !typedAnswer.trim()) return;
    answeredRef.current = true;
    setAnswered(true);
    const correct = typedAnswer.trim().toLowerCase() === currentCard.front.trim().toLowerCase();
    setIsCorrect(correct);

    if (correct) {
      speak(currentCard.front);
    } else if (isDuePractice) {
      failedCardIdsRef.current.add(currentCard._id);
    }

    const currentStreak = streaksRef.current.get(currentCard._id) || 0;
    const newStreak = correct ? currentStreak + 1 : 0;
    streaksRef.current.set(currentCard._id, newStreak);
    setStreaks(new Map(streaksRef.current));

    if (newStreak >= targetStreak) {
      // Call helper asynchronously without awaiting so UI remains perfectly smooth
      completeCurrentCard(currentCard._id);
    }
  };

  const handleDontKnow = () => {
    if (answeredRef.current || !currentCard) return;
    answeredRef.current = true;
    setAnswered(true);
    setIsCorrect(false);
    
    if (isDuePractice) {
      failedCardIdsRef.current.add(currentCard._id);
    }
    
    streaksRef.current.set(currentCard._id, 0);
    setStreaks(new Map(streaksRef.current));
  };

  const handleNext = useCallback(() => {
    if (!answeredRef.current) return;
    answeredRef.current = false;
    setAnswered(false);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsCorrect(false);

    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue;
      const activeCard = prevQueue[0];
      const isCompleted = completedCardIdsRef.current.has(activeCard._id);

      if (isCompleted) {
        const next = prevQueue.slice(1);
        if (next.length === 0) {
          setScreen('complete');
          gamificationService.triggerLearnComplete({ accuracy: 100, cardsStudied: totalItems })
            .then(r => {
              const data = r.data?.data ?? r.data;
              if (data?.xp || data?.newAchievements?.length > 0) triggerRewards(data);
            })
            .catch(console.error);
        }
        return next;
      } else {
        const next = prevQueue.slice(1);
        next.push(activeCard);
        return next;
      }
    });
  }, [totalItems, triggerRewards]);

  // Auto-advance correct answers for smoother learning flow
  useEffect(() => {
    if (answered && isCorrect) {
      const timer = setTimeout(() => {
        handleNext();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [answered, isCorrect, handleNext]);

  // Handle Enter key for TA mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (mode === 'ta' && !answered && typedAnswer.trim()) {
          handleTypeAnswer();
        } else if (answered) {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, answered, typedAnswer, handleNext]);

  if (loading || screen === 'loading') {
    return (
      <div className="learn-new-page loading-screen">
        <motion.div 
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={40} />
        </motion.div>
        <p>{isDuePractice ? "Đang chuẩn bị thẻ cần ôn tập..." : "Đang chuẩn bị từ mới cho bạn..."}</p>
      </div>
    );
  }

  if (screen === 'empty') {
    return (
      <div className="learn-new-page empty-screen">
        <div className="empty-content-card">
          <Trophy size={48} className="empty-icon" />
          <h2>{isDuePractice ? "Tuyệt vời! Không còn thẻ nào cần ôn tập hôm nay." : "Tuyệt vời! Bạn đã học hết từ mới"}</h2>
          <p>
            {isDuePractice 
              ? "Bạn đã ôn tập xong tất cả các thẻ đến hạn hôm nay rồi. Hãy tiếp tục học thêm từ mới nhé!"
              : "Không có từ mới nào để học. Hãy tạo học phần mới hoặc thêm thẻ vào học phần hiện tại nhé!"}
          </p>
          <div className="empty-actions">
            {!isDuePractice && (
              <button className="ln-btn primary" onClick={() => navigate('/library')}>Thư viện</button>
            )}
            <button className="ln-btn secondary" onClick={() => navigate('/dashboard')}>Trang chủ</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    return (
      <div className="learn-new-page complete-screen">
        <motion.div 
          className="complete-content-card"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <Trophy size={64} className="trophy-gold" />
          <h1>{isDuePractice ? "Hoàn thành ôn tập sâu!" : "Chúc mừng bạn!"}</h1>
          <p className="subtitle">
            {isDuePractice 
              ? `Bạn đã hoàn thành luyện tập sâu xong các thẻ hôm nay!`
              : `Bạn đã hoàn thành việc học ${totalItems} từ mới hôm nay!`}
          </p>
          
          {!isDuePractice && (
            <div className="xp-reward-box">
              <Zap size={20} className="xp-icon" />
              <span>Bạn đã được cộng điểm và tích lũy XP!</span>
            </div>
          )}

          <div className="complete-actions">
            <button className="ln-btn primary" onClick={() => navigate('/dashboard')}>Trở lại Trang chủ</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Calculate learning progress pct
  const completedCount = completedCardIds.size;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div className="learn-new-page">
      <div className="learn-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
          <span>Thoát</span>
        </button>
        <div className="progress-container">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-text">
            {isDuePractice 
              ? `Ôn tập sâu: ${completedCount}/${totalItems} thẻ` 
              : `Hoàn thành: ${completedCount}/${totalItems} từ`}
          </span>
        </div>
        <div className="header-icon-box">
          <Brain size={20} />
        </div>
      </div>

      <div className="learn-body">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentCard?._id}
            className="study-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Front Card Definition / Back Side */}
            <div className="card-definition-box">
              <span className="card-hint-type">ĐỊNH NGHĨA / NGHĨA TIẾNG VIỆT</span>
              <h2 className="card-meaning">{currentCard?.back}</h2>
            </div>

            {/* Answer Input / Multiple Choice Area */}
            <div className="card-interaction-box">
              {mode === 'mc' ? (
                <div className="options-grid">
                  {options.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    const isCurrentCorrect = opt.id === currentCard._id;
                    
                    let btnClass = "option-btn";
                    if (answered) {
                      if (isCurrentCorrect) btnClass += " correct";
                      else if (isSelected) btnClass += " incorrect";
                      else btnClass += " disabled";
                    }

                    return (
                      <button 
                        key={opt.id}
                        className={btnClass}
                        onClick={() => handleAnswer(opt.id)}
                        disabled={answered}
                      >
                        <span className="option-text">{opt.text}</span>
                        {answered && isCurrentCorrect && <CheckCircle size={18} className="status-icon" />}
                        {answered && isSelected && !isCurrentCorrect && <XCircle size={18} className="status-icon" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="type-answer-box">
                  <span className="input-label">Nhập từ tiếng Anh:</span>
                  <div className="input-wrapper">
                    <input 
                      ref={inputRef}
                      type="text"
                      className={`ta-input ${answered ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
                      placeholder="Nhập câu trả lời..."
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      disabled={answered}
                      autoFocus
                    />
                    {answered && (
                      <div className="ta-status-icon">
                        {isCorrect ? <CheckCircle size={20} className="txt-success" /> : <XCircle size={20} className="txt-error" />}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="interaction-actions">
                {!answered ? (
                  <button className="ln-btn text-only" onClick={handleDontKnow}>
                    <HelpCircle size={16} /> Tôi không biết từ này
                  </button>
                ) : (
                  !isCorrect && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="feedback-panel"
                    >
                      <div className="correct-answer-display">
                        <span>Đáp án đúng:</span>
                        <strong className="correct-word" onClick={() => speak(currentCard.front)}>
                          {currentCard.front} <Volume2 size={16} className="inline-speak-icon" />
                        </strong>
                        {currentCard.example && (
                          <p className="correct-example">
                            <strong>Ví dụ:</strong> {currentCard.example}
                          </p>
                        )}
                      </div>
                      <button className="ln-btn primary next-btn" onClick={handleNext}>
                        Tiếp tục
                      </button>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
