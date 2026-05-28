import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { duolingoService } from '../../services/duolingoService';
import { useSpeechSynthesis } from '../../hooks/useAudio';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import ExitModal from '../../components/duolingo/ExitModal';
import HeartsModal from '../../components/duolingo/HeartsModal';
import '../../components/duolingo/AudioPlayer.css';
import './LessonPage.css';

export default function LessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';

  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [status, setStatus] = useState('idle'); // idle | correct | wrong | complete
  const [hearts, setHearts] = useState(5);
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
  const inputRef = useRef(null);
  const pointsRef = useRef(0);

  // Text-to-Speech for TYPE challenges
  const tts = useSpeechSynthesis({ lang: 'en-US', rate: 0.9 });

  // Derived state - MUST be defined before useEffects that use it
  const currentChallenge = lesson?.challenges?.[currentIndex];
  const totalChallenges = lesson?.totalChallenges || 0;
  const progress = totalChallenges > 0 ? (currentIndex / totalChallenges) * 100 : 0;

  // Auto-play TTS when TYPE challenge loads
  useEffect(() => {
    if (
      autoPlayTTS &&
      currentChallenge?.type === 'TYPE' &&
      status === 'idle' &&
      tts.isSupported &&
      !tts.isSpeaking
    ) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        const textToSpeak = currentChallenge.question || '';
        if (textToSpeak) {
          tts.speak(textToSpeak);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentChallenge?.type, currentChallenge?.question, status, autoPlayTTS, tts]);

  // Auto-play audio when challenge has audioSrc
  useEffect(() => {
    if (
      currentChallenge?.audioSrc &&
      status === 'idle' &&
      autoPlayTTS
    ) {
      const timer = setTimeout(() => {
        playAudio(currentChallenge.audioSrc);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentChallenge?.audioSrc, status, autoPlayTTS]);

  useEffect(() => {
    if (lesson) setSessionStarted(true);
  }, [lesson]);

  useEffect(() => {
    if (status === 'idle' && lesson?.challenges?.[currentIndex]?.type === 'TYPE') {
      inputRef.current?.focus();
    }
  }, [status, currentIndex, lesson]);

  const loadLesson = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (isPractice) {
        response = await duolingoService.practiceLesson(lessonId);
      } else {
        response = await duolingoService.getLesson(lessonId);
      }
      setLesson(response.data || response);
      setCurrentIndex(0);
      setSelectedOption(null);
      setTypedAnswer('');
      setStatus('idle');
      pointsRef.current = 0;
    } catch (err) {
      console.error('Failed to load lesson:', err);
      setError(err.message || 'Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lessonId, isPractice]);

  const loadHearts = useCallback(async () => {
    try {
      const response = await duolingoService.getHearts();
      setHearts(response.data?.hearts ?? 5);
    } catch (err) {
      console.error('Failed to load hearts:', err);
    }
  }, []);

  // Initial data load - after callbacks are defined
  useEffect(() => {
    loadLesson();
    loadHearts();
  }, [lessonId, loadLesson, loadHearts]);

  const handleOptionSelect = useCallback(
    async (optionId) => {
      if (status !== 'idle' || !currentChallenge) return;
      setSelectedOption(optionId);

      try {
        const result = await duolingoService.submitAnswer(currentChallenge._id, optionId, null);

        if (result.data?.isCorrect) {
          setStatus('correct');
          const earnedPoints = result.data.pointsEarned ?? 10;
          pointsRef.current += earnedPoints;
          triggerXpPopup(earnedPoints);
          setTimeout(() => {
            nextChallenge();
          }, 1000);
        } else {
          setStatus('wrong');
          await handleWrongAnswer();
          setTimeout(() => {
            setStatus('idle');
            setSelectedOption(null);
          }, 1500);
        }
      } catch (err) {
        console.error('Submit failed:', err);
        setStatus('idle');
        setSelectedOption(null);
      }
    },
    [currentChallenge, status, currentIndex]
  );

  const handleTypedSubmit = useCallback(async () => {
    if (status !== 'idle' || !currentChallenge || !typedAnswer.trim()) return;

    try {
      const result = await duolingoService.submitAnswer(currentChallenge._id, null, typedAnswer);

      if (result.data?.isCorrect) {
        setStatus('correct');
        const earnedPoints = result.data.pointsEarned ?? 10;
        pointsRef.current += earnedPoints;
        setTimeout(() => {
          nextChallenge();
        }, 1000);
      } else {
        setStatus('wrong');
        await handleWrongAnswer();
        setTimeout(() => {
          setStatus('idle');
          setTypedAnswer('');
        }, 1500);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setStatus('idle');
    }
  }, [currentChallenge, status, typedAnswer]);

  const handleWrongAnswer = async () => {
    try {
      const heartsResult = await duolingoService.reduceHearts();
      if (heartsResult.data?.error === 'no_hearts') {
        setShowHeartsModal(true);
      } else {
        setHearts(heartsResult.data?.hearts ?? hearts - 1);
        if (heartsResult.data?.hearts === 0) {
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

  const nextChallenge = () => {
    setSelectedOption(null);
    setTypedAnswer('');
    setStatus('idle');
    if (currentIndex < totalChallenges - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    try {
      await duolingoService.completeLesson(lessonId);
      setStatus('complete');
      setShowConfetti(true);
      setTimeout(() => {
        navigate('/duolingo/learn');
      }, 3000);
    } catch (err) {
      console.error('Complete lesson failed:', err);
      navigate('/duolingo/learn');
    }
  };

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
          navigate('/duolingo/learn');
        }
        return;
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const options = currentChallenge?.options;
        if (options && options[num - 1]) {
          handleOptionSelect(options[num - 1]._id);
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
  }, [currentChallenge, selectedOption, status, navigate]);

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
            <button className="btn btn-outline-secondary" onClick={() => navigate('/duolingo/learn')}>
              Back to Learn
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
          aria-label={`Lesson progress: ${currentIndex + 1} of ${totalChallenges}`}
        >
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text" aria-live="polite">
            {currentIndex + 1} / {totalChallenges}
          </span>
        </div>

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
              aria-label={`Challenge ${currentIndex + 1} of ${totalChallenges}`}
            >
              {/* Question */}
              <div className="challenge-question" role="question">
                {currentChallenge?.imageSrc && (
                  <div className="question-image">
                    <img src={currentChallenge.imageSrc} alt="Question visual" />
                  </div>
                )}

                {/* Audio/TTS Controls */}
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
                          tts.speak(currentChallenge.question || '');
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

                <p className="question-text" aria-live="polite">{currentChallenge?.question}</p>
              </div>

              {/* Options */}
              <div className={`options-container ${currentChallenge?.type === 'TYPE' ? 'type-mode' : ''}`} role="group" aria-label="Answer options">
                {currentChallenge?.type === 'TYPE' ? (
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
                ) : (
                  <div className="options-grid" role="radiogroup" aria-label="Select correct answer">
                    {currentChallenge?.options?.map((option, index) => {
                      const isSelected = selectedOption === option._id;
                      const isCorrectOption = option.correct;
                      const showCorrect = status !== 'idle' && isCorrectOption;
                      const showWrong = status === 'wrong' && isSelected && !isCorrectOption;

                      return (
                        <motion.button
                          key={option._id}
                          className={`option-card ${isSelected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                          onClick={() => handleOptionSelect(option._id)}
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

                          {/* Option content: Image > Audio button > Text */}
                          <div className="option-content">
                            {option.imageSrc && (
                              <img src={option.imageSrc} alt={option.text} className="option-image" />
                            )}
                            <span className="option-text">{option.text}</span>
                          </div>

                          {/* Option audio button */}
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
            <span className="feedback-text">Correct! +10 XP</span>
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
            <span className="feedback-text">
              Incorrect — {hearts <= 1 ? 'Last heart!' : `${hearts} hearts left`}
            </span>
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
        onClose={() => setShowExitModal(false)}
        onContinue={() => setShowExitModal(false)}
      />
      <HeartsModal
        isOpen={showHeartsModal}
        onClose={() => setShowHeartsModal(false)}
        onRefill={handleRefillHearts}
        onPractice={() => {
          setShowHeartsModal(false);
          navigate('/duolingo/learn');
        }}
        error={refillError}
        isLoading={isRefilling}
      />
    </div>
  );
}

function playAudio(src) {
  if (src) {
    const audio = new Audio(src);
    audio.play().catch(console.error);
  }
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
