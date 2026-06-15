import { FiSearch, FiX } from 'react-icons/fi';
import './SearchBar.css';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  debounceMs = 300,
  size = 'md',
  className = '',
  showClear = true,
}) {
  const handleClear = () => onChange({ target: { value: '' } });

  return (
    <div className={`search-bar ${className}`}>
      <FiSearch className="search-bar-icon" size={18} />
      <input
        type="text"
        className={`search-bar-input search-bar-${size}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {showClear && value && (
        <button type="button" className="search-bar-clear" onClick={handleClear}>
          <FiX size={16} />
        </button>
      )}
    </div>
  );
}
