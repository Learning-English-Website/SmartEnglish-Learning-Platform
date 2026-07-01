import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { duolingoService } from '../../services/duolingoService';
import { useSpeechSynthesis } from '../../hooks/useAudio';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import ExitModal from '../../components/duolingo/ExitModal';
import HeartsModal from '../../components/duolingo/HeartsModal';
import '../../components/duolingo/AudioPlayer.css';
import './LessonPage.css';

// Cute cartoon character vector SVG illustration
const AvatarIllustration = () => (
  <svg width="100" height="120" viewBox="0 0 100 120" className="listening-avatar">
    {/* Body / Shirt */}
    <path d="M25,90 C25,75 75,75 75,90 L75,120 L25,120 Z" fill="#ff4b4b" />
    {/* Head */}
    <circle cx="50" cy="50" r="30" fill="#fbc5b3" />
    {/* Headband */}
    <path d="M22,38 C25,25 75,25 78,38 L72,25 C65,18 35,18 28,25 Z" fill="#ffc800" />
    <path d="M50,15 C45,8 35,8 35,15 C35,22 45,22 50,15 Z" fill="#ffc800" />
    <path d="M50,15 C55,8 65,8 65,15 C65,22 55,22 50,15 Z" fill="#ffc800" />
    {/* Hair (curly / big bun) */}
    <circle cx="50" cy="18" r="16" fill="#4a3728" />
    <circle cx="35" cy="28" r="14" fill="#4a3728" />
    <circle cx="65" cy="28" r="14" fill="#4a3728" />
    {/* Eyes (happy / winking / cute) */}
    <ellipse cx="40" cy="50" rx="4" ry="5" fill="#2e1a0c" />
    <ellipse cx="60" cy="50" rx="4" ry="5" fill="#2e1a0c" />
    <path d="M38,42 C40,41 42,42 42,42" stroke="#2e1a0c" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M58,42 C60,41 62,42 62,42" stroke="#2e1a0c" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Cheeks */}
    <circle cx="35" cy="58" r="4" fill="#ff8a8a" opacity="0.6" />
    <circle cx="65" cy="58" r="4" fill="#ff8a8a" opacity="0.6" />
    {/* Smile */}
    <path d="M44,60 C46,65 54,65 56,60" stroke="#2e1a0c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

// Helper function to get correct answer text for display
const getCorrectAnswerText = (challenge) => {
  if (!challenge) return '';
  if (challenge.options && challenge.options.length > 0) {
    const correct = challenge.options.find(o => o.correct);
    return correct?.text || '';
  }
  if (challenge.correctAnswer) return challenge.correctAnswer;
  if (challenge.type === 'ORDER' && challenge.wordBank && challenge.correctOrder) {
    return challenge.correctOrder.map(idx => challenge.wordBank[idx]).join(' ');
  }
  return '';
};

const buildOrderTokens = (wordBank = []) =>
  wordBank.map((text, index) => ({ text, index }));

export default function LessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const isDailyChallenge = searchParams.get('mode') === 'daily' || searchParams.get('dailyChallenge') === 'true';
  const dailyChallengeId = searchParams.get('dailyChallengeId');
  const returnPath = isDailyChallenge ? '/duolingo' : '/duolingo/learn';
  const answerContext = useMemo(() => {
    if (isDailyChallenge) return { mode: 'daily', dailyChallengeId };
    if (isPractice) return { mode: 'practice' };
    return undefined;
  }, [isDailyChallenge, isPractice, dailyChallengeId]);
  const progressStorageKey = isDailyChallenge
    ? `duolingo_daily_lesson_progress_${dailyChallengeId || lessonId}`
    : isPractice
      ? `duolingo_practice_lesson_progress_${lessonId}`
    : `duolingo_lesson_progress_${lessonId}`;

  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [status, setStatus] = useState('idle'); // idle | correct | wrong | complete
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState(null);
  const [hearts, setHearts] = useState(5);
  const [isPro, setIsPro] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [refillError, setRefillError] = useState(null);
  const [isRefilling, setIsRefilling] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(true); // TTS setting
  const [xpPopup, setXpPopup] = useState(null); // XP popup animation state
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  // State for new challenge types
  const [orderedWords, setOrderedWords] = useState([]); // ORDER: user's word order
  const [orderedWordBank, setOrderedWordBank] = useState([]); // ORDER: shuffled word bank
  const [matchedPairs, setMatchedPairs] = useState({}); // MATCH: {leftIndex: rightIndex}
  const [matchLeftPool, setMatchLeftPool] = useState([]); // MATCH: remaining left items
  const [matchRightPool, setMatchRightPool] = useState([]); // MATCH: shuffled right items
  const [selectedFillOption, setSelectedFillOption] = useState(null); // FILL: selected option
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false); // Show correct answer when wrong
  // LISTEN: word bank state
  const [listenWordBank, setListenWordBank] = useState([]); // remaining words in bank
  const [listenFlyingWord, setListenFlyingWord] = useState(null); // word being animated
  const inputRef = useRef(null);
  const pointsRef = useRef(0);
  const audioRef = useRef(null); // Ref to manage current audio instance
  const isMountedRef = useRef(true); // Track if component is still mounted
  const isUnmountingRef = useRef(false); // Track if we're unmounting
  const hasAutoPlayedTTSRef = useRef(false); // Track if TTS auto-played for current challenge
  const hasAutoPlayedAudioRef = useRef(false); // Track if audio auto-played for current challenge
  const completionRequestRef = useRef(null);
  const completionNavigateTimerRef = useRef(null);

  const lessonRef = useRef(lesson);
  const currentIndexRef = useRef(currentIndex);
  const correctCountRef = useRef(correctCount);

  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  // Text-to-Speech for TYPE challenges
  const tts = useSpeechSynthesis({ lang: 'en-US', rate: 0.9 });

  // Derived state - MUST be defined before useEffects that use it
  const currentChallenge = lesson?.challenges?.[currentIndex];
  const isListeningChallenge = !!(currentChallenge &&
    (currentChallenge.type === 'TYPE' || currentChallenge.type === 'ORDER' || currentChallenge.type === 'COMPLETE') &&
    currentChallenge.question &&
    (currentChallenge.question.toLowerCase().includes('nghe') || currentChallenge.question.toLowerCase().includes('luy\u1ec7n nghe'))
  );
  const totalChallenges = lesson?.totalChallenges || 0;
  const progress = originalTotal > 0 ? (correctCount / originalTotal) * 100 : 0;

  // Play audio with proper instance management - defined before useEffects that use it
  const playAudio = useCallback((src) => {
    if (!src || !isMountedRef.current) return;
    
    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audio = new Audio(src);
    audioRef.current = audio;
    
    audio.play().catch((err) => {
      if (isMountedRef.current) {
        console.error('Audio play error:', err);
      }
      audioRef.current = null;
    });
    
    // Cleanup when audio ends
    audio.onended = () => {
      audioRef.current = null;
    };
    
    audio.onerror = () => {
      if (isMountedRef.current) {
        console.error('Audio load error:', src);
      }
      audioRef.current = null;
    };
  }, []);

  // Clean question text for TTS - remove underscores and blank placeholders
  const cleanTextForTTS = useCallback((text) => {
    if (!text) return '';
    
    // Remove underscore patterns like "_ _ _ _ _" or "_ _ _ _"
    let cleaned = text.replace(/(_+ )+/g, '');
    
    // Remove trailing underscores
    cleaned = cleaned.replace(/\s*_+\s*$/g, '');
    
    // Remove underscores in the middle but keep spaces
    cleaned = cleaned.replace(/_+/g, ' ');
    
    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }, []);

  // Auto-play audio when challenge loads (only when challenge truly changes)
  useEffect(() => {
    // Reset auto-play flag when challenge changes
    hasAutoPlayedAudioRef.current = false;
    
    if (
      currentChallenge?.audioSrc &&
      status === 'idle' &&
      autoPlayTTS &&
      !hasAutoPlayedAudioRef.current
    ) {
      const timer = setTimeout(() => {
        if (isMountedRef.current && !hasAutoPlayedAudioRef.current) {
          hasAutoPlayedAudioRef.current = true;
          playAudio(currentChallenge.audioSrc);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentChallenge?._id, status, autoPlayTTS, playAudio]);

  // Auto-play TTS when listening or TYPE challenge loads (only when challenge truly changes)
  useEffect(() => {
    // Reset auto-play flag when challenge changes
    hasAutoPlayedTTSRef.current = false;
    
    if (
      autoPlayTTS &&
      status === 'idle' &&
      tts.isSupported &&
      !hasAutoPlayedTTSRef.current
    ) {
      const shouldSpeak = currentChallenge?.type === 'TYPE' || isListeningChallenge;
      
      if (shouldSpeak) {
        const timer = setTimeout(() => {
          if (isMountedRef.current && !hasAutoPlayedTTSRef.current) {
            hasAutoPlayedTTSRef.current = true;
            let textToSpeak = '';
            if (isListeningChallenge) {
              textToSpeak = currentChallenge.correctAnswer || 
                (currentChallenge.type === 'ORDER' && currentChallenge.correctOrder && currentChallenge.wordBank 
                  ? currentChallenge.correctOrder.map(idx => currentChallenge.wordBank[idx]).join(' ') 
                  : '');
            } else {
              textToSpeak = currentChallenge.question;
            }
            
            const cleanedText = cleanTextForTTS(textToSpeak);
            if (cleanedText) {
              tts.speak(cleanedText, { rate: 0.9 });
            }
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [currentChallenge?._id, currentChallenge?.type, status, autoPlayTTS, tts.isSupported, cleanTextForTTS, isListeningChallenge]);

  // Cleanup audio on unmount only - use isUnmountingRef to prevent TTS cancel on re-render
  useEffect(() => {
    isMountedRef.current = true;
    isUnmountingRef.current = false;
    
    return () => {
      isMountedRef.current = false;
      isUnmountingRef.current = true;
      
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Stop TTS only on actual unmount (not on re-render)
      if (tts.isSupported) {
        window.speechSynthesis.cancel();
      }

      if (completionNavigateTimerRef.current) {
        clearTimeout(completionNavigateTimerRef.current);
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Initialize states when challenge changes
  useEffect(() => {
    const challenge = lesson?.challenges?.[currentIndex];
    if (!challenge) return;

    const type = challenge.type;

    if (type === 'ORDER') {
      // Shuffle word bank for ORDER challenge
      const shuffled = buildOrderTokens(challenge.wordBank || []).sort(() => Math.random() - 0.5);
      setOrderedWords([]);
      setOrderedWordBank(shuffled);
    } else if (type === 'MATCH') {
      // Shuffle left and right for MATCH challenge
      const pairs = challenge.pairs || [];
      const lefts = pairs.map((p, i) => ({ text: p.left, index: i }));
      const rights = pairs.map((p, i) => ({ text: p.right, index: i }));
      const shuffledLeft = [...lefts].sort(() => Math.random() - 0.5);
      const shuffledRight = [...rights].sort(() => Math.random() - 0.5);
      setMatchedPairs({});
      setMatchLeftPool(shuffledLeft);
      setMatchRightPool(shuffledRight);
      setSelectedMatchLeft(null);
      setSelectedMatchRight(null);
    } else if (type === 'FILL') {
      setSelectedFillOption(null);
    } else if (type === 'LISTEN') {
      // Initialize word bank for LISTEN challenge
      const bank = challenge.wordBank || (challenge.correctAnswer || '').split(' ');
      const shuffled = [...bank].sort(() => Math.random() - 0.5);
      setListenWordBank(shuffled);
      setListenFlyingWord(null);
    }
  }, [currentIndex, lesson]);

  // Focus input for TYPE challenges
  useEffect(() => {
    if (status === 'idle' && lesson?.challenges?.[currentIndex]?.type === 'TYPE') {
      inputRef.current?.focus();
    }
  }, [status, currentIndex, lesson]);

  // Play correct/wrong sound effects when status changes
  useEffect(() => {
    if (status === 'correct') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
      audio.volume = 0.45;
      audio.play().catch(e => console.log('Audio playback failed or was blocked by browser:', e));
    } else if (status === 'wrong') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.35;
      audio.play().catch(e => console.log('Audio playback failed or was blocked by browser:', e));
    }
  }, [status]);

  // === HANDLERS FOR NEW CHALLENGE TYPES ===

  // ORDER: Move word from bank to answer area
  const handleOrderWordClick = useCallback((wordIndex) => {
    if (status !== 'idle') return;
    const token = orderedWordBank[wordIndex];
    if (!token) return;
    setOrderedWords((prev) => [...prev, token]);
    setOrderedWordBank((prev) => prev.filter((_, i) => i !== wordIndex));
  }, [status, orderedWordBank]);

  // ORDER: Move word back to bank
  const handleOrderWordRemove = useCallback((wordIndex) => {
    if (status !== 'idle') return;
    const token = orderedWords[wordIndex];
    if (!token) return;
    setOrderedWordBank((prev) => [...prev, token]);
    setOrderedWords((prev) => prev.filter((_, i) => i !== wordIndex));
  }, [status, orderedWords]);

  // LISTEN: Click word to add to answer with flying animation
  const handleListenWordClick = useCallback((word, wordIndex) => {
    if (status !== 'idle') return;
    
    // Set flying word for animation
    setListenFlyingWord({ word, bankIndex: wordIndex });
    
    // Remove from bank
    setListenWordBank((prev) => prev.filter((_, i) => i !== wordIndex));
    
    // Add to typed answer
    setTypedAnswer((prev) => {
      const newAnswer = prev ? `${prev} ${word}` : word;
      return newAnswer;
    });
    
    // Clear flying word after animation
    setTimeout(() => {
      setListenFlyingWord(null);
    }, 300);
  }, [status]);

  // LISTEN: Remove last word from answer
  const handleListenWordRemove = useCallback((e) => {
    if (status !== 'idle' || !typedAnswer) return;
    if (e.key === 'Backspace' && typedAnswer.split(' ').length === 1) {
      // Get original bank
      const bank = currentChallenge?.wordBank || (currentChallenge?.correctAnswer || '').split(' ');
      const lastWord = typedAnswer.split(' ').pop();
      // Add back to bank
      setListenWordBank((prev) => [...prev, lastWord]);
      setTypedAnswer((prev) => {
        const words = prev.split(' ');
        words.pop();
        return words.join(' ') || '';
      });
    }
  }, [status, typedAnswer, currentChallenge]);

  // ORDER: Submit
  const handleOrderSubmit = useCallback(async () => {
    if (!isPro && !isPractice && hearts <= 0) {
      setShowHeartsModal(true);
      return;
    }
    if (status !== 'idle' || orderedWords.length === 0 || !currentChallenge) return;
    try {
      const userOrder = orderedWords.map(token => token.index);
      const result = await duolingoService.submitAnswer(currentChallenge._id, null, JSON.stringify(userOrder), answerContext);
      if (result.data?.isCorrect) {
        setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 10;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        advanceAfterCorrectAnswer();
      } else {
        setStatus('wrong');
        setShowCorrectAnswer(true);
        await handleWrongAnswer();
        // Auto advance to next challenge after 2 seconds
        setTimeout(() => nextChallenge(), 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, orderedWords, isPro, isPractice, hearts, answerContext]);

  // MATCH: Select items
  const [selectedMatchLeft, setSelectedMatchLeft] = useState(null);
  const [selectedMatchRight, setSelectedMatchRight] = useState(null);

  const handleMatchLeftClick = useCallback((leftText, leftIndex) => {
    if (status !== 'idle') return;
    
    // Click on already matched card -> Unmatch/Undo pairing
    if (matchedPairs[leftIndex] !== undefined) {
      const newPairs = { ...matchedPairs };
      delete newPairs[leftIndex];
      setMatchedPairs(newPairs);
      setSelectedMatchLeft(leftIndex); // Keep it active for new matching
      setSelectedMatchRight(null);
      return;
    }
    
    if (selectedMatchRight !== null) {
      // Right card was already selected, match them!
      const newPairs = { ...matchedPairs, [leftIndex]: selectedMatchRight };
      setMatchedPairs(newPairs);
      setSelectedMatchRight(null);
      setSelectedMatchLeft(null);
    } else {
      // Toggle or set left selection
      setSelectedMatchLeft(prev => prev === leftIndex ? null : leftIndex);
    }
  }, [status, matchedPairs, selectedMatchRight]);

  const handleMatchRightClick = useCallback((rightText, rightIndex) => {
    if (status !== 'idle') return;
    
    // Click on already matched card -> Find partner and unmatch
    const matchedLeftKey = Object.keys(matchedPairs).find(key => matchedPairs[key] === rightIndex);
    if (matchedLeftKey !== undefined) {
      const newPairs = { ...matchedPairs };
      delete newPairs[matchedLeftKey];
      setMatchedPairs(newPairs);
      setSelectedMatchRight(rightIndex); // Keep it active for new matching
      setSelectedMatchLeft(null);
      return;
    }

    if (selectedMatchLeft !== null) {
      // Left card was already selected, match them!
      const newPairs = { ...matchedPairs, [selectedMatchLeft]: rightIndex };
      setMatchedPairs(newPairs);
      setSelectedMatchLeft(null);
      setSelectedMatchRight(null);
    } else {
      // Toggle or set right selection
      setSelectedMatchRight(prev => prev === rightIndex ? null : rightIndex);
    }
  }, [status, matchedPairs, selectedMatchLeft]);

  const handleMatchSubmit = useCallback(async () => {
    if (!isPro && !isPractice && hearts <= 0) {
      setShowHeartsModal(true);
      return;
    }
    if (status !== 'idle' || !currentChallenge) return;
    const pairs = currentChallenge.pairs || [];
    if (Object.keys(matchedPairs).length !== pairs.length) return;
    try {
      // Build userAnswer from the shuffled matchLeftPool to preserve shuffled positions
      const leftPool = matchLeftPool; // items with shuffled order, each has .index = original pair index
      const userAnswer = leftPool.map((leftItem) => ({
        leftIndex: leftItem.index,
        rightIndex: matchedPairs[leftItem.index],
      }));
      const result = await duolingoService.submitAnswer(currentChallenge._id, null, JSON.stringify(userAnswer), answerContext);
      if (result.data?.isCorrect) {
        setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 10;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        advanceAfterCorrectAnswer();
      } else {
        setStatus('wrong');
        setShowCorrectAnswer(true);
        await handleWrongAnswer();
        // Auto advance to next challenge after 2 seconds
        setTimeout(() => nextChallenge(), 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, matchedPairs, isPro, isPractice, hearts, answerContext]);

  // FILL: Submit
  const handleFillSubmit = useCallback(async (optionId) => {
    if (!isPro && !isPractice && hearts <= 0) {
      setShowHeartsModal(true);
      return;
    }
    if (status !== 'idle' || !currentChallenge) return;
    try {
      const result = await duolingoService.submitAnswer(currentChallenge._id, optionId, null, answerContext);
      if (result.data?.isCorrect) {
        setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 10;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        advanceAfterCorrectAnswer();
      } else {
        setStatus('wrong');
        setShowCorrectAnswer(true);
        await handleWrongAnswer();
        // Auto advance to next challenge after 2 seconds
        setTimeout(() => nextChallenge(), 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, isPro, isPractice, hearts, answerContext]);

  // COMPLETE & TRANSLATE: Submit typed answer
  const handleWordSubmit = useCallback(async () => {
    if (!isPro && !isPractice && hearts <= 0) {
      setShowHeartsModal(true);
      return;
    }
    if (status !== 'idle' || !currentChallenge || !typedAnswer.trim()) return;
    try {
      const result = await duolingoService.submitAnswer(currentChallenge._id, null, typedAnswer, answerContext);
      if (result.data?.isCorrect) {
        setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 0;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        if (earnedPoints > 0) triggerXpPopup(earnedPoints);
        advanceAfterCorrectAnswer();
      } else {
        setStatus('wrong');
        setShowCorrectAnswer(true);
        await handleWrongAnswer();
        // Auto advance to next challenge after 2 seconds
        setTimeout(() => nextChallenge(), 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, typedAnswer, isPro, isPractice, hearts, answerContext]);

  // Aliases for TRANSLATE and COMPLETE
  const handleTranslateSubmit = handleWordSubmit;
  const handleCompleteSubmit = handleWordSubmit;

  const loadLesson = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (isPractice) {
        response = await duolingoService.practiceLesson(lessonId);
      } else {
        response = await duolingoService.getLesson(
          lessonId,
          isDailyChallenge ? { mode: 'daily', dailyChallengeId } : undefined
        );
      }
      const fetchedLesson = response.data || response;
      const challengeCount = Array.isArray(fetchedLesson?.challenges) ? fetchedLesson.challenges.length : 0;
      if (challengeCount === 0) {
        setLesson(null);
        setOriginalTotal(0);
        setCurrentIndex(0);
        pointsRef.current = 0;
        setError('Bài học này chưa có câu hỏi. Giáo viên cần thêm hoặc tạo lại nội dung AI trước khi học viên bắt đầu.');
        return;
      }
      setLesson(fetchedLesson);
      setOriginalTotal(challengeCount);
      setCorrectCount(0);
      setSelectedOption(null);
      setTypedAnswer('');
      setStatus('idle');

      // Check if there is saved progress for this specific lesson
      const savedProgressJSON = localStorage.getItem(progressStorageKey);
      if (savedProgressJSON) {
        const savedProgress = JSON.parse(savedProgressJSON);
        if (savedProgress && savedProgress.currentIndex > 0 && savedProgress.currentIndex < (fetchedLesson?.challenges?.length || 0)) {
          setPendingResumeData(savedProgress);
          setShowResumeModal(true);
          return;
        }
      }

      setCurrentIndex(0);
      pointsRef.current = 0;
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError(err.message || 'Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lessonId, isPractice, isDailyChallenge, dailyChallengeId, progressStorageKey]);

  const loadHearts = useCallback(async () => {
    try {
      const response = await duolingoService.getHearts();
      const data = response.data || response;
      const currentHearts = data?.hearts ?? 5;
      const currentIsPro = data?.isPro || false;
      setHearts(currentHearts);
      setIsPro(currentIsPro);
      if (!isPractice && !currentIsPro && currentHearts <= 0) {
        setShowHeartsModal(true);
      }
    } catch (err) {
      console.error('Failed to load hearts:', err);
    }
  }, [isPractice]);

  // Initial data load - after callbacks are defined
  useEffect(() => {
    loadLesson();
    loadHearts();
  }, [lessonId, loadLesson, loadHearts]);

  const handleOptionSelect = useCallback(
    async (option) => {
      if (!isPro && !isPractice && hearts <= 0) {
        setShowHeartsModal(true);
        return;
      }
      if (status !== 'idle' || !currentChallenge || !option) return;
      setSelectedOption(option.text);

      try {
        const optionId = option._id || option.text;
        const result = await duolingoService.submitAnswer(currentChallenge._id, optionId, null, answerContext);

        if (result.data?.isCorrect) {
          setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 0;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        if (earnedPoints > 0) triggerXpPopup(earnedPoints);
        advanceAfterCorrectAnswer();
        } else {
          setStatus('wrong');
          setShowCorrectAnswer(true);
          await handleWrongAnswer();
          // Auto advance to next challenge after 2 seconds (enough time to see correct answer)
          setTimeout(() => {
            nextChallenge();
          }, 2000);
        }
      } catch (err) {
        console.error('Submit failed:', err);
        setStatus('idle');
        setSelectedOption(null);
      }
    },
    [currentChallenge, status, currentIndex, isPro, isPractice, hearts, answerContext]
  );

  const handleTypedSubmit = useCallback(async () => {
    if (!isPro && !isPractice && hearts <= 0) {
      setShowHeartsModal(true);
      return;
    }
    if (status !== 'idle' || !currentChallenge || !typedAnswer.trim()) return;

    try {
      const result = await duolingoService.submitAnswer(currentChallenge._id, null, typedAnswer, answerContext);

      if (result.data?.isCorrect) {
        setStatus('correct');
        setShowCorrectAnswer(false);
        setCorrectCount(c => c + 1);
        const earnedPoints = result.data.pointsEarned ?? 0;
        setLastEarnedPoints(earnedPoints);
        pointsRef.current += earnedPoints;
        advanceAfterCorrectAnswer();
      } else {
        setStatus('wrong');
        setShowCorrectAnswer(true);
        await handleWrongAnswer();
        // Auto advance to next challenge after 2 seconds (enough time to see correct answer)
        setTimeout(() => {
          nextChallenge();
        }, 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, typedAnswer, isPro, isPractice, hearts, answerContext]);

  const handleWrongAnswer = async () => {
    const currentLesson = lessonRef.current;
    const curIndex = currentIndexRef.current;
    const curChallenge = currentLesson?.challenges?.[curIndex];

    if (curChallenge) {
      setLesson(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          challenges: [...prev.challenges, curChallenge]
        };
      });
    }

    if (isPro) return; // Pro users never lose hearts or show refill modals
    try {
      const heartsResult = await duolingoService.reduceHearts();
      const hData = heartsResult.data || heartsResult;
      if (hData?.error === 'no_hearts') {
        setShowHeartsModal(true);
      } else {
        setHearts(hData?.hearts ?? hearts - 1);
        if (hData?.hearts === 0) {
          setShowHeartsModal(true);
        }
      }
    } catch (err) {
      console.error('Reduce hearts failed:', err);
      setHearts((h) => Math.max(0, h - 1));
      if (hearts <= 1) setShowHeartsModal(true);
    }
  };

  // XP Popup animation trigger
  const triggerXpPopup = (points) => {
    // Random position near center of screen
    const x = Math.random() * 60 + 20; // 20-80% from left
    setXpPopup({ points, x, id: Date.now() });
    setTimeout(() => setXpPopup(null), 1000);
  };

  const handleResume = () => {
    if (pendingResumeData) {
      setCurrentIndex(pendingResumeData.currentIndex);
      pointsRef.current = pendingResumeData.points || 0;
      setCorrectCount(pendingResumeData.correctCount || 0);
      if (pendingResumeData.challenges) {
        setLesson(prev => ({
          ...prev,
          challenges: pendingResumeData.challenges
        }));
      }
    }
    setShowResumeModal(false);
    setPendingResumeData(null);
  };

  const handleStartOver = () => {
    localStorage.removeItem(progressStorageKey);
    setCurrentIndex(0);
    pointsRef.current = 0;
    setCorrectCount(0);
    loadLesson();
    setShowResumeModal(false);
    setPendingResumeData(null);
  };

  const nextChallenge = () => {
    setSelectedOption(null);
    setTypedAnswer('');
    setStatus('idle');
    setShowCorrectAnswer(false);
    setLastEarnedPoints(0);
    setOrderedWords([]);
    setOrderedWordBank([]);
    setMatchedPairs({});
    setSelectedFillOption(null);
    setSelectedMatchLeft(null);
    setSelectedMatchRight(null);
    setListenWordBank([]);
    setListenFlyingWord(null);
    const currentLesson = lessonRef.current;
    const curIndex = currentIndexRef.current;
    const currentCorrectCount = correctCountRef.current;

    if (curIndex < (currentLesson?.challenges?.length || 0) - 1) {
      const nextIndex = curIndex + 1;
      setCurrentIndex(nextIndex);
      localStorage.setItem(
        progressStorageKey,
        JSON.stringify({
          currentIndex: nextIndex,
          points: pointsRef.current,
          correctCount: currentCorrectCount,
          challenges: currentLesson?.challenges
        })
      );
    } else {
      completeLesson();
    }
  };

  function advanceAfterCorrectAnswer() {
    const currentLesson = lessonRef.current;
    const curIndex = currentIndexRef.current;
    const isFinalChallenge = curIndex >= (currentLesson?.challenges?.length || 0) - 1;

    if (isFinalChallenge) {
      completeLesson();
      return;
    }

    setTimeout(() => nextChallenge(), 1000);
  }

  async function completeLesson() {
    if (completionRequestRef.current) {
      return completionRequestRef.current;
    }

    completionRequestRef.current = (async () => {
      try {
        if (isDailyChallenge) {
          await duolingoService.completeDailyChallenge(lessonId, dailyChallengeId);
        } else if (!isPractice) {
          await duolingoService.completeLesson(lessonId);
        }
        localStorage.removeItem(progressStorageKey);

        // Also refresh quests panel
        window.dispatchEvent(new CustomEvent('quest:update'));

        if (!isMountedRef.current) return;

        setStatus('complete');
        setShowConfetti(true);
        completionNavigateTimerRef.current = setTimeout(() => {
          navigate(returnPath);
        }, 3000);
      } catch (err) {
        console.error('Complete lesson failed:', err);
        completionRequestRef.current = null;
        if (!isMountedRef.current) return;
        const message = err?.response?.data?.error?.message
          || err?.response?.data?.message
          || err?.message
          || 'Complete lesson failed';
        alert(message);
        navigate(returnPath);
      }
    })();

    return completionRequestRef.current;
  }

  const handleRefillHearts = async () => {
    setIsRefilling(true);
    setRefillError(null);
    try {
      const result = await duolingoService.refillHearts();

      // Handle insufficient points error from backend
      if (result.data?.error === 'insufficient_points') {
        setRefillError(`Not enough XP! Need ${result.data.required}, you have ${result.data.current}`);
        return;
      }

      setHearts(result.data?.hearts ?? 5);
      setShowHeartsModal(false);
    } catch (err) {
      console.error('Refill hearts failed:', err);
      setRefillError('Failed to refill hearts. Please try again.');
    } finally {
      setIsRefilling(false);
    }
  };

  // Keyboard shortcuts (1-9 for options, Enter to continue/submit)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (status !== 'idle' && status !== 'complete') return;

      if (status === 'complete') {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(returnPath);
        }
        return;
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const options = currentChallenge?.options;
        if (options && options[num - 1]) {
          handleOptionSelect(options[num - 1]);
        }
      }
      if (e.key === 'Enter') {
        if (currentChallenge?.type === 'TYPE') {
          handleTypedSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChallenge, selectedOption, status, navigate, returnPath, handleOptionSelect, handleTypedSubmit]);

  if (loading) {
    return (
      <div className="lesson-page">
        <PageSkeleton type="lesson" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="lesson-page lesson-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h2>Something went wrong</h2>
          <p>{error || 'Lesson not found'}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => loadLesson()}>
              Try Again
            </button>
            <button className="btn btn-outline-secondary" onClick={() => navigate(returnPath)}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLastChallenge = currentIndex === totalChallenges - 1;

  return (
    <div className="lesson-page">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="confetti-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ConfettiEffect />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="lesson-header" role="banner">
        <button
          className="exit-btn"
          onClick={() => setShowExitModal(true)}
          aria-label="Exit lesson"
          title="Exit lesson"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          className="progress-wrapper"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Lesson progress: ${correctCount} of ${originalTotal}`}
        >
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text" aria-live="polite">
            {correctCount} / {originalTotal}
          </span>
        </div>

        {isPro ? (
          <div
            className="hearts-display pro"
            role="img"
            aria-label="Vô hạn tim"
          >
            <span className="heart-icon active premium-infinite-badge">
              <span className="premium-infinite-heart">❤️</span>
              <span className="premium-infinite-symbol">∞</span>
            </span>
          </div>
        ) : (
          <div
            className="hearts-display"
            role="img"
            aria-label={`Hearts: ${hearts} of 5 remaining`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`heart-icon ${i < hearts ? 'active' : 'empty'}`} aria-hidden="true">
                {i < hearts ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="lesson-content" role="main">
        <AnimatePresence mode="wait">
          {status === 'complete' ? (
            <motion.div
              key="complete"
              className="completion-screen"
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="completion-icon"
                role="img"
                aria-label="Celebration"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                🎉
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Lesson Complete!
              </motion.h2>
              <motion.p
                className="xp-earned"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
              >
                +{pointsRef.current} XP
              </motion.p>
              <motion.div
                className="completion-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {isPractice && <span>Practiced: {lesson.title}</span>}
              </motion.div>
              <motion.p
                className="continue-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0.5] }}
                transition={{ delay: 0.8, duration: 1.5, repeat: Infinity }}
              >
                Press Enter to continue
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              className="challenge-container"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              role="region"
              aria-label={`Challenge ${correctCount + 1} of ${originalTotal}`}
            >
              {/* Question */}
              <div className="challenge-question" role="question">
                {currentChallenge?.imageSrc && (
                  <div className="question-image">
                    <img src={currentChallenge.imageSrc} alt="Question visual" />
                  </div>
                )}

                {/* ===== LISTENING CHALLENGE: Dạng 1 - Nghe và điền (ORDER) ===== */}
                {isListeningChallenge && currentChallenge?.type === 'ORDER' && (
                  <div className="listening-challenge-header">
                    <p className="listening-instruction">Nghe và điền</p>
                    <div className="listening-controls">
                      <div className="listening-btn-wrapper">
                        {tts.isSpeaking && <div className="listening-pulse-ring" />}
                        <motion.button
                          className={`listening-audio-btn-large ${tts.isSpeaking ? 'is-speaking' : ''}`}
                          onClick={() => {
                            if (tts.isSpeaking) { tts.stop(); return; }
                            const text = currentChallenge.correctAnswer ||
                              (currentChallenge.correctOrder && currentChallenge.wordBank
                                ? currentChallenge.correctOrder.map(idx => currentChallenge.wordBank[idx]).join(' ')
                                : '');
                            if (text) tts.speak(cleanTextForTTS(text), { rate: 0.9 });
                          }}
                          whileHover={{ scale: 1.07 }}
                          whileTap={{ scale: 0.93 }}
                          title="Nghe (tốc độ bình thường)"
                          aria-label="Phát âm thanh"
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        </motion.button>
                      </div>
                      <motion.button
                        className="listening-audio-btn-turtle"
                        onClick={() => {
                          if (tts.isSpeaking) { tts.stop(); return; }
                          const text = currentChallenge.correctAnswer ||
                            (currentChallenge.correctOrder && currentChallenge.wordBank
                              ? currentChallenge.correctOrder.map(idx => currentChallenge.wordBank[idx]).join(' ')
                              : '');
                          if (text) tts.speak(cleanTextForTTS(text), { rate: 0.5 });
                        }}
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.93 }}
                        title="Nghe (tốc độ chậm)"
                        aria-label="Phát âm chậm"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        <span className="turtle-icon">🐢</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ===== LISTENING CHALLENGE: Dạng 2 - Nhập từ còn thiếu (COMPLETE) ===== */}
                {isListeningChallenge && currentChallenge?.type === 'COMPLETE' && (
                  <div className="listening-challenge-header">
                    <p className="listening-instruction">Nhập từ còn thiếu</p>
                    <div className="listening-speech-bubble-row">
                      <AvatarIllustration />
                      <div className="listening-speech-bubble">
                        <motion.button
                          className={`bubble-audio-btn ${tts.isSpeaking ? 'is-speaking' : ''}`}
                          onClick={() => {
                            if (tts.isSpeaking) { tts.stop(); return; }
                            const text = currentChallenge.correctAnswer || '';
                            if (text) tts.speak(cleanTextForTTS(text), { rate: 0.9 });
                          }}
                          whileHover={{ scale: 1.07 }}
                          whileTap={{ scale: 0.93 }}
                          title="Nghe câu"
                          aria-label="Phát âm thanh"
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        </motion.button>
                        <motion.button
                          className="bubble-audio-btn bubble-turtle-btn"
                          onClick={() => {
                            if (tts.isSpeaking) { tts.stop(); return; }
                            const text = currentChallenge.correctAnswer || '';
                            if (text) tts.speak(cleanTextForTTS(text), { rate: 0.5 });
                          }}
                          whileHover={{ scale: 1.07 }}
                          whileTap={{ scale: 0.93 }}
                          title="Nghe chậm"
                          aria-label="Phát âm chậm"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                          <span style={{fontSize:'12px'}}>🐢</span>
                        </motion.button>
                      </div>
                    </div>
                    {currentChallenge?.sentence && (() => {
                      const parts = currentChallenge.sentence.split('___');
                      return (
                        <div className="listening-sentence-card">
                          <p className="listening-sentence-text">
                            {parts[0]}
                            <span className="listening-blank">___</span>
                            {parts[1] || ''}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Audio/TTS Controls (non-listening challenges) */}
                {!isListeningChallenge && (
                  <div className="question-media-controls" aria-label="Audio controls">
                    {currentChallenge?.audioSrc && (
                      <motion.button
                        className="audio-btn-mini"
                        onClick={() => playAudio(currentChallenge.audioSrc)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Play audio"
                        aria-label="Play audio"
                      >
                        🔊
                      </motion.button>
                    )}
                    {currentChallenge?.type === 'TYPE' && (
                      <motion.button
                        className={`audio-btn-mini tts-btn ${tts.isSpeaking ? 'is-speaking' : ''}`}
                        onClick={() => {
                          if (tts.isSpeaking) {
                            tts.stop();
                          } else {
                            const cleanedText = cleanTextForTTS(currentChallenge.question);
                            if (cleanedText) {
                              tts.speak(cleanedText);
                            }
                          }
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Listen to question"
                        aria-label="Listen to question pronunciation"
                        aria-pressed={tts.isSpeaking}
                      >
                        {tts.isSpeaking ? '🔊' : '🔈'}
                      </motion.button>
                    )}
                  </div>
                )}

                {!isListeningChallenge && (
                  <>
                    <p className="question-text" aria-live="polite">{currentChallenge?.question}</p>
                    {currentChallenge?.sentence && (
                      <div className="listening-sentence-card" style={{ marginTop: '1rem', width: '100%', maxWidth: 'none' }}>
                        {(() => {
                          const parts = currentChallenge.sentence.split('___');
                          return (
                            <p className="listening-sentence-text" style={{ textAlign: 'center' }}>
                              {parts[0]}
                              <span className="listening-blank">___</span>
                              {parts[1] || ''}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Options */}
              <div className={`options-container ${['TYPE', 'TRANSLATE', 'COMPLETE'].includes(currentChallenge?.type) ? 'type-mode' : ''}`} role="group" aria-label="Answer options">

                {/* TYPE: type answer */}
                {currentChallenge?.type === 'TYPE' && (
                  <div className="type-input-wrapper">
                    <label htmlFor="type-input" className="sr-only">Type your answer</label>
                    <input
                      id="type-input"
                      ref={inputRef}
                      type="text"
                      className={`type-input ${status === 'correct' ? 'correct' : ''} ${status === 'wrong' ? 'wrong' : ''}`}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTypedSubmit()}
                      placeholder="Type your answer..."
                      disabled={status !== 'idle'}
                      autoComplete="off"
                      aria-describedby="type-feedback"
                    />
                    {status !== 'idle' && (
                      <div id="type-feedback" className={`type-feedback ${status}`} role="status" aria-live="polite">
                        {status === 'correct' ? '✓ Correct!' : '✗ Try again'}
                      </div>
                    )}
                    {status === 'idle' && (
                      <button
                        className="submit-btn"
                        onClick={handleTypedSubmit}
                        disabled={!typedAnswer.trim()}
                        aria-label="Submit answer"
                      >
                        Check
                      </button>
                    )}
                  </div>
                )}

                {/* TRANSLATE: type translation (VN->EN) */}
                {currentChallenge?.type === 'TRANSLATE' && (
                  <div className="type-input-wrapper">
                    <label htmlFor="translate-input" className="sr-only">Type your translation</label>
                    <input
                      id="translate-input"
                      ref={inputRef}
                      type="text"
                      className={`type-input ${status === 'correct' ? 'correct' : ''} ${status === 'wrong' ? 'wrong' : ''}`}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTranslateSubmit()}
                      placeholder="Type your translation..."
                      disabled={status !== 'idle'}
                      autoComplete="off"
                    />
                    {status !== 'idle' && (
                      <div className={`type-feedback ${status}`} role="status" aria-live="polite">
                        {status === 'correct' ? '✓ Correct!' : '✗ Try again'}
                      </div>
                    )}
                    {status === 'idle' && (
                      <button
                        className="submit-btn"
                        onClick={handleTranslateSubmit}
                        disabled={!typedAnswer.trim()}
                        aria-label="Submit translation"
                      >
                        Check
                      </button>
                    )}
                  </div>
                )}

                {/* COMPLETE: fill blank with typing */}
                {currentChallenge?.type === 'COMPLETE' && (
                  <div className="type-input-wrapper">
                    <label htmlFor="complete-input" className="sr-only">Complete the sentence</label>
                    <input
                      id="complete-input"
                      ref={inputRef}
                      type="text"
                      className={`type-input ${status === 'correct' ? 'correct' : ''} ${status === 'wrong' ? 'wrong' : ''}`}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCompleteSubmit()}
                      placeholder="Type the missing word..."
                      disabled={status !== 'idle'}
                      autoComplete="off"
                    />
                    {status !== 'idle' && (
                      <div className={`type-feedback ${status}`} role="status" aria-live="polite">
                        {status === 'correct' ? '✓ Correct!' : '✗ Try again'}
                      </div>
                    )}
                    {status === 'idle' && (
                      <button
                        className="submit-btn"
                        onClick={handleCompleteSubmit}
                        disabled={!typedAnswer.trim()}
                        aria-label="Submit answer"
                      >
                        Check
                      </button>
                    )}
                  </div>
                )}

                {/* LISTEN: Listen and write - Duolingo style */}
                {currentChallenge?.type === 'LISTEN' && (
                  <div className="listen-challenge">
                    {/* Title */}
                    <p className="listen-title">Listen and write what you hear</p>
                    
                    {/* Audio controls */}
                    <div className="listen-controls">
                      <motion.button
                        className={`listen-play-btn ${tts.isSpeaking ? 'is-speaking' : ''}`}
                        onClick={() => {
                          if (tts.isSpeaking) { tts.stop(); return; }
                          const text = currentChallenge.correctAnswer || '';
                          if (text) tts.speak(cleanTextForTTS(text), { rate: 0.9 });
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        title="Nghe câu"
                        aria-label="Phát âm thanh"
                      >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                          {tts.isSpeaking ? (
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                          ) : (
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                          )}
                        </svg>
                        <span className="listen-label">{tts.isSpeaking ? 'Dừng' : 'Nghe'}</span>
                      </motion.button>
                      
                      <motion.button
                        className="listen-play-btn slow"
                        onClick={() => {
                          if (tts.isSpeaking) { tts.stop(); return; }
                          const text = currentChallenge.correctAnswer || '';
                          if (text) tts.speak(cleanTextForTTS(text), { rate: 0.5 });
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        title="Nghe chậm"
                        aria-label="Phát âm chậm"
                      >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        <span className="listen-label">Chậm</span>
                      </motion.button>
                    </div>
                    
                    {/* Divider */}
                    <div className="listen-divider" />
                    
                    {/* Word bank - shuffled, with distractors - từ sẽ mất khi chọn */}
                    <div className="listen-word-bank">
                      {listenWordBank.map((word, i) => (
                        <motion.button
                          key={`${word}-${i}-${currentChallenge._id}`}
                          className="listen-word-chip"
                          onClick={() => handleListenWordClick(word, i)}
                          disabled={status !== 'idle'}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5, y: 20 }}
                          transition={{ duration: 0.2 }}
                          layout
                        >
                          {word}
                        </motion.button>
                      ))}
                    </div>
                    
                    {/* Input area - hiển thị từ đã chọn dạng chip */}
                    <div className="listen-input-wrapper">
                      <div 
                        className={`listen-type-area ${status === 'correct' ? 'correct' : ''} ${status === 'wrong' ? 'wrong' : ''}`}
                        onClick={() => inputRef.current?.focus()}
                      >
                        {/* Hiển thị từ đã chọn dạng chip */}
                        <div className="listen-selected-words">
                          {typedAnswer.split(' ').filter(Boolean).map((word, i) => (
                            <motion.span
                              key={`selected-${i}`}
                              className="listen-selected-chip"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {word}
                              {status === 'idle' && (
                                <button
                                  className="listen-chip-remove"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove this word from answer and add back to bank
                                    const words = typedAnswer.split(' ').filter(Boolean);
                                    words.splice(i, 1);
                                    setTypedAnswer(words.join(' '));
                                    setListenWordBank(prev => [...prev, word]);
                                  }}
                                  aria-label={`Remove ${word}`}
                                >
                                  ×
                                </button>
                              )}
                            </motion.span>
                          ))}
                          <input
                            id="listen-input"
                            ref={inputRef}
                            type="text"
                            className="listen-type-input"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleWordSubmit();
                              handleListenWordRemove(e);
                            }}
                            placeholder={typedAnswer ? '' : 'Tap words above or type...'}
                            disabled={status !== 'idle'}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      
                      {/* Submit & Clear buttons */}
                      <div className="listen-action-buttons">
                        <button
                          className="listen-clear-btn"
                          onClick={() => {
                            // Return all selected words to bank
                            const words = typedAnswer.split(' ').filter(Boolean);
                            setListenWordBank(prev => [...prev, ...words]);
                            setTypedAnswer('');
                          }}
                          disabled={status !== 'idle' || !typedAnswer}
                          aria-label="Clear"
                        >
                          Clear
                        </button>
                        <button
                          className="listen-submit-btn"
                          onClick={handleWordSubmit}
                          disabled={status !== 'idle' || !typedAnswer.trim()}
                          aria-label="Submit answer"
                        >
                          Check
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ORDER: arrange words */}
                {currentChallenge?.type === 'ORDER' && (
                  <div className={`order-challenge ${isListeningChallenge ? 'listening-order' : ''}`}>
                    {/* Answer area */}
                    <div className="order-answer-area" aria-label="Your answer">
                      {orderedWords.length === 0 ? (
                        <div className="order-placeholder">Tap words below to build your answer</div>
                      ) : (
                        <div className="order-words-row">
                          {orderedWords.map((token, i) => (
                            <motion.button
                              key={`ans-${token.index}-${i}`}
                              className={`order-word-card ${status !== 'idle' ? 'locked' : ''}`}
                              onClick={() => handleOrderWordRemove(i)}
                              disabled={status !== 'idle'}
                              whileHover={status === 'idle' ? { scale: 1.05 } : {}}
                              whileTap={status === 'idle' ? { scale: 0.95 } : {}}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              {token.text}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Word bank */}
                    <div className="order-word-bank" aria-label="Word bank">
                      {orderedWordBank.map((token, i) => (
                        <motion.button
                          key={`bank-${token.index}-${i}`}
                          className={`order-word-card bank ${status !== 'idle' ? 'locked' : ''}`}
                          onClick={() => handleOrderWordClick(i)}
                          disabled={status !== 'idle'}
                          whileHover={status === 'idle' ? { scale: 1.05, backgroundColor: '#58cc02' } : {}}
                          whileTap={status === 'idle' ? { scale: 0.95 } : {}}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          {token.text}
                        </motion.button>
                      ))}
                    </div>
                    {/* Submit button */}
                    {status === 'idle' && orderedWords.length > 0 && (
                      <button
                        className="submit-btn"
                        onClick={handleOrderSubmit}
                        aria-label="Submit answer"
                      >
                        Check
                      </button>
                    )}
                    {status !== 'idle' && (
                      <div className={`type-feedback ${status}`} role="status" aria-live="polite">
                        {status === 'correct' ? '✓ Correct!' : '✗ Try again'}
                      </div>
                    )}
                  </div>
                )}

                {/* MATCH: connect pairs */}
                {currentChallenge?.type === 'MATCH' && (
                  <div className="match-challenge">
                    <div className="match-columns">
                      {/* Left column */}
                      <div className="match-column left-column" aria-label="Left items">
                        {matchLeftPool.map((item, i) => {
                          const isMatched = matchedPairs[item.index] !== undefined;
                          const isSelected = selectedMatchLeft === item.index;
                          return (
                            <motion.button
                              key={`left-${i}`}
                              className={`match-card left-card ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${status !== 'idle' ? 'locked' : ''}`}
                              onClick={() => handleMatchLeftClick(item.text, item.index)}
                              disabled={status !== 'idle'}
                              whileHover={status === 'idle' ? { scale: 1.03 } : {}}
                              whileTap={status === 'idle' ? { scale: 0.97 } : {}}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              {item.text}
                              {isMatched && <span className="match-check">✓</span>}
                            </motion.button>
                          );
                        })}
                      </div>
                      {/* Right column */}
                      <div className="match-column right-column" aria-label="Right items">
                        {matchRightPool.map((item, i) => {
                          const isMatched = Object.values(matchedPairs).includes(item.index);
                          const isSelected = selectedMatchRight === item.index;
                          return (
                            <motion.button
                              key={`right-${i}`}
                              className={`match-card right-card ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${status !== 'idle' ? 'locked' : ''}`}
                              onClick={() => handleMatchRightClick(item.text, item.index)}
                              disabled={status !== 'idle'}
                              whileHover={status === 'idle' ? { scale: 1.03 } : {}}
                              whileTap={status === 'idle' ? { scale: 0.97 } : {}}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              {item.text}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Submit */}
                    {status === 'idle' && Object.keys(matchedPairs).length === (currentChallenge?.pairs?.length || 0) && (
                      <button className="submit-btn" onClick={handleMatchSubmit} aria-label="Submit matches">
                        Check
                      </button>
                    )}
                    {status !== 'idle' && (
                      <div className={`type-feedback ${status}`} role="status" aria-live="polite">
                        {status === 'correct' ? '✓ Correct!' : '✗ Try again'}
                      </div>
                    )}
                  </div>
                )}

                {/* FILL: multiple choice for fill-in-the-blank */}
                {currentChallenge?.type === 'FILL' && (
                  <div className="options-grid" role="radiogroup" aria-label="Select the correct word">
                    {currentChallenge?.options?.map((option, index) => {
                      const isSelected = selectedFillOption === option.text;
                      const isCorrectOption = option.correct;
                      // Chỉ hiện đáp án đúng khi trả lời SAI
                      const showCorrect = status === 'wrong' && isCorrectOption;
                      const showWrong = status === 'wrong' && isSelected && !isCorrectOption;

                      return (
                        <motion.button
                          key={option.text}
                          className={`option-card ${isSelected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                          onClick={() => {
                            setSelectedFillOption(option.text);
                            handleFillSubmit(option.text);
                          }}
                          disabled={status !== 'idle'}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={status === 'idle' ? { scale: 1.02 } : {}}
                          whileTap={status === 'idle' ? { scale: 0.98 } : {}}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Option ${index + 1}: ${option.text}`}
                        >
                          <span className="keyboard-hint" aria-hidden="true">{index + 1}</span>
                          <span className="option-text">{option.text}</span>
                          {showCorrect && <span className="check-icon">✓</span>}
                          {showWrong && <span className="x-icon">✗</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* SELECT & ASSIST: original multiple choice */}
                {(currentChallenge?.type === 'SELECT' || currentChallenge?.type === 'ASSIST') && (
                  <div className="options-grid" role="radiogroup" aria-label="Select correct answer">
                    {currentChallenge?.options?.map((option, index) => {
                      const isSelected = selectedOption === option.text;
                      const isCorrectOption = option.correct;
                      // Chỉ hiện đáp án đúng khi trả lời SAI
                      const showCorrect = status === 'wrong' && isCorrectOption;
                      const showWrong = status === 'wrong' && isSelected && !isCorrectOption;

                      return (
                        <motion.button
                          key={option.text}
                          className={`option-card ${isSelected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                          onClick={() => handleOptionSelect(option)}
                          disabled={status !== 'idle'}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={status === 'idle' ? { scale: 1.02 } : {}}
                          whileTap={status === 'idle' ? { scale: 0.98 } : {}}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Option ${index + 1}: ${option.text}`}
                        >
                          <span className="keyboard-hint" aria-hidden="true">{index + 1}</span>
                          <div className="option-content">
                            {option.imageSrc && (
                              <img src={option.imageSrc} alt={option.text} className="option-image" />
                            )}
                            <span className="option-text">{option.text}</span>
                          </div>
                          {option.audioSrc && status === 'idle' && (
                            <button
                              className="option-audio-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                playAudio(option.audioSrc);
                              }}
                              title="Listen to pronunciation"
                            >
                              🔊
                            </button>
                          )}
                          {showCorrect && <span className="check-icon">✓</span>}
                          {showWrong && <span className="x-icon">✗</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Feedback */}
      <AnimatePresence>
        {status === 'correct' && (
          <motion.div
            className="feedback-bar correct slide-up-bounce"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
          >
            <motion.span
              className="feedback-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              ✨
            </motion.span>
            <span className="feedback-text">
              {lastEarnedPoints > 0 ? `Correct! +${lastEarnedPoints} XP` : 'Correct!'}
            </span>
          </motion.div>
        )}
        {status === 'wrong' && (
          <motion.div
            className="feedback-bar wrong slide-up-bounce"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
          >
            <motion.span
              className="feedback-icon"
              animate={{ x: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              💔
            </motion.span>
            <div className="feedback-content">
              <span className="feedback-text">
                Đáp án đúng: <strong>{getCorrectAnswerText(currentChallenge)}</strong>
              </span>
              <span className="feedback-hearts">
                {isPro ? '✨ Premium Vô Hạn Tim' : (hearts <= 1 ? 'Tim cuối cùng!' : `${hearts} tim còn lại`)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Popup Animation */}
      <AnimatePresence>
        {xpPopup && (
          <motion.div
            key={xpPopup.id}
            className="xp-popup"
            style={{ left: `${xpPopup.x}%`, top: '40%' }}
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ y: -60, opacity: 0, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            +{xpPopup.points} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ExitModal
        isOpen={showExitModal}
        onClose={() => {
          setShowExitModal(false);
          navigate(returnPath);
        }}
        onContinue={() => setShowExitModal(false)}
      />

      {/* Resume Lesson Modal */}
      <AnimatePresence>
        {showResumeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-modal-title"
          >
            <motion.div
              className="modal-content resume-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="mascot-container">
                <span className="mascot-happy" role="img" aria-label="Happy mascot">🦉</span>
              </div>
              <h2 id="resume-modal-title">Welcome back!</h2>
              <p className="modal-subtitle">You have an active learning session for this lesson.</p>
              <p className="modal-message">
                Would you like to resume where you left off (Challenge {pendingResumeData ? pendingResumeData.currentIndex + 1 : 1} of {lesson?.challenges?.length || 0}) or start over?
              </p>
              <div className="modal-actions">
                <button className="btn-continue btn-resume" onClick={handleResume}>
                  Resume Session
                </button>
                <button className="btn-exit btn-start-over" onClick={handleStartOver}>
                  Start Over
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <HeartsModal
        isOpen={showHeartsModal}
        onClose={() => setShowHeartsModal(false)}
        onRefill={handleRefillHearts}
        onPractice={() => {
          setShowHeartsModal(false);
          navigate(returnPath);
        }}
        error={refillError}
        isLoading={isRefilling}
      />
    </div>
  );
}

function ConfettiEffect() {
  const colors = ['#58cc02', '#ffc800', '#1cb0f6', '#ff4b4b', '#ce82ff'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 8 + Math.random() * 8,
  }));

  return (
    <div className="confetti-wrapper">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 50,
            opacity: [1, 1, 0],
            rotate: piece.rotation + 720,
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: piece.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
}
