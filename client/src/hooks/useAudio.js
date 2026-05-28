import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for audio playback with preload, progress tracking, and controls.
 *
 * @param {string|null} src - Audio source URL
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoPlay - Auto-play when src changes (default: false)
 * @param {number} options.volume - Initial volume 0-1 (default: 1)
 * @param {boolean} options.loop - Loop playback (default: false)
 * @returns {Object} Audio controls and state
 */
export function useAudio(src, options = {}) {
  const {
    autoPlay = false,
    volume = 1,
    loop = false,
  } = options;

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (!src) return;

    // Cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio();
    audioRef.current = audio;

    // Set initial properties
    audio.volume = isMuted ? 0 : volume;
    audio.loop = loop;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setIsLoaded(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      setError(`Failed to load audio: ${src}`);
      setIsLoading(false);
      setIsPlaying(false);
      console.error('Audio error:', e);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Set source and preload
    audio.src = src;
    audio.preload = 'auto';

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = volume;
    }
  }, [volume, isMuted]);

  // Update loop when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = loop;
    }
  }, [loop]);

  const play = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error('Play error:', err);
        setError('Failed to play audio');
      });
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [duration]);

  const seekByPercent = useCallback((percent) => {
    if (audioRef.current && duration > 0) {
      seek(duration * percent);
    }
  }, [duration, seek]);

  const restart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      play();
    }
  }, [play]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.volume = newMuted ? 0 : volume;
      setIsMuted(newMuted);
    }
  }, [isMuted, volume]);

  const setVolume = useCallback((vol) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    if (audioRef.current) {
      audioRef.current.volume = clampedVol;
    }
  }, []);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format time helper
  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    isPlaying,
    isLoading,
    isMuted,
    isLoaded,
    duration,
    currentTime,
    progress,
    error,
    volume,

    // Controls
    play,
    pause,
    toggle,
    seek,
    seekByPercent,
    restart,
    toggleMute,
    setVolume,
    formatTime,
  };
}

/**
 * Hook for text-to-speech using Web Speech API
 *
 * @param {Object} options - TTS configuration
 * @param {string} options.lang - Language code (default: 'en-US')
 * @param {number} options.rate - Speech rate 0.1-10 (default: 0.9)
 * @param {number} options.pitch - Speech pitch 0-2 (default: 1)
 * @returns {Object} TTS controls and state
 */
export function useSpeechSynthesis(options = {}) {
  const {
    lang = 'en-US',
    rate = 0.9,
    pitch = 1,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // Check if SpeechSynthesis is supported
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      // Load available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text, overrides = {}) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = overrides.lang || lang;
    utterance.rate = overrides.rate ?? rate;
    utterance.pitch = overrides.pitch ?? pitch;

    // Try to find a matching voice
    if (voices.length > 0) {
      const matchingVoice = voices.find(
        (v) => v.lang.startsWith(overrides.lang || lang)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('TTS error:', e);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, lang, rate, pitch, voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    voices,
    speak,
    stop,
    pause,
    resume,
  };
}

export default useAudio;
