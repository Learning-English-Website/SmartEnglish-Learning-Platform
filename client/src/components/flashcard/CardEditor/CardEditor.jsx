import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSave, FiX, FiVolume2, FiZap, FiSearch, FiImage, FiUpload } from 'react-icons/fi';
import { lookupWord, searchWords, fetchRelatedWords, fetchCollocations, translateEnToVi } from '../../../api/dictionaryService';
import ImagePicker from '../ImagePicker/ImagePicker';
import ImageUploader from '../../media/ImageUploader';
import './CardEditor.css';

/**
 * CardEditor — Quizlet-style inline form.
 * - Phase 1 (auto): typing debounce → Datamuse word list
 * - Phase 2 (click word / Suggest btn): lookup IPA + definitions
 */
export default function CardEditor({ card, onSave, onCancel, loading = false, inlineMode = false }) {
  const [form, setForm] = useState({
    id:            card?.id || null,
    front:         card?.front         ?? '',
    back:          card?.back          ?? '',
    pronunciation: card?.pronunciation ?? '',
    example:       card?.example       ?? '',
    note:          card?.note          ?? '',
    collocation:   card?.collocation   ?? '',
    relatedWords:  card?.relatedWords  ?? '',
    imageUrl:      card?.imageUrl      ?? '',
  });
  const [errors, setErrors] = useState({});
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imageTab, setImageTab] = useState('search'); // 'search' | 'upload'
  const [autoFilling, setAutoFilling] = useState(false); // loading state for auto-fill all
  const [showExtra, setShowExtra] = useState(() => {
    return !!(card?.pronunciation || card?.example || card?.collocation || card?.relatedWords || card?.note);
  });

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
  const saveTimerRef = useRef(null);

  /* ── Auto-sync (Inline Mode) ─────────────────────────────────────── */
  // In inline mode, auto-save with debounce when form is valid
  useEffect(() => {
    if (!inlineMode) return;

    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // Only auto-save if front and back have content
    if (form.front.trim() && form.back.trim()) {
      saveTimerRef.current = setTimeout(() => {
        onSave({
          front:         form.front.trim(),
          back:          form.back.trim(),
          pronunciation: form.pronunciation.trim() || null,
          example:       form.example.trim() || null,
          note:          form.note.trim() || null,
          collocation:   form.collocation.trim() || null,
          relatedWords:  form.relatedWords.trim() || null,
          imageUrl:      form.imageUrl || null,
        });
      }, 500);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, inlineMode, onSave]);

  /* ── Auto-fill ALL fields (⚡ icon button) ───────────────────────── */
  const autoFillAll = useCallback(async () => {
    const term = form.front.trim();
    if (!term || autoFilling) return;
    setAutoFilling(true);
    try {
      const [dictData, related, collocations] = await Promise.all([
        lookupWord(term).catch(() => null),
        fetchRelatedWords(term).catch(() => ''),
        fetchCollocations(term).catch(() => ''),
      ]);

      // Find first available example sentence in dictionary meanings/definitions
      let firstExample = '';
      if (dictData?.meanings) {
        for (const m of dictData.meanings) {
          for (const d of m.definitions) {
            if (d.example) {
              firstExample = d.example;
              break;
            }
          }
          if (firstExample) break;
        }
      }

      // Get English definition and translate to Vietnamese
      const definitionEn = dictData?.meanings?.[0]?.definitions?.[0]?.definition || '';
      let definitionVi = '';
      if (definitionEn) {
        definitionVi = await translateEnToVi(definitionEn);
      } else {
        // Fallback: translate the word itself
        definitionVi = await translateEnToVi(term);
      }

      setForm((prev) => ({
        ...prev,
        pronunciation: prev.pronunciation || dictData?.phonetic || '',
        back:          prev.back          || definitionVi       || '',
        example:       prev.example       || firstExample       || '',
        relatedWords:  prev.relatedWords  || related            || '',
        collocation:   prev.collocation   || collocations       || '',
      }));
      setShowExtra(true);
      // store audio for playback
      if (dictData?.audio && !dictData_ref.current) dictData_ref.current = dictData;
    } catch (err) {
      console.error('[Auto-fill] Error:', err);
    } finally {
      setAutoFilling(false);
    }
  }, [form.front, autoFilling]);

  // ref to store last dict data for audio playback after autoFill
  const dictData_ref = useRef(null);

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
      setDictError(err.message ?? 'Không tìm thấy từ');
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
  };

  /* ── Validate + Submit ───────────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (!form.front.trim()) errs.front = 'Thuật ngữ là bắt buộc';
    if (!form.back.trim())  errs.back  = 'Định nghĩa là bắt buộc';
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
      collocation:   form.collocation.trim() || null,
      relatedWords:  form.relatedWords.trim() || null,
      imageUrl:      form.imageUrl || null,
    });
  };

  const canSuggest = form.front.trim().length >= 2 && !loading;
  const canAutoFill = form.front.trim().length >= 2 && !loading && !autoFilling;

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
            <label className="ce-label">THUẬT NGỮ *</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* ⚡ Auto-fill all fields */}
              <button
                type="button"
                className={`ce-suggest-btn ${autoFilling ? 'active' : ''}`}
                onClick={autoFillAll}
                disabled={!canAutoFill}
                title="Tự động điền phát âm, định nghĩa, ví dụ, cụm từ & từ liên quan"
                style={{ minWidth: 32 }}
              >
                {autoFilling ? <span className="ce-spinner" /> : <FiZap size={12} />}
              </button>
              {/* 📖 Manual suggest (existing) */}
              <button
                type="button"
                className={`ce-suggest-btn ${phase === 'detail' && dropdownOpen ? 'active' : ''}`}
                onClick={handleSuggestBtn}
                disabled={!canSuggest || dictLoading}
                title="Tra cứu phát âm & định nghĩa"
              >
                {dictLoading ? <span className="ce-spinner" /> : <>Gợi ý</>}
              </button>
            </div>
          </div>

          <div className="ce-input-wrap">
            <FiSearch size={14} className="ce-input-icon" />
            <input
              name="front"
              className={`ce-input ce-input--icon ${errors.front ? 'ce-input--error' : ''}`}
              placeholder="Nhập từ để tìm kiếm..."
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
                      <FiSearch size={13} /> Không tìm thấy từ nào cho "{form.front}"
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
                            {item.tags?.includes('prop') ? '(danh từ riêng)' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ce-dropdown-footer">
                    Chọn một từ → xem phát âm & định nghĩa
                  </div>
                </>
              )}

              {/* Phase 2 — Dictionary detail */}
              {phase === 'detail' && (
                <>
                  {dictLoading && (
                    <div className="ce-dropdown-loading">
                      <span className="ce-spinner" /> Đang tra cứu "{form.front}"…
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
                              title="Nghe phát âm"
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
                              Dùng IPA
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
                          ← Quay lại tìm kiếm
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
            <label className="ce-label">ĐỊNH NGHĨA *</label>
          </div>
          <input
            name="back"
            className={`ce-input ${errors.back ? 'ce-input--error' : ''}`}
            placeholder="Nhập định nghĩa (hoặc chọn từ gợi ý)"
            value={form.back}
            onChange={handleChange}
          />
          {errors.back && <span className="ce-error">{errors.back}</span>}
        </div>
      </div>

      {/* ── Toggle Extra Fields ────────────────────────────────────────── */}
      <div className="ce-extra-toggle-row">
        <button
          type="button"
          className={`ce-extra-toggle-btn ${showExtra ? 'active' : ''}`}
          onClick={() => setShowExtra(!showExtra)}
        >
          {showExtra ? 'Ẩn chi tiết nâng cao' : '+ Thêm phát âm, ví dụ, ghi chú...'}
        </button>
      </div>

      {showExtra && (
        <div className="ce-row ce-row--extra animate-slide-down">
          <div className="ce-field-block">
            <label className="ce-label">PHÁT ÂM</label>
            <input
              name="pronunciation"
              className="ce-input"
              placeholder="/prəˌnʌnsiˈeɪʃən/"
              value={form.pronunciation}
              onChange={handleChange}
            />
          </div>
          <div className="ce-field-block">
            <label className="ce-label">VÍ DỤ</label>
            <input
              name="example"
              className="ce-input"
              placeholder="Ví dụ: Hello, how are you?"
              value={form.example}
              onChange={handleChange}
            />
          </div>
          <div className="ce-field-block">
            <label className="ce-label">COLLOCATION</label>
            <input
              name="collocation"
              className="ce-input"
              placeholder="Ví dụ: make a decision, take a photo"
              value={form.collocation}
              onChange={handleChange}
            />
          </div>
          <div className="ce-field-block">
            <label className="ce-label">TỪ LIÊN QUAN</label>
            <input
              name="relatedWords"
              className="ce-input"
              placeholder="Ví dụ: quick, fast, rapid"
              value={form.relatedWords}
              onChange={handleChange}
            />
          </div>
          <div className="ce-field-block">
            <label className="ce-label">GHI CHÚ</label>
            <input
              name="note"
              className="ce-input"
              placeholder="Ghi chú thêm..."
              value={form.note}
              onChange={handleChange}
            />
          </div>
        </div>
      )}

      {/* ── Image section ─────────────────────────────────────────────── */}
      <div className="ce-image-section">
        <button
          type="button"
          className={`ce-image-toggle-btn ${showImagePicker ? 'active' : ''} ${form.imageUrl ? 'has-image' : ''}`}
          onClick={() => setShowImagePicker((v) => !v)}
        >
          <FiImage size={14} />
          {form.imageUrl ? 'Đổi ảnh' : 'Thêm ảnh'}
          {form.imageUrl && <span className="ce-image-badge">✓</span>}
        </button>

        {form.imageUrl && !showImagePicker && (
          <div className="ce-image-thumb-wrap">
            <img src={form.imageUrl} alt="Card visual" className="ce-image-thumb" />
            <button
              type="button"
              className="ce-image-remove"
              onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
              title="Xóa ảnh"
            >
              <FiX size={11} />
            </button>
          </div>
        )}

        {showImagePicker && (
          <div className="ce-image-panel">
            {/* Tab switcher */}
            <div className="ce-image-tabs">
              <button
                type="button"
                className={`ce-image-tab ${imageTab === 'search' ? 'active' : ''}`}
                onClick={() => setImageTab('search')}
              >
                <FiSearch size={13} /> Tìm kiếm
              </button>
              <button
                type="button"
                className={`ce-image-tab ${imageTab === 'upload' ? 'active' : ''}`}
                onClick={() => setImageTab('upload')}
              >
                <FiUpload size={13} /> Tải lên
              </button>
            </div>

            {imageTab === 'search' ? (
              <ImagePicker
                selectedUrl={form.imageUrl}
                defaultQuery={form.front || ''}
                onSelect={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                onClear={() => setForm((p) => ({ ...p, imageUrl: '' }))}
              />
            ) : (
              <ImageUploader
                currentUrl={form.imageUrl}
                onUpload={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
                onClear={() => setForm((p) => ({ ...p, imageUrl: '' }))}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      {!inlineMode && (
        <div className="ce-actions">
          <button type="button" className="ce-btn ce-btn--cancel" onClick={onCancel} disabled={loading}>
            <FiX size={14} /> Hủy
          </button>
          <button type="submit" className="ce-btn ce-btn--save" disabled={loading}>
            {loading
              ? <span className="spinner-border spinner-border-sm" />
              : <><FiSave size={14} /> {card ? 'Lưu thay đổi' : 'Thêm thẻ'}</>
            }
          </button>
        </div>
      )}
    </form>
  );
}
