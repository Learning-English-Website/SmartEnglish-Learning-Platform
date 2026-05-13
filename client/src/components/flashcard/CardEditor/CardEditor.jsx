import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FiSave, FiX, FiVolume2, FiZap, FiSearch, FiImage } from 'react-icons/fi';
import { lookupWord, searchWords } from '../../../api/dictionaryService';
import ImagePicker from '../ImagePicker/ImagePicker';
import './CardEditor.css';

/**
 * CardEditor — Quizlet-style inline form.
 * - Phase 1 (auto): typing debounce → Datamuse word list
 * - Phase 2 (click word / Suggest btn): lookup IPA + definitions
 */
export default function CardEditor({ card, onSave, onCancel, loading = false, inlineMode = false }) {
  const [form, setForm] = useState({
    id: card?.id || null,
    front: '',
    back: '',
    pronunciation: '',
    example: '',
    note: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [showImagePicker, setShowImagePicker] = useState(false);

  /* ── Suggest state ───────────────────────────────────────────────── */
  // Phase 1 — word list from Datamuse
  const [wordList, setWordList]         = useState([]);
  const [wordLoading, setWordLoading]   = useState(false);
  const [phase, setPhase]               = useState('idle'); // 'idle'|'words'|'detail'

  // Phase 2 — dictionary detail
  const [dictData, setDictData]         = useState(null);
  const [dictLoading, setDictLoading]   = useState(false);
  const [dictError, setDictError]       = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const audioRef    = useRef(null);
  const wrapRef     = useRef(null);
  const debounceRef = useRef(null);
  const isPrefilledRef = useRef(false);

  /* ── Prefill on edit ─────────────────────────────────────────────── */
  useEffect(() => {
    // Always prefill when card prop changes - check all fields
    if (card && (
      card.id !== form.id ||
      card.front !== form.front ||
      card.back !== form.back ||
      card.pronunciation !== form.pronunciation ||
      card.example !== form.example ||
      card.note !== form.note
    )) {
      setForm({
        id:            card.id,
        front:         card.front         ?? '',
        back:          card.back          ?? '',
        pronunciation: card.pronunciation ?? '',
        example:       card.example       ?? '',
        note:          card.note          ?? '',
        imageUrl:      card.imageUrl      ?? '',
      });
      isPrefilledRef.current = true;
      setIsUserEdited(false); // Reset user edited flag on prefill
    }
  }, [card]);

  /* ── Auto-sync (Inline Mode) ─────────────────────────────────────── */
  // Only sync when user actually types (not during prefill)
  const [isUserEdited, setIsUserEdited] = useState(false);

  useEffect(() => {
    // Only sync after prefill AND after user has edited
    if (inlineMode && isPrefilledRef.current && isUserEdited) {
      onSave(form);
    }
  }, [form, inlineMode, isUserEdited]);

  /* ── Close on outside click ──────────────────────────────────────── */
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closeDropdown();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropdownOpen]);

  const closeDropdown = () => {
    setDropdownOpen(false);
    setPhase('idle');
  };

  /* ── Phase 1: word search (debounced) ────────────────────────────── */
  const triggerWordSearch = useCallback((term) => {
    clearTimeout(debounceRef.current);
    if (!term || term.trim().length < 2) {
      setWordList([]);
      setDropdownOpen(false);
      setPhase('idle');
      return;
    }
    setWordLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchWords(term.trim(), 10);
        setWordList(results);
        setPhase('words');
        setDropdownOpen(true);
      } catch {
        setWordList([]);
      } finally {
        setWordLoading(false);
      }
    }, 350);
  }, []);

  /* ── Phase 2: dictionary detail lookup ───────────────────────────── */
  const triggerDictLookup = useCallback(async (term) => {
    if (!term?.trim()) return;
    setDictLoading(true);
    setDictData(null);
    setDictError('');
    setPhase('detail');
    setDropdownOpen(true);
    try {
      const data = await lookupWord(term.trim());
      setDictData(data);
      // Auto-fill pronunciation if empty
      if (data.phonetic && !form.pronunciation) {
        setForm((prev) => ({ ...prev, pronunciation: data.phonetic }));
      }
    } catch (err) {
      setDictError(err.message ?? 'Not found');
    } finally {
      setDictLoading(false);
    }
  }, [form.pronunciation]);

  /* ── Click word from list → fill TERM + lookup ───────────────────── */
  const handleSelectWord = (word) => {
    setForm((prev) => ({ ...prev, front: word }));
    setWordList([]);
    triggerDictLookup(word);
  };

  /* ── "Suggest" button → lookup current TERM ─────────────────────── */
  const handleSuggestBtn = () => {
    if (phase === 'detail' && dropdownOpen) { closeDropdown(); return; }
    triggerDictLookup(form.front);
  };

  /* ── Audio ───────────────────────────────────────────────────────── */
  const playAudio = useCallback((e) => {
    e?.stopPropagation();
    const url = dictData?.audio;
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setAudioPlaying(false);
      audioRef.current.onerror = () => setAudioPlaying(false);
    } else {
      audioRef.current.src = url;
    }
    setAudioPlaying(true);
    audioRef.current.play().catch(() => setAudioPlaying(false));
  }, [dictData]);

  /* ── Form change ─────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'front') triggerWordSearch(value);
    // Mark as user edited for auto-sync
    setIsUserEdited(true);
  };

  /* ── Validate + Submit ───────────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (!form.front.trim()) errs.front = 'Term is required';
    if (!form.back.trim())  errs.back  = 'Definition is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      front:         form.front.trim(),
      back:          form.back.trim(),
      pronunciation: form.pronunciation.trim() || null,
      example:       form.example.trim() || null,
      note:          form.note.trim() || null,
      imageUrl:      form.imageUrl || null,
    });
  };

  const canSuggest = form.front.trim().length >= 2 && !loading;

  /* ── Highlight matched substring in word ─────────────────────────── */
  const highlightMatch = (word, query) => {
    if (!query) return word;
    const idx = word.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return word;
    return (
      <>
        {word.slice(0, idx)}
        <strong>{word.slice(idx, idx + query.length)}</strong>
        {word.slice(idx + query.length)}
      </>
    );
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <form className="ce-form" onSubmit={handleSubmit} noValidate>

      {/* ── Row 1: TERM + DEFINITION ─────────────────────────────── */}
      <div className="ce-row">

        {/* TERM with autocomplete */}
        <div className="ce-field-block" ref={wrapRef} style={{ position: 'relative' }}>
          <div className="ce-field-header">
            <label className="ce-label">TERM *</label>
            <button
              type="button"
              className={`ce-suggest-btn ${phase === 'detail' && dropdownOpen ? 'active' : ''}`}
              onClick={handleSuggestBtn}
              disabled={!canSuggest || dictLoading}
              title="Look up pronunciation & definition"
            >
              {dictLoading ? <span className="ce-spinner" /> : <><FiZap size={12} /> Suggest</>}
            </button>
          </div>

          <div className="ce-input-wrap">
            <FiSearch size={14} className="ce-input-icon" />
            <input
              name="front"
              className={`ce-input ce-input--icon ${errors.front ? 'ce-input--error' : ''}`}
              placeholder="Type a word to search…"
              value={form.front}
              onChange={handleChange}
              autoFocus={!card}
              autoComplete="off"
            />
            {wordLoading && <span className="ce-spinner ce-spinner--inline" />}
          </div>
          {errors.front && <span className="ce-error">{errors.front}</span>}

          {/* ── Dropdown ─────────────────────────────────────────── */}
          {dropdownOpen && (
            <div className="ce-dropdown">

              {/* Phase 1 — Word list */}
              {phase === 'words' && (
                <>
                  {wordList.length === 0 ? (
                    <div className="ce-dropdown-empty">
                      <FiSearch size={13} /> No words found for "{form.front}"
                    </div>
                  ) : (
                    <div className="ce-word-list">
                      {wordList.map((item) => (
                        <button
                          key={item.word}
                          type="button"
                          className="ce-word-item"
                          onClick={() => handleSelectWord(item.word)}
                        >
                          <span className="ce-word-text">
                            {highlightMatch(item.word, form.front)}
                          </span>
                          <span className="ce-word-score">
                            {item.tags?.includes('prop') ? '(proper noun)' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ce-dropdown-footer">
                    Click a word → see pronunciation & definition
                  </div>
                </>
              )}

              {/* Phase 2 — Dictionary detail */}
              {phase === 'detail' && (
                <>
                  {dictLoading && (
                    <div className="ce-dropdown-loading">
                      <span className="ce-spinner" /> Looking up "{form.front}"…
                    </div>
                  )}

                  {!dictLoading && dictError && (
                    <div className="ce-dropdown-empty">
                      <FiZap size={13} /> {dictError}
                    </div>
                  )}

                  {!dictLoading && dictData && (
                    <>
                      {/* Phonetic row */}
                      <div className="ce-suggest-phonetic">
                        <span className="ce-suggest-word">{dictData.word}</span>
                        {dictData.phonetic && (
                          <span className="ce-suggest-ipa">{dictData.phonetic}</span>
                        )}
                        <div className="ce-suggest-phonetic-actions">
                          {dictData.audio && (
                            <button
                              type="button"
                              className={`ce-audio-btn ${audioPlaying ? 'playing' : ''}`}
                              onClick={playAudio}
                              title="Play pronunciation"
                            >
                              <FiVolume2 size={13} />
                            </button>
                          )}
                          {dictData.phonetic && (
                            <button
                              type="button"
                              className="ce-use-ipa-btn"
                              onClick={() => setForm((p) => ({ ...p, pronunciation: dictData.phonetic }))}
                            >
                              Use IPA
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Definition list */}
                      <div className="ce-suggest-defs">
                        {dictData.meanings.map((meaning, mi) =>
                          meaning.definitions.map((d, di) => (
                            <button
                              key={`${mi}-${di}`}
                              type="button"
                              className="ce-suggest-def-item"
                              onClick={() => {
                                setForm((p) => ({ ...p, back: d.definition }));
                                closeDropdown();
                              }}
                            >
                              <span className="ce-suggest-pos">{meaning.partOfSpeech}</span>
                              <span className="ce-suggest-def-text">{d.definition}</span>
                              {d.example && (
                                <span className="ce-suggest-example">"{d.example}"</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      <div className="ce-dropdown-footer">
                        Free Dictionary API · <button
                          type="button"
                          className="ce-back-to-search"
                          onClick={() => { setPhase('words'); triggerWordSearch(form.front); }}
                        >
                          ← Back to search
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* DEFINITION */}
        <div className="ce-field-block">
          <div className="ce-field-header">
            <label className="ce-label">DEFINITION *</label>
          </div>
          <input
            name="back"
            className={`ce-input ${errors.back ? 'ce-input--error' : ''}`}
            placeholder="Enter definition (or click suggestion)"
            value={form.back}
            onChange={handleChange}
          />
          {errors.back && <span className="ce-error">{errors.back}</span>}
        </div>
      </div>

      {/* ── Row 2: Extra fields ──────────────────────────────────────── */}
      <div className="ce-row ce-row--extra">
        <div className="ce-field-block">
          <label className="ce-label">PRONUNCIATION</label>
          <input
            name="pronunciation"
            className="ce-input"
            placeholder="/prəˌnʌnsiˈeɪʃən/"
            value={form.pronunciation}
            onChange={handleChange}
          />
        </div>
        <div className="ce-field-block">
          <label className="ce-label">EXAMPLE SENTENCE</label>
          <input
            name="example"
            className="ce-input"
            placeholder="e.g. Hello, how are you?"
            value={form.example}
            onChange={handleChange}
          />
        </div>
        <div className="ce-field-block">
          <label className="ce-label">NOTE</label>
          <input
            name="note"
            className="ce-input"
            placeholder="Additional notes..."
            value={form.note}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ── Image picker section ─────────────────────────────────────── */}
      <div className="ce-image-section">
        <button
          type="button"
          className={`ce-image-toggle-btn ${showImagePicker ? 'active' : ''} ${form.imageUrl ? 'has-image' : ''}`}
          onClick={() => setShowImagePicker((v) => !v)}
        >
          <FiImage size={14} />
          {form.imageUrl ? 'Change image' : 'Add image'}
          {form.imageUrl && <span className="ce-image-badge">✓</span>}
        </button>

        {form.imageUrl && !showImagePicker && (
          <div className="ce-image-thumb-wrap">
            <img src={form.imageUrl} alt="Card visual" className="ce-image-thumb" />
            <button
              type="button"
              className="ce-image-remove"
              onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
              title="Remove image"
            >
              <FiX size={11} />
            </button>
          </div>
        )}

        {showImagePicker && (
          <ImagePicker
            selectedUrl={form.imageUrl}
            defaultQuery={form.front || ''}
            onSelect={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
            onClear={() => setForm((p) => ({ ...p, imageUrl: '' }))}
          />
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {!inlineMode && (
        <div className="ce-actions">
          <button type="button" className="ce-btn ce-btn--cancel" onClick={onCancel} disabled={loading}>
            <FiX size={14} /> Cancel
          </button>
          <button type="submit" className="ce-btn ce-btn--save" disabled={loading}>
            {loading
              ? <span className="spinner-border spinner-border-sm" />
              : <><FiSave size={14} /> {card ? 'Save Changes' : 'Add Card'}</>
            }
          </button>
        </div>
      )}
    </form>
  );
}
