import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, X } from 'lucide-react';
import { folderService } from '../../api/folderService';
import './CreateFolderModal.css';

export default function CreateFolderModal({ parentId, onClose, onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC to close
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
      const res = await folderService.create(trimmed, parentId || null);
      const created = res?.data ?? res;
      onCreated?.(created);
      navigate(`/folders/${created._id}/${encodeURIComponent(trimmed)}`);
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert('Không thể tạo thư mục. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCreate();
  };

  return (
    <div className="cfm-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div className="cfm-icon-wrap">
          <Folder size={36} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="cfm-form">
          <input
            ref={inputRef}
            type="text"
            className="cfm-input"
            placeholder="Nhập tên thư mục"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
        </form>

        {/* Actions */}
        <div className="cfm-actions">
          <button className="cfm-btn-secondary" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button
            className="cfm-btn-primary"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}
