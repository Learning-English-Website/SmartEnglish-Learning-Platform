import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { tagService } from '../../api/tagService';
import './CreateTagModal.css';

const SUGGESTED_TAGS = ['Bài thi 2', 'Giữa kỳ', 'Bài thi cuối kỳ', 'Quiz 1', 'Đơn vị 1', 'Từ vựng', 'Ngữ pháp', 'Học kỳ 1'];

export default function CreateTagModal({ folderId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await tagService.create(trimmed, '#5a67d8', folderId);
      const created = res?.data ?? res;
      onCreated?.(created);
      onClose();
    } catch (err) {
      console.error('Failed to create tag:', err);
      alert('Không thể tạo thẻ. Thẻ có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) handleCreate();
  };

  return (
    <div className="ctm-overlay" onClick={onClose}>
      <div className="ctm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ctm-header">
          <h2 className="ctm-title">Thẻ mới</h2>
          <button className="ctm-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="ctm-form">
          <label className="ctm-label">Tên thẻ</label>
          <input
            ref={inputRef}
            type="text"
            className="ctm-input"
            placeholder="Tên thẻ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
        </form>

        {/* Suggested Tags */}
        <div className="ctm-suggested">
          <span className="ctm-suggested-label">Được đề xuất</span>
          <div className="ctm-suggested-pills">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`ctm-suggested-pill ${name === tag ? 'selected' : ''}`}
                onClick={() => setName(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="ctm-action">
          <button
            className="ctm-btn-primary"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Đang thêm...' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}
