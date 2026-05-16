import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import './FilterDropdown.css';

const FILTER_OPTIONS = [
  { id: 'owned', label: 'Tác giả: bạn' },
  { id: 'bookmarked', label: 'Đã đánh dấu' },
  { id: 'recent', label: 'Gần đây' },
  { id: 'studied', label: 'Đã học' },
];

export default function FilterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('owned');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedLabel = FILTER_OPTIONS.find((o) => o.id === selected)?.label;

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      {/* Trigger */}
      <button
        className={`filter-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="filter-trigger-label">{selectedLabel}</span>
        <svg
          className={`filter-chevron ${isOpen ? 'open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Menu */}
      <div
        className={`filter-menu ${isOpen ? 'visible' : ''}`}
        role="listbox"
        aria-label="Lọc theo"
      >

        {/* Options */}
        <div className="filter-menu-items">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`filter-item ${selected === option.id ? 'selected' : ''}`}
              role="option"
              aria-selected={selected === option.id}
              onClick={() => {
                setSelected(option.id);
                setIsOpen(false);
              }}
            >
              <span className="filter-item-label">{option.label}</span>
              {selected === option.id && (
                <Check size={14} className="filter-item-check" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
