import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Brain, ClipboardCheck, Box,
  Volume2, VolumeX, Settings,
  Shuffle, RotateCcw,
  CheckCircle, XCircle, ChevronRight,
  ArrowLeft, X, ChevronUp, ChevronDown, Star, Volume1,
  Sparkles, Trophy, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { gamificationService } from '../../api/gamificationService';
import GamificationRewards from '../../components/gamification/GamificationRewards';
import './StudySetLearn.css';

const BATCH_SIZE = 7;
const TING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/953/953-preview.mp4';

/** Returns the actual number of items in a given batch (last batch may be smaller) */
const getBatchSize = (batchIdx, totalItems, totalBatches) => {
  const effectiveSize = Math.ceil(totalItems / totalBatches);
  const start = batchIdx * effectiveSize;
  return Math.min(effectiveSize, Math.max(0, totalItems - start));
};

/** Returns total items in all batches up to (but not including) batchIdx */
const getBatchesOffset = (batchIdx, totalItems, totalBatches) =>
  Array.from({ length: batchIdx }, (_, idx) => getBatchSize(idx, totalItems, totalBatches))
    .reduce((sum, size) => sum + size, 0);

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

/**
 * Quizlet-style progress bar
 * - Completed batch: fully filled green #18AE79
 * - Current batch: solid green fill + circular puck with current q number
 * - Future batch: gray #9CA3AF
 * - Right side: circle showing total items
 */
