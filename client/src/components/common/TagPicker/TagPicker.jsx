import { useState, useEffect, useRef } from 'react';
import { Form, Badge, Spinner } from 'react-bootstrap';
import { FiX, FiPlus, FiCheck } from 'react-icons/fi';
import { tagService } from '../../../api/tagService';
import './TagPicker.css';

/**
 * TagPicker — autocomplete tag selection with inline creation
 *
 * @param {string[]} selectedTags - Array of selected tag IDs
 * @param {function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {string|null} folderId - Scope tags to a specific folder
 */
export default function TagPicker({ selectedTags = [], onChange, placeholder = 'Add tags...', folderId = null }) {
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  const [creatingTag, setCreatingTag] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Load tags (scoped to folder if provided)
  useEffect(() => {
    tagService.getAll(folderId)
      .then((res) => {
        const loaded = res?.data ?? (Array.isArray(res) ? res : []);
        setAllTags(loaded);
        // If there are pre-selected tag IDs not yet in loaded tags, add them as stubs
        const existingIds = new Set(loaded.map(t => t._id));
        const missingTags = selectedTags
          .filter(id => typeof id === 'string' && !existingIds.has(id))
          .map(id => ({ _id: id, name: '…' }));
        if (missingTags.length > 0) {
          setAllTags(prev => [...prev, ...missingTags]);
        }
      })
      .catch(() => setAllTags([]))
      .finally(() => setLoading(false));
  }, [folderId]);

  // Filter tags based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags(allTags.filter((tag) => !selectedTags.includes(tag._id)).slice(0, 10));
      return;
    }

    const query = inputValue.toLowerCase();
    const filtered = allTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) &&
        !selectedTags.includes(tag._id)
    );
    setFilteredTags(filtered.slice(0, 10));
  }, [inputValue, allTags, selectedTags]);

  // Check if exact tag exists
  const exactTagExists = filteredTags.some(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
  );

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleSelectTag = async (tag) => {
    if (!selectedTags.includes(tag._id)) {
      onChange([...selectedTags, tag._id]);
    }
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleCreateTag = async () => {
    const name = inputValue.trim();
    if (!name || creatingTag) return;

    setCreatingTag(true);
    try {
      const res = await tagService.create(name);
      const newTag = res?.data ?? res;
      setAllTags((prev) => [...prev, newTag]);
      onChange([...selectedTags, newTag._id]);
      setInputValue('');
      setShowDropdown(false);
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setCreatingTag(false);
    }
  };

  const handleRemoveTag = (tagId) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredTags.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredTags[highlightedIndex]) {
        handleSelectTag(filteredTags[highlightedIndex]);
      } else if (inputValue.trim() && !exactTagExists) {
        handleCreateTag();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Get selected tag objects
  const selectedTagObjects = allTags.filter((tag) => selectedTags.includes(tag._id));

  return (
    <div className="tag-picker" ref={dropdownRef}>
      {/* Selected Tags */}
      <div className="tag-picker-selected">
        {selectedTagObjects.map((tag) => (
          <Badge key={tag._id} bg="primary" className="tag-picker-badge">
            {tag.name}
            <button
              type="button"
              className="tag-picker-remove"
              onClick={() => handleRemoveTag(tag._id)}
              aria-label={`Remove ${tag.name}`}
            >
              <FiX size={12} />
            </button>
          </Badge>
        ))}
        <div className="tag-picker-input-wrapper">
          {loading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <Form.Control
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedTags.length === 0 ? placeholder : ''}
              className="tag-picker-input"
              autoComplete="off"
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="tag-picker-dropdown">
          {filteredTags.length > 0 && (
            <div className="tag-picker-list">
              {filteredTags.map((tag, index) => (
                <div
                  key={tag._id}
                  className={`tag-picker-option ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSelectTag(tag)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span>{tag.name}</span>
                  {selectedTags.includes(tag._id) && <FiCheck size={14} />}
                </div>
              ))}
            </div>
          )}

          {/* Create new tag option */}
          {inputValue.trim() && !exactTagExists && (
            <div
              className={`tag-picker-create ${highlightedIndex === filteredTags.length ? 'highlighted' : ''}`}
              onClick={handleCreateTag}
              onMouseEnter={() => setHighlightedIndex(filteredTags.length)}
            >
              {creatingTag ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <>
                  <FiPlus size={14} />
                  <span>Create "{inputValue.trim()}"</span>
                </>
              )}
            </div>
          )}

          {filteredTags.length === 0 && !inputValue.trim() && (
            <div className="tag-picker-empty">
              Start typing to search or create tags
            </div>
          )}
        </div>
      )}
    </div>
  );
}
