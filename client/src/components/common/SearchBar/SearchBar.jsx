import { Form, InputGroup } from 'react-bootstrap';
import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  size = 'md',
  className = '',
  showClear = true,
}) {
  const handleClear = () => onChange({ target: { value: '' } });

  return (
    <InputGroup className={`search-bar ${className}`}>
      <InputGroup.Text className="search-bar-icon">
        <FiSearch size={16} />
      </InputGroup.Text>
      <Form.Control
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`search-bar-input search-bar-${size}`}
      />
      {showClear && value && (
        <button type="button" className="search-bar-clear" onClick={handleClear} aria-label="Clear search">
          <FiX size={14} />
        </button>
      )}
    </InputGroup>
  );
}
