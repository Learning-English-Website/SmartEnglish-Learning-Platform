import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '../../hooks/useAudio';
import './AudioPlayer.css';

/**
 * AudioPlayer component with play/pause, progress bar, and duration display.
 *
 * @param {string} src - Audio source URL
 * @param {boolean} autoPlay - Auto-play on mount
 * @param {boolean} showProgress - Show progress bar
 * @param {boolean} showDuration - Show time display
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} variant - 'primary' | 'secondary' | 'minimal'
 * @param {function} onPlay - Callback when audio starts playing
 * @param {function} onEnd - Callback when audio ends
 * @param {string} className - Additional CSS classes
 */
const AudioPlayer = memo(function AudioPlayer({
  src,
  autoPlay = false,
  showProgress = true,
  showDuration = true,
  size = 'md',
  variant = 'primary',
  onPlay,
  onEnd,
  className = '',
}) {
  const {
    isPlaying,
    isLoading,
    isMuted,
    isLoaded,
    duration,
    currentTime,
    progress,
    error,
    volume,
    toggle,
    seekByPercent,
    toggleMute,
    formatTime,
  } = useAudio(src, { autoPlay });

  const handleProgressClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekByPercent(Math.max(0, Math.min(1, percent)));
  }, [seekByPercent]);

  const sizeClasses = {
    sm: 'audio-player-sm',
    md: 'audio-player-md',
    lg: 'audio-player-lg',
  };

  const variantClasses = {
    primary: 'audio-player-primary',
    secondary: 'audio-player-secondary',
    minimal: 'audio-player-minimal',
  };

  if (!src) return null;

  return (
    <div className={`audio-player ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {isLoading && (
        <div className="audio-loading">
          <div className="audio-spinner" />
        </div>
      )}

      {error && (
        <div className="audio-error" title={error}>
          ⚠️
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Play/Pause Button */}
          <motion.button
            className="audio-play-btn"
            onClick={toggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          {/* Progress Bar */}
          {showProgress && (
            <div className="audio-progress-container" onClick={handleProgressClick}>
              <div className="audio-progress-track">
                <motion.div
                  className="audio-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}

          {/* Duration Display */}
          {showDuration && (
            <div className="audio-duration">
              <span className="audio-current">{formatTime(currentTime)}</span>
              <span className="audio-separator">/</span>
              <span className="audio-total">{formatTime(duration)}</span>
            </div>
          )}

          {/* Mute Button */}
          <button
            className="audio-mute-btn"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  );
});

export default AudioPlayer;