const QuizletProgressBar = ({
  totalBatches,
  currentBatchIndex,
  batchProgress,
  totalItems,
  currentQueueIdx,
  prevBatchesCorrect = 0,
}) => {
  const visibleStart = useMemo(() => {
    if (currentBatchIndex < 7) return 0;
    return currentBatchIndex - 6;
  }, [currentBatchIndex]);

  const visibleCount = Math.min(7, totalBatches - visibleStart);
  const globalItemNum = prevBatchesCorrect + currentQueueIdx + 1;

  return (
    <div className="ql2-progress-bar" role="progressbar" aria-valuenow={globalItemNum} aria-valuemax={totalItems}>
      <div className="ql2-progress-bar__track">
        {Array.from({ length: visibleCount }).map((_, i) => {
          const batchIdx = visibleStart + i;
          const progress = batchProgress.get(batchIdx) || { correct: 0 };
          const actualBatchSize = getBatchSize(batchIdx, totalItems, totalBatches);
          const isCompleted = progress.correct >= actualBatchSize;
          const isCurrent = batchIdx === currentBatchIndex;
          const isFuture = batchIdx > currentBatchIndex;
          const puckPos = isCurrent ? currentQueueIdx / actualBatchSize : 0;

          return (
            <div
              key={batchIdx}
              className={`ql2-progress-bar__batch ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
              style={{ '--puck-pos': puckPos }}
            >
              <div className="ql2-progress-bar__batch-bg" />
              {isCurrent ? (
                <>
                  <div className="ql2-progress-bar__batch-fill" style={{ width: `${puckPos * 100}%` }} />
                  <div className="ql2-progress-bar__puck">{globalItemNum}</div>
                </>
              ) : isCompleted ? (
                <div className="ql2-progress-bar__batch-fill completed-fill" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="ql2-progress-bar__total">{totalItems}</div>
    </div>
  );
};

function buildItems(cards, includeMC, includeTA) {
  const items = [];
  cards.forEach(card => {
    if (includeMC) items.push({ ...card, mode: 'mc', itemId: `${card._id}:mc` });
    if (includeTA) items.push({ ...card, mode: 'ta', itemId: `${card._id}:ta` });
  });
  return items;
}

export default function StudySetLearn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || `/study-sets/${id}`;

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionItems, setSessionItems] = useState([]);
  const [currentBatchIdx, setCurrentBatchIdx] = useState(0);
  const [batchProgress, setBatchProgress] = useState(new Map());
  const [batchQueue, setBatchQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [itemResults, setItemResults] = useState(new Map());
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [includeMC, setIncludeMC] = useState(true);
  const [includeTA, setIncludeTA] = useState(true);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [starredCards, setStarredCards] = useState(new Set());
  const [screen, setScreen] = useState('loading');
  const [gamificationResult, setGamificationResult] = useState(null);
  const [sessionStartTime] = useState(Date.now());

  const inputRef = useRef(null);
  const audioRef = useRef(null);

  const currentItem = batchQueue[queueIdx] || null;
  const totalItems = sessionItems.length;
  const totalBatches_ = Math.max(1, Math.ceil(totalItems / BATCH_SIZE));
  const effectiveBatchSize = Math.ceil(totalItems / totalBatches_);
  const itemsStudiedTotal = Array.from(batchProgress.values()).reduce((sum, b) => sum + b.correct, 0);
  const prevBatchesCorrect = Array.from({ length: currentBatchIdx }, (_, idx) =>
    getBatchSize(idx, totalItems, totalBatches_)
  ).reduce((sum, size) => sum + size, 0);

  const options = useMemo(() => {
    if (!currentItem || currentItem.mode !== 'mc') return [];
    const others = cards
      .filter(c => c._id !== currentItem._id)
      .map(c => ({ id: c._id, text: c.front }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return shuffleArray([{ id: currentItem._id, text: currentItem.front }, ...others]);
  }, [currentItem, cards]);

  const playCorrectSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const handleAnswer = useCallback((opt) => {
    if (answered || !currentItem) return;
    setSelectedOption(opt.id);
    setAnswered(true);
    const correct_ = opt.id === currentItem._id;
    setIsCorrect(correct_);
    setItemResults(prev => new Map(prev).set(currentItem.itemId, correct_));

    if (correct_) {
      playCorrectSound();
      setBatchProgress(prev => {
        const next = new Map(prev);
        const bp = next.get(currentBatchIdx) || { correct: 0 };
        const newCorrect = bp.correct + 1;
        const actualBatchSize = getBatchSize(currentBatchIdx, totalItems, totalBatches_);
        next.set(currentBatchIdx, { correct: newCorrect });
        if (newCorrect >= actualBatchSize) {
          if (currentBatchIdx + 1 >= totalBatches_) {
            setScreen('session-complete');
            // Trigger gamification
            const acc = Math.round((newCorrect / actualBatchSize) * 100);
            gamificationService.triggerLearnComplete({ accuracy: acc, cardsStudied: totalItems })
              .then(r => setGamificationResult(r.data?.data || null))
              .catch(() => {});
          } else {
            setScreen('batch-complete');
          }
        }
        return next;
      });
    }
  }, [answered, currentItem, currentBatchIdx, totalBatches_, totalItems, playCorrectSound]);

  const handleTypeAnswer = useCallback(() => {
    if (answered || !typedAnswer.trim() || !currentItem) return;
    setAnswered(true);
    const correct_ = typedAnswer.trim().toLowerCase() === currentItem.front.trim().toLowerCase();
    setIsCorrect(correct_);
    setItemResults(prev => new Map(prev).set(currentItem.itemId, correct_));

    if (correct_) {
      playCorrectSound();
      setBatchProgress(prev => {
        const next = new Map(prev);
        const bp = next.get(currentBatchIdx) || { correct: 0 };
        const newCorrect = bp.correct + 1;
        next.set(currentBatchIdx, { correct: newCorrect });
        const actualBatchSize = getBatchSize(currentBatchIdx, totalItems, totalBatches_);
        if (newCorrect >= actualBatchSize) {
          if (currentBatchIdx + 1 >= totalBatches_) {
            setScreen('session-complete');
            // Trigger gamification
            const acc = Math.round((newCorrect / actualBatchSize) * 100);
            gamificationService.triggerLearnComplete({ accuracy: acc, cardsStudied: totalItems })
              .then(r => setGamificationResult(r.data?.data || null))
              .catch(() => {});
          } else {
            setScreen('batch-complete');
          }
        }
        return next;
      });
    }
  }, [answered, typedAnswer, currentItem, currentBatchIdx, totalBatches_, totalItems, playCorrectSound]);

  const handleDontKnow = useCallback(() => {
    if (answered || !currentItem) return;
    setAnswered(true);
    setIsCorrect(false);
    setItemResults(prev => new Map(prev).set(currentItem.itemId, false));
  }, [answered, currentItem]);

  const handleNext = useCallback(() => {
    setAnswered(false);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsCorrect(false);

    if (!currentItem) return;
    const wasCorrect = itemResults.get(currentItem.itemId) === true;

    if (!wasCorrect) {
      setBatchQueue(prev => {
        const next = [...prev];
        const [removed] = next.splice(queueIdx, 1);
        next.push(removed);
        return next;
      });
    } else {
      if (queueIdx < batchQueue.length - 1) {
        setQueueIdx(prev => prev + 1);
      } else {
        const bp = batchProgress.get(currentBatchIdx) || { correct: 0 };
        const actualBatchSize = getBatchSize(currentBatchIdx, totalItems, totalBatches_);
        if (bp.correct >= actualBatchSize) {
          if (currentBatchIdx + 1 >= totalBatches_) {
            setScreen('session-complete');
          } else {
            setScreen('batch-complete');
          }
        } else {
          const batchStart = getBatchesOffset(currentBatchIdx, totalItems, totalBatches_);
          const batchItems = sessionItems.slice(batchStart, batchStart + actualBatchSize);
          const wrongSet = new Set();
          batchItems.forEach(item => {
            if (itemResults.get(item.itemId) !== true) wrongSet.add(item.itemId);
          });
          const sorted = [...batchItems].sort((a, b) => {
            const aWrong = wrongSet.has(a.itemId);
            const bWrong = wrongSet.has(b.itemId);
            if (aWrong === bWrong) return 0;
            return aWrong ? 1 : -1;
          });
          setBatchQueue(sorted);
          setQueueIdx(0);
        }
      }
    }
  }, [currentItem, queueIdx, batchQueue, batchProgress, currentBatchIdx, itemResults, sessionItems, totalBatches_, totalItems]);

  const handleBatchCompleteContinue = useCallback(() => {
    const nextBatchIdx = currentBatchIdx + 1;
    const eb = Math.ceil(sessionItems.length / Math.max(1, Math.ceil(sessionItems.length / BATCH_SIZE)));
    const startIdx = getBatchesOffset(nextBatchIdx, sessionItems.length, totalBatches_);
    const nextBatchItems = sessionItems.slice(startIdx, startIdx + eb);

    if (nextBatchItems.length === 0) {
      setScreen('session-complete');
      return;
    }

    setBatchQueue(nextBatchItems);
    setCurrentBatchIdx(nextBatchIdx);
    setQueueIdx(0);
    setBatchProgress(prev => {
      const next = new Map(prev);
      next.set(nextBatchIdx, { correct: 0 });
      return next;
    });
    setItemResults(new Map());
    setScreen('learning');
  }, [currentBatchIdx, sessionItems, totalBatches_]);

  const handleRestart = useCallback(() => {
    const items = buildItems(shuffleArray(cards), includeMC, includeTA);
    const eb = Math.ceil(items.length / Math.max(1, Math.ceil(items.length / BATCH_SIZE)));
    setSessionItems(items);
    setBatchQueue(items.slice(0, eb));
    setBatchProgress(new Map([[0, { correct: 0 }]]));
    setItemResults(new Map());
    setCurrentBatchIdx(0);
    setQueueIdx(0);
    setScreen('learning');
    setIsShuffled(true);
  }, [cards, includeMC, includeTA]);

  const handleShuffle = useCallback(() => {
    const items = buildItems(shuffleArray(cards), includeMC, includeTA);
    const eb = Math.ceil(items.length / Math.max(1, Math.ceil(items.length / BATCH_SIZE)));
    setSessionItems(items);
    setBatchQueue(items.slice(0, eb));
    setBatchProgress(new Map([[0, { correct: 0 }]]));
    setItemResults(new Map());
    setCurrentBatchIdx(0);
    setQueueIdx(0);
    setScreen('learning');
    setIsShuffled(true);
  }, [cards, includeMC, includeTA]);

  const handleModeChange = useCallback((m) => {
    if (m === 'flashcards') navigate(`/study-sets/${id}/flashcards`, { state: { returnTo } });
    else if (m === 'learn') setModeDropdownOpen(false);
    else if (m === 'test') navigate(`/study-sets/${id}/test`, { state: { returnTo } });
    else if (m === 'match') navigate(`/study-sets/${id}/match`, { state: { returnTo } });
    setModeDropdownOpen(false);
  }, [id, navigate, returnTo]);

  const handleToggleMC = useCallback((checked) => {
    if (!checked && !includeTA) return;
    setIncludeMC(checked);
    const newItems = buildItems(shuffleArray(cards), checked, includeTA);
    const eb = Math.ceil(newItems.length / Math.max(1, Math.ceil(newItems.length / BATCH_SIZE)));
    setSessionItems(newItems);
    const restart = screen === 'learning' || screen === 'batch-complete';
    if (restart) {
      setBatchQueue(newItems.slice(0, eb));
      setBatchProgress(new Map([[0, { correct: 0 }]]));
      setItemResults(new Map());
      setCurrentBatchIdx(0);
      setQueueIdx(0);
      setScreen('learning');
      setIsShuffled(true);
    }
  }, [cards, includeTA, screen]);

  const handleToggleTA = useCallback((checked) => {
    if (!checked && !includeMC) return;
    setIncludeTA(checked);
    const newItems = buildItems(shuffleArray(cards), includeMC, checked);
    const eb = Math.ceil(newItems.length / Math.max(1, Math.ceil(newItems.length / BATCH_SIZE)));
    setSessionItems(newItems);
    const restart = screen === 'learning' || screen === 'batch-complete';
    if (restart) {
      setBatchQueue(newItems.slice(0, eb));
      setBatchProgress(new Map([[0, { correct: 0 }]]));
      setItemResults(new Map());
      setCurrentBatchIdx(0);
      setQueueIdx(0);
      setScreen('learning');
      setIsShuffled(true);
    }
  }, [cards, includeMC, screen]);

  const toggleStar = useCallback((cardId) => {
    setStarredCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const speakCard = useCallback((text) => {
    if (!soundEnabled || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  useEffect(() => {
    audioRef.current = new Audio(TING_SOUND_URL);
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
        const loadedSet = setRes?.data ?? setRes;
        const loadedCards = [...(cardsRes?.data ?? cardsRes ?? [])];
        setStudySet(loadedSet);
        setCards(loadedCards);
        const items = buildItems(shuffleArray(loadedCards), true, true);
        setSessionItems(items);
      } catch {
        toast.error('Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (sessionItems.length === 0 || screen !== 'loading') return;
    const eb = Math.ceil(sessionItems.length / Math.max(1, Math.ceil(sessionItems.length / BATCH_SIZE)));
    setBatchQueue(sessionItems.slice(0, eb));
    setBatchProgress(new Map([[0, { correct: 0 }]]));
    setItemResults(new Map());
    setCurrentBatchIdx(0);
    setQueueIdx(0);
    setScreen('learning');
  }, [sessionItems, screen]);

  useEffect(() => {
    if (currentItem?.mode === 'ta' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [queueIdx, currentItem]);

  useEffect(() => {
    setSelectedOption(null);
    setTypedAnswer('');
    setAnswered(false);
    setIsCorrect(false);
  }, [queueIdx]);

  useEffect(() => {
    if (answered && isCorrect) {
      const timer = setTimeout(() => {
        handleNext();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [answered, isCorrect, handleNext]);

  useEffect(() => {
    const handleKey = (e) => {
      if (screen !== 'learning') return;
      if (e.key === 'Enter' && currentItem?.mode === 'ta' && !answered && typedAnswer.trim()) {
        handleTypeAnswer();
      } else if (e.key === ' ' && answered) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, answered, typedAnswer, queueIdx, currentItem, handleTypeAnswer, handleNext]);

  if (loading || screen === 'loading') {
    return (
      <div className="ql2-page">
        <div className="ql2-loading">
          <motion.div
            className="ql2-loading__icon"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles size={48} />
          </motion.div>
          <span className="ql2-loading__text">Đang chuẩn bị bài học...</span>
        </div>
      </div>
    );
  }

  if (screen === 'session-complete') {
    const totalCorrect = itemsStudiedTotal;
    const accuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;
    return (
      <>
        <div className="ql2-page">
          <div className="ql2-complete">
            <motion.div
              className="ql2-complete__card"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <motion.div
                className="ql2-complete__trophy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Trophy size={64} />
              </motion.div>
              <motion.h1
                className="ql2-complete__title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Chúc mừng bạn!
              </motion.h1>
              <motion.p
                className="ql2-complete__subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Bạn đã hoàn thành bài học
              </motion.p>

              <motion.div
                className="ql2-complete__score-ring"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#18AE79" />
                      <stop offset="100%" stopColor="#0d8a54" />
                    </linearGradient>
                  </defs>
                  <circle className="ql2-ring-bg" cx="80" cy="80" r="70" />
                  <motion.circle
                    className="ql2-ring-fill"
                    cx="80" cy="80" r="70"
                    strokeDasharray={2 * Math.PI * 70}
                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - accuracy / 100) }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </svg>
                <div className="ql2-complete__ring-inner">
                  <span className="ql2-complete__ring-pct">{accuracy}%</span>
                  <span className="ql2-complete__ring-label">Hoàn thành</span>
                </div>
              </motion.div>

              <motion.div
                className="ql2-complete__stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="ql2-complete__stat">
                  <div className="ql2-complete__stat-icon ql2-complete__stat-icon--correct">
                    <CheckCircle size={20} />
                  </div>
                  <span className="ql2-complete__stat-num">{totalCorrect}</span>
                  <span className="ql2-complete__stat-label">Đúng</span>
                </div>
                <div className="ql2-complete__stat">
                  <div className="ql2-complete__stat-icon ql2-complete__stat-icon--wrong">
                    <XCircle size={20} />
                  </div>
                  <span className="ql2-complete__stat-num">{totalItems - totalCorrect}</span>
                  <span className="ql2-complete__stat-label">Sai</span>
                </div>
                <div className="ql2-complete__stat">
                  <div className="ql2-complete__stat-icon ql2-complete__stat-icon--total">
                    <BookOpen size={20} />
                  </div>
                  <span className="ql2-complete__stat-num">{totalItems}</span>
                  <span className="ql2-complete__stat-label">Tổng</span>
                </div>
              </motion.div>

              <motion.div
                className="ql2-complete__actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button className="ql2-btn ql2-btn--primary" onClick={handleRestart}>
                  <RotateCcw size={18} /> Học lại
                </button>
                <button className="ql2-btn ql2-btn--ghost" onClick={() => navigate(returnTo)}>
                  <ArrowLeft size={18} /> Quay lại
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <GamificationRewards result={gamificationResult} show={!!gamificationResult} />
      </>
    );
  }

  if (screen === 'batch-complete') {
    const completedItemCount = Array.from({ length: currentBatchIdx + 1 }, (_, idx) =>
      getBatchSize(idx, totalItems, totalBatches_)
    ).reduce((sum, size) => sum + size, 0);
    const learnedItems = sessionItems.slice(0, completedItemCount);
    const seen = new Set();
    const learnedCards = learnedItems.filter(item => {
      if (seen.has(item._id)) return false;
      seen.add(item._id);
      return true;
    });
    const overallPct = totalItems > 0 ? Math.round((completedItemCount / totalItems) * 100) : 0;

    return (
      <div className="ql2-page">
        <div className="ql2-batch-complete">
          <motion.div
            className="ql2-batch-complete__card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="ql2-batch-complete__header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="ql2-batch-complete__badge">
                <Zap size={20} />
              </div>
              <h2 className="ql2-batch-complete__title">Tuyệt vời!</h2>
              <p className="ql2-batch-complete__subtitle">Bạn đã hoàn thành vòng học này</p>
            </motion.div>

            <motion.div
              className="ql2-batch-complete__progress"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="ql2-batch-complete__progress-header">
                <span className="ql2-batch-complete__progress-label">Tiến trình tổng thể</span>
                <span className="ql2-batch-complete__progress-pct">{overallPct}%</span>
              </div>
              <div className="ql2-batch-complete__progress-bar">
                <motion.div
                  className="ql2-batch-complete__progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <div className="ql2-batch-complete__progress-stats">
                <span className="ql2-batch-complete__correct">{itemsStudiedTotal} đúng</span>
                <span className="ql2-batch-complete__divider">·</span>
                <span>{totalItems - itemsStudiedTotal} sai</span>
                <span className="ql2-batch-complete__divider">·</span>
                <span>{totalItems} tổng câu</span>
              </div>
            </motion.div>

            <motion.div
              className="ql2-batch-complete__section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="ql2-batch-complete__section-title">
                <Sparkles size={16} /> Thuật ngữ đã học
              </div>
              <div className="ql2-batch-complete__cards-grid">
                {learnedCards.map((card, idx) => (
                  <motion.div
                    key={card._id}
                    className="ql2-batch-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                  >
                    <div className="ql2-batch-card__front">
                      <span className="ql2-batch-card__term">{card.front}</span>
                      <div className="ql2-batch-card__actions">
                        <button
                          className={`ql2-batch-card__star ${starredCards.has(card._id) ? 'active' : ''}`}
                          onClick={() => toggleStar(card._id)}
                        >
                          <Star size={14} fill={starredCards.has(card._id) ? '#f59e0b' : 'none'} />
                        </button>
                        {card.audioUrl && (
                          <button className="ql2-batch-card__audio" onClick={() => speakCard(card.front)}>
                            <Volume1 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="ql2-batch-card__back">{card.back}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="ql2-batch-complete__footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button className="ql2-btn ql2-btn--primary ql2-btn--large" onClick={handleBatchCompleteContinue}>
                Tiếp tục <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="ql2-page">
      {/* Floating decorative elements */}
      <div className="ql2-page__decoration ql2-page__decoration--1" />
      <div className="ql2-page__decoration ql2-page__decoration--2" />

      {/* Header */}
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
              <Brain size={18} />
              <span className="study-header__mode-label">Học</span>
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
                >
                  {STUDY_MODES.map(({ id: mId, label, icon: Icon }) => (
                    <button
                      key={mId}
                      className={`study-header__mode-item ${mId === 'learn' ? 'active' : ''}`}
                      onClick={() => handleModeChange(mId)}
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
          <QuizletProgressBar
            totalBatches={totalBatches_}
            currentBatchIndex={currentBatchIdx}
            batchProgress={batchProgress}
            totalItems={totalItems}
            currentQueueIdx={queueIdx}
            prevBatchesCorrect={prevBatchesCorrect}
          />
        </div>

        <div className="ql2-header__right">
          <button className={`ql2-header__btn ${isShuffled ? 'active' : ''}`} onClick={handleShuffle}>
            <Shuffle size={18} />
          </button>
          <button className={`ql2-header__btn ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className={`ql2-header__btn ${settingsOpen ? 'active' : ''}`} onClick={() => setSettingsOpen(!settingsOpen)}>
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="ql2-settings"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="ql2-settings__header">
              <span className="ql2-settings__title">Cài đặt</span>
              <button onClick={() => setSettingsOpen(false)}><X size={16} /></button>
            </div>
            <div className="ql2-settings__section">
              <span className="ql2-settings__label">Loại câu hỏi</span>
              <label className="ql2-settings__checkbox">
                <input type="checkbox" checked={includeMC} onChange={e => handleToggleMC(e.target.checked)} />
                <span className="ql2-settings__checkbox-box">{includeMC && <CheckCircle size={12} />}</span>
                <span>Trắc nghiệm</span>
              </label>
              <label className="ql2-settings__checkbox">
                <input type="checkbox" checked={includeTA} onChange={e => handleToggleTA(e.target.checked)} />
                <span className="ql2-settings__checkbox-box">{includeTA && <CheckCircle size={12} />}</span>
                <span>Tự luận</span>
              </label>
            </div>
            <div className="ql2-settings__divider" />
            <div className="ql2-settings__stats">
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="ql2-main">
        <div className="ql2-card-wrapper">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentBatchIdx}-${queueIdx}`}
              className="ql2-card"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {/* Question Area */}
              <div className="ql2-card__question">
                <div className="ql2-card__question-label">Định nghĩa</div>
                <h2 className="ql2-card__term">{currentItem?.back}</h2>
                <button className="ql2-card__audio-btn" onClick={() => speakCard(currentItem?.front)}>
                  <Volume2 size={20} />
                </button>
              </div>

              {/* Multiple Choice */}
              {currentItem?.mode === 'mc' && (
                <div className="ql2-card__options">
                  <div className="ql2-options-grid">
                    {options.map((opt, i) => {
                      const isSelected = selectedOption === opt.id;
                      const isCorrectOpt = opt.id === currentItem?._id;
                      let optClass = 'ql2-option';
                      if (answered) {
                        if (isCorrectOpt) optClass += ' correct';
                        else if (isSelected) optClass += ' wrong';
                        else optClass += ' dimmed';
                      }
                      return (
                        <motion.button
                          key={opt.id}
                          className={optClass}
                          onClick={() => handleAnswer(opt)}
                          disabled={answered}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={!answered ? { scale: 1.02 } : {}}
                          whileTap={!answered ? { scale: 0.98 } : {}}
                        >
                          <span className="ql2-option__letter">{String.fromCharCode(65 + i)}</span>
                          <span className="ql2-option__text">{opt.text}</span>
                          {answered && isCorrectOpt && (
                            <CheckCircle size={18} className="ql2-option__icon ql2-option__icon--correct" />
                          )}
                          {answered && isSelected && !isCorrectOpt && (
                            <XCircle size={18} className="ql2-option__icon ql2-option__icon--wrong" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type Answer */}
              {currentItem?.mode === 'ta' && (
                <div className="ql2-card__type-answer">
                  <input
                    ref={inputRef}
                    type="text"
                    className={`ql2-input ${answered ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                    placeholder="Nhập thuật ngữ tiếng Anh..."
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTypeAnswer()}
                    disabled={answered}
                    autoComplete="off"
                  />
                  {!answered && (
                    <button className="ql2-btn ql2-btn--primary" onClick={handleTypeAnswer} disabled={!typedAnswer.trim()}>
                      Kiểm tra
                    </button>
                  )}
                  {answered && (
                    <motion.div
                      className={`ql2-feedback ${isCorrect ? 'ql2-feedback--correct' : 'ql2-feedback--wrong'}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle size={18} />
                          <span>Chính xác!</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} />
                          <span>Đáp án: <strong>{currentItem?.front}</strong></span>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="ql2-card__footer">
                {!answered && (
                  <button className="ql2-btn ql2-btn--ghost" onClick={handleDontKnow}>
                    Không biết
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Navigation - only show when needed */}
          {answered && !isCorrect && (
            <motion.div
              className="ql2-nav"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button className="ql2-nav__btn ql2-nav__btn--primary" onClick={handleNext}>
                <span>Tiếp tục</span>
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
