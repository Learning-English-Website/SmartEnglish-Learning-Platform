import { useState, useRef, useEffect, useCallback } from 'react';
import { FiVolume2, FiZap, FiX, FiChevronDown } from 'react-icons/fi';
import { lookupWord } from '../../../api/dictionaryService';
import './DictionarySuggest.css';

/**
 * DictionarySuggest — A "Suggest" button that, when clicked, fetches
 * IPA phonetic + audio + definitions from Free Dictionary API and shows
 * them in a popover. User can click to auto-fill fields.
 *
 * Props:
 *   term           — current term value (used as search query)
 *   onUsePhonetic(phonetic: string)   — called when user accepts IPA
 *   onUseDefinition(def: string)      — called when user accepts a definition
 *   disabled?      — disables the suggest button
 */
export default function DictionarySuggest({ term, onUsePhonetic, onUseDefinition, disabled }) {
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [open, setOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const popoverRef = useRef(null);
  const audioRef   = useRef(null);

  /* ── Fetch ────────────────────────────────────────────────────────── */
  const handleSuggest = useCallback(async () => {
    if (!term?.trim()) return;

    if (open && result) {
      setOpen(false);
      return;
    }

    setState('loading');
    setOpen(false);
    setResult(null);

    try {
      const data = await lookupWord(term.trim());
      setResult(data);
      setState('success');
      setOpen(true);
    } catch (err) {
      setErrorMsg(err.message ?? 'Not found');
      setState('error');
      setOpen(true);
    }
  }, [term, open, result]);

  /* ── Audio playback ───────────────────────────────────────────────── */
  const playAudio = useCallback(() => {
    if (!result?.audio) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(result.audio);
      audioRef.current.onended = () => setAudioPlaying(false);
      audioRef.current.onerror = () => setAudioPlaying(false);
    } else {
      audioRef.current.src = result.audio;
    }
    setAudioPlaying(true);
    audioRef.current.play().catch(() => setAudioPlaying(false));
  }, [result]);

  /* ── Close on outside click ───────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── Reset when term changes ──────────────────────────────────────── */
  useEffect(() => {
    setState('idle');
    setResult(null);
    setOpen(false);
  }, [term]);

  /* ── Render ───────────────────────────────────────────────────────── */
  const isLoading = state === 'loading';
  const canSuggest = term?.trim().length >= 2 && !disabled;

  return (
    <div className="ds-wrap" ref={popoverRef}>
      {/* Trigger button */}
      <button
        type="button"
        className={`ds-trigger ${state === 'success' ? 'ds-trigger--active' : ''}`}
        onClick={handleSuggest}
        disabled={!canSuggest || isLoading}
        title={canSuggest ? 'Look up pronunciation & definition' : 'Enter at least 2 characters'}
        aria-label="Dictionary suggest"
      >
        {isLoading ? (
          <span className="ds-spinner" />
        ) : (
          <>
            <FiZap size={13} />
            <span>Suggest</span>
            {state === 'success' && <FiChevronDown size={11} />}
          </>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="ds-popover" role="dialog" aria-label="Dictionary suggestions">
          <div className="ds-popover-header">
            <span className="ds-popover-word">
              {state === 'success' ? result?.word : 'Dictionary'}
            </span>
            <button
              type="button"
              className="ds-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Error state */}
          {state === 'error' && (
            <div className="ds-error">
              <p>"{term}" — {errorMsg}</p>
              <span className="ds-error-hint">Only English words are supported.</span>
            </div>
          )}

          {/* Success state */}
          {state === 'success' && result && (
            <>
              {/* Phonetic + audio */}
              <div className="ds-phonetic-row">
                {result.phonetic ? (
                  <span className="ds-phonetic">{result.phonetic}</span>
                ) : (
                  <span className="ds-phonetic ds-phonetic--none">No IPA available</span>
                )}

                {result.audio ? (
                  <button
                    type="button"
                    className={`ds-audio-btn ${audioPlaying ? 'playing' : ''}`}
                    onClick={playAudio}
                    title="Play pronunciation"
                    aria-label="Play pronunciation"
                  >
                    <FiVolume2 size={14} />
                  </button>
                ) : null}

                {result.phonetic && (
                  <button
                    type="button"
                    className="ds-use-btn"
                    onClick={() => { onUsePhonetic(result.phonetic); setOpen(false); }}
                    title="Fill pronunciation field"
                  >
                    Use IPA
                  </button>
                )}
              </div>

              {/* Meanings */}
              {result.meanings.length > 0 && (
                <div className="ds-meanings">
                  {result.meanings.map((meaning, mi) => (
                    <div key={mi} className="ds-meaning-group">
                      <span className="ds-pos">{meaning.partOfSpeech}</span>
                      {meaning.definitions.map((d, di) => (
                        <div key={di} className="ds-definition-row">
                          <div className="ds-definition-text">
                            <p className="ds-def">{d.definition}</p>
                            {d.example && (
                              <p className="ds-example">"{d.example}"</p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="ds-use-btn ds-use-btn--def"
                            onClick={() => { onUseDefinition(d.definition); setOpen(false); }}
                            title="Use as definition"
                          >
                            Use
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="ds-footer">
                <span>Source: Free Dictionary API</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
