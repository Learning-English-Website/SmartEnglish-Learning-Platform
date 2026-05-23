import { useState, useRef, useCallback, useEffect } from 'react';
import { FiSearch, FiX, FiCheck, FiImage } from 'react-icons/fi';
import { searchImages, PEXELS_KEY } from '../../../api/imageService';
import './ImagePicker.css';

/**
 * ImagePicker — Quizlet-style image search panel.
 *
 * Props:
 *   selectedUrl    — currently selected image URL
 *   onSelect(url)  — called when user selects an image
 *   onClear()      — called when user removes image
 *   defaultQuery   — initial search query (usually the card term)
 */
export default function ImagePicker({ selectedUrl, onSelect, onClear, defaultQuery = '' }) {
  const [query, setQuery]       = useState(defaultQuery);
  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState('');
  const [selectedImgError, setSelectedImgError] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);
  const gridRef     = useRef(null);

  /* ── Search ───────────────────────────────────────────────────────── */
  const doSearch = useCallback(async (q) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    setImgErrors({});
    try {
      const results = await searchImages(q.trim(), 12);
      setImages(results);
      setSearched(true);
    } catch {
      setError('Không thể tải ảnh. Kiểm tra API key.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleClearQuery = () => {
    setQuery('');
    setImages([]);
    setSearched(false);
    setError('');
    inputRef.current?.focus();
  };

  const handleImgError = (id) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleSelectImgError = () => {
    setSelectedImgError(true);
  };

  /* ── Auto-search on mount ─────────────────────────────────────────── */
  useEffect(() => {
    if (defaultQuery && !searched && !loading) {
      doSearch(defaultQuery);
    }
  }, []);

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="ip-wrap">
      {/* Search bar */}
      <form className="ip-search" onSubmit={handleSubmit}>
        <FiSearch size={14} className="ip-search-icon" />
        <input
          ref={inputRef}
          className="ip-search-input"
          placeholder="Tìm ảnh…"
          value={query}
          onChange={handleInputChange}
          autoComplete="off"
        />
        {loading && <span className="ip-spinner" />}
        {query && !loading && (
          <button
            type="button"
            className="ip-clear-query"
            onClick={handleClearQuery}
            aria-label="Xóa"
          >
            <FiX size={11} />
          </button>
        )}
      </form>

      {/* Selected preview */}
      {selectedUrl && !selectedImgError && (
        <div className="ip-selected-preview">
          <img
            src={selectedUrl}
            alt="Đã chọn"
            className="ip-selected-img"
            onError={handleSelectImgError}
          />
          <div className="ip-selected-overlay">
            <button
              type="button"
              className="ip-remove-btn"
              onClick={() => { onClear(); setSelectedImgError(false); }}
              title="Xóa ảnh"
            >
              <FiX size={12} /> Xóa
            </button>
          </div>
        </div>
      )}

      {selectedUrl && selectedImgError && (
        <div className="ip-selected-preview">
          <div className="ip-selected-img-error">
            <FiImage size={24} />
          </div>
          <div className="ip-selected-overlay">
            <button
              type="button"
              className="ip-remove-btn"
              onClick={() => { onClear(); setSelectedImgError(false); }}
              title="Xóa ảnh"
            >
              <FiX size={12} /> Xóa
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="ip-loading">
          <span>Đang tải…</span>
        </div>
      )}

      {loading && images.length === 0 && (
        <div className="ip-loading-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="ip-loading-cell" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="ip-error">
          <FiImage size={14} /> {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && images.length === 0 && !error && (
        <div className="ip-empty">
          <div className="ip-empty-icon">
            <FiImage size={22} />
          </div>
          <p>Không tìm thấy ảnh nào cho "{query}"</p>
        </div>
      )}

      {/* Image grid */}
      {!loading && images.length > 0 && (
        <div className="ip-grid-container" ref={gridRef}>
          <div className="ip-grid">
            {images.map((img) => {
              const isSelected = selectedUrl === img.webformatUrl;
              const hasError = imgErrors[img.id];
              return (
                <button
                  key={img.id}
                  type="button"
                  className={`ip-cell ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(img.webformatUrl);
                    setSelectedImgError(false);
                  }}
                  title={img.tags}
                >
                  {hasError ? (
                    <div className="ip-thumb-error">
                      <FiImage size={18} />
                    </div>
                  ) : (
                    <img
                      src={img.previewUrl}
                      alt={img.tags}
                      className="ip-thumb"
                      loading="lazy"
                      onError={() => handleImgError(img.id)}
                    />
                  )}
                  {isSelected && (
                    <div className="ip-cell-check">
                      <FiCheck size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hint state */}
      {!loading && !searched && !selectedUrl && !error && (
        <div className="ip-hint">
          <div className="ip-hint-icon">
            <FiImage size={22} />
          </div>
          <p>Nhập từ khóa để tìm ảnh</p>
        </div>
      )}

      <div className="ip-footer">
        {PEXELS_KEY ? (
          <>Ảnh từ <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></>
        ) : (
          <>Ảnh từ <a href="https://loremflickr.com" target="_blank" rel="noreferrer">LoremFlickr</a> · Thêm VITE_PEXELS_KEY để dùng Pexels</>
        )}
      </div>
    </div>
  );
}
