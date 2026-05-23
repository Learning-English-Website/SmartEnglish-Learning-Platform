import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './FilterDropdown.css';

const OPTIONS = [
  { value: 'recent', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
];

export function FilterDropdown() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('recent');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = OPTIONS.find(o => o.value === selected);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button className="filter-dropdown__trigger" onClick={() => setOpen(!open)}>
        <span>{current?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="filter-dropdown__menu">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`filter-dropdown__item ${selected === opt.value ? 'active' : ''}`}
              onClick={() => { setSelected(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
