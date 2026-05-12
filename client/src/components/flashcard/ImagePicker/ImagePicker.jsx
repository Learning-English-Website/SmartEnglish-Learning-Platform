import { useState, useRef, useCallback } from 'react';
import { FiSearch, FiX, FiCheck, FiImage } from 'react-icons/fi';
import { searchImages } from '../../../api/imageService';
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

  const inputRef   = useRef(null);
  const debounceRef = useRef(null);

  /* ── Search ───────────────────────────────────────────────────────── */
  const doSearch = useCallback(async (q) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const results = await searchImages(q.trim(), 12);
      setImages(results);
      setSearched(true);
    } catch {
      setError('Failed to fetch images. Check your Pixabay API key.');
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

  /* ── Auto-search on mount with defaultQuery ───────────────────────── */
  const [autoSearched, setAutoSearched] = useState(false);
  if (!autoSearched && defaultQuery && !searched && !loading) {
    setAutoSearched(true);
    doSearch(defaultQuery);
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="ip-wrap">
      {/* Search bar */}
      <form className="ip-search" onSubmit={handleSubmit}>
        <FiSearch size={14} className="ip-search-icon" />
        <input
          ref={inputRef}
          className="ip-search-input"
          placeholder="Search images…"
          value={query}
          onChange={handleInputChange}
          autoComplete="off"
        />
        {loading && <span className="ip-spinner" />}
        {query && (
          <button
            type="button"
            className="ip-clear-query"
            onClick={() => { setQuery(''); setImages([]); setSearched(false); }}
            aria-label="Clear"
          >
            <FiX size={12} />
          </button>
        )}
      </form>

      {/* Selected preview */}
      {selectedUrl && (
        <div className="ip-selected-preview">
          <img src={selectedUrl} alt="Selected" className="ip-selected-img" />
          <div className="ip-selected-overlay">
            <button
              type="button"
              className="ip-remove-btn"
              onClick={onClear}
              title="Remove image"
            >
              <FiX size={14} /> Remove
            </button>
          </div>
        </div>
      )}

      {/* Image grid */}
      {error && (
        <div className="ip-error">
          <FiImage size={16} /> {error}
        </div>
      )}

      {!loading && searched && images.length === 0 && (
        <div className="ip-empty">
          <FiImage size={20} />
          <p>No images found for "{query}"</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="ip-grid">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              className={`ip-cell ${selectedUrl === img.webformatUrl ? 'selected' : ''}`}
              onClick={() => onSelect(img.webformatUrl)}
              title={img.tags}
            >
              <img
                src={img.previewUrl}
                alt={img.tags}
                className="ip-thumb"
                loading="lazy"
              />
              {selectedUrl === img.webformatUrl && (
                <div className="ip-cell-check">
                  <FiCheck size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && !searched && !selectedUrl && (
        <div className="ip-hint">
          <FiImage size={20} />
          <p>Type a keyword to search images</p>
        </div>
      )}

      <div className="ip-footer">
        Photos by <a href="https://pixabay.com" target="_blank" rel="noreferrer">Pixabay</a>
      </div>
    </div>
  );
}
