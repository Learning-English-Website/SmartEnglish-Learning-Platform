import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiChevronLeft, FiChevronRight, FiShuffle,
  FiRotateCcw, FiThumbsUp, FiThumbsDown, FiVolume2,
} from 'react-icons/fi';
import { lookupWord } from '../../../api/dictionaryService';
import './FlashcardViewer.css';

/**
 * FlashcardViewer — animated flip card with navigation.
 *
 * Props:
 *   cards           — Flashcard[] array
 *   showKnowButtons — show Know / Don't Know buttons (study mode)
 *   onKnow?(card)   — called when user clicks Know
 *   onDontKnow?(card) — called when user clicks Don't Know
 */
export default function FlashcardViewer({ cards = [], showKnowButtons = false, onKnow, onDontKnow }) {
  const [order, setOrder]       = useState(() => cards.map((_, i) => i));
  const [currentIdx, setIdx]    = useState(0);
  const [isFlipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [animDir, setAnimDir]   = useState('');

  // Audio pronunciation
  const [audioUrl, setAudioUrl]     = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  // Reset when cards change
  useEffect(() => {
    setOrder(cards.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
  }, [cards]);

  const current = cards[order[currentIdx]];
  const total   = cards.length;

  /* ── Auto-fetch audio for current card ───────────────────────────── */
  useEffect(() => {
    if (!current?.front) return;
    setAudioUrl(current.audio ?? ''); // use stored audio if card has it
    setAudioPlaying(false);

    // Fetch from dictionary if no stored audio
    if (!current.audio) {
      setAudioLoading(true);
      lookupWord(current.front)
        .then((res) => { if (res.audio) setAudioUrl(res.audio); })
        .catch(() => {}) // silently fail — word may not be English
        .finally(() => setAudioLoading(false));
    }
  }, [current?.front, current?.audio]);

  /* ── Play audio ───────────────────────────────────────────────────── */
  const playAudio = useCallback((e) => {
    e.stopPropagation(); // don't flip card
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setAudioPlaying(false);
      audioRef.current.onerror = () => setAudioPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
    }
    setAudioPlaying(true);
    audioRef.current.play().catch(() => setAudioPlaying(false));
  }, [audioUrl]);

  /* ── Navigation ───────────────────────────────────────────────────── */
  const goTo = useCallback((dir) => {
    setAnimDir(dir);
    setFlipped(false);
    setTimeout(() => {
      setIdx((prev) => {
        if (dir === 'right') return prev < total - 1 ? prev + 1 : prev;
        return prev > 0 ? prev - 1 : prev;
      });
      setAnimDir('');
    }, 180);
  }, [total]);

  const goNext = () => goTo('right');
  const goPrev = () => goTo('left');

  /* ── Keyboard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  /* ── Shuffle ──────────────────────────────────────────────────────── */
  const handleShuffle = () => {
    const newOrder = [...order];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setOrder(newOrder);
    setIdx(0);
    setFlipped(false);
    setShuffled(true);
  };

  const handleReset = () => {
    setOrder(cards.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
    setShuffled(false);
  };

  /* ── Know / Don't Know ────────────────────────────────────────────── */
  const handleKnow = () => {
    onKnow?.(current);
    if (currentIdx < total - 1) goNext();
  };

  const handleDontKnow = () => {
    onDontKnow?.(current);
    if (currentIdx < total - 1) goNext();
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  if (!current) {
    return (
      <div className="fcv-empty">
        <p>No cards to display.</p>
      </div>
    );
  }

  return (
    <div className="fcv-wrap">
      {/* Controls bar */}
      <div className="fcv-controls">
        <span className="fcv-progress">
          {currentIdx + 1} <span className="fcv-progress-sep">/</span> {total}
        </span>

        <div className="fcv-control-btns">
          <button
            className={`fcv-ctrl-btn ${shuffled ? 'active' : ''}`}
            onClick={shuffled ? handleReset : handleShuffle}
            title={shuffled ? 'Reset order' : 'Shuffle'}
          >
            {shuffled ? <FiRotateCcw size={15} /> : <FiShuffle size={15} />}
            <span>{shuffled ? 'Reset' : 'Shuffle'}</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="fcv-progress-bar">
        <div
          className="fcv-progress-fill"
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div
        className={`fcv-card-wrap ${animDir ? `fcv-slide-${animDir}` : ''}`}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Show front' : 'Show back (click to flip)'}
        onKeyDown={(e) => { if (e.key === 'Enter') setFlipped((f) => !f); }}
      >
        <div className={`fcv-card ${isFlipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className={`fcv-card-face fcv-front ${current.imageUrl ? 'fcv-front--split' : ''}`}>

            {/* ── Left: term + phonetic + example ─────────────────── */}
            <div className="fcv-front-content">
              <span className="fcv-face-label">TERM</span>
              <h2 className="fcv-word">{current.front}</h2>

              {/* Phonetic + Audio */}
              <div className="fcv-phonetic-row">
                {current.pronunciation && (
                  <span className="fcv-pronunciation">{current.pronunciation}</span>
                )}
                {(audioUrl || audioLoading) && (
                  <button
                    type="button"
                    className={`fcv-audio-btn ${audioPlaying ? 'playing' : ''} ${audioLoading ? 'loading' : ''}`}
                    onClick={playAudio}
                    disabled={audioLoading || !audioUrl}
                    title="Play pronunciation"
                    aria-label="Play pronunciation"
                  >
                    <FiVolume2 size={15} />
                  </button>
                )}
              </div>

              {current.example && (
                <p className="fcv-example">"{current.example}"</p>
              )}
              <span className="fcv-hint">Click or press Space to flip</span>
            </div>

            {/* ── Right: image (only when imageUrl exists) ─────────── */}
            {current.imageUrl && (
              <div className="fcv-front-image">
                <img
                  src={current.imageUrl}
                  alt={current.front}
                  className="fcv-card-img"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Back */}
          <div className={`fcv-card-face fcv-back ${current.imageUrl ? 'fcv-back--split' : ''}`}>

            {/* ── Left: definition + note ──────────────────────────── */}
            <div className="fcv-back-content">
              <span className="fcv-face-label">DEFINITION</span>
              <h2 className="fcv-word">{current.back}</h2>
              {current.note && (
                <p className="fcv-note">📝 {current.note}</p>
              )}
              <span className="fcv-hint">{current.front}</span>
            </div>

            {/* ── Right: image (mirrored on back too) ─────────────── */}
            {current.imageUrl && (
              <div className="fcv-back-image">
                <img
                  src={current.imageUrl}
                  alt={current.front}
                  className="fcv-card-img"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Know buttons */}
      {showKnowButtons && (
        <div className="fcv-know-btns">
          <button className="fcv-know-btn fcv-dont-know" onClick={handleDontKnow}>
            <FiThumbsDown size={16} /> Don't Know
          </button>
          <button className="fcv-know-btn fcv-know" onClick={handleKnow}>
            <FiThumbsUp size={16} /> Know
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="fcv-nav">
        <button
          className="fcv-nav-btn"
          onClick={goPrev}
          disabled={currentIdx === 0}
          aria-label="Previous card"
        >
          <FiChevronLeft size={22} />
        </button>
        <span className="fcv-nav-label">
          {currentIdx + 1} / {total}
        </span>
        <button
          className="fcv-nav-btn"
          onClick={goNext}
          disabled={currentIdx === total - 1}
          aria-label="Next card"
        >
          <FiChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}
