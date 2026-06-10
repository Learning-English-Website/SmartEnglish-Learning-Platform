import React, { useState, useRef, useCallback } from 'react';
import { FiUpload, FiImage, FiX, FiFolder } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import './ImageUploader.css';

/**
 * ImageUploader — Upload ảnh từ máy tính lên server.
 *
 * Props:
 *   onUpload(url)  — called with the uploaded image URL
 *   onClear()     — called when user removes the image
 *   currentUrl    — currently selected/uploaded image URL
 */
export default function ImageUploader({ onUpload, onClear, currentUrl }) {
  const [dragging, setDragging]     = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]           = useState('');
  const [previewError, setPreviewError] = useState(false);

  const inputRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh: JPG, PNG, GIF, WebP, SVG');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Kích thước tối đa: 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const data = await axiosClient.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data || !data.url) {
        throw new Error('Không nhận được URL ảnh từ máy chủ');
      }

      onUpload(data.url);
    } catch (err) {
      console.error('[ImageUploader] Upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Upload thất bại. Thử lại.');
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleBrowseClick = () => inputRef.current?.click();

  return (
    <div className="iu-wrap">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="iu-hidden-input"
        onChange={handleFileChange}
        aria-label="Upload image"
      />

      {/* Upload zone */}
      <div
        className={`iu-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleBrowseClick()}
        aria-label="Upload ảnh từ máy tính"
      >
        {uploading ? (
          <div className="iu-zone-content">
            <div className="iu-spinner" />
            <span>Đang upload…</span>
          </div>
        ) : (
          <div className="iu-zone-content">
            <div className="iu-zone-icon">
              <FiUpload size={20} />
            </div>
            <span className="iu-zone-title">Kéo thả ảnh vào đây</span>
            <span className="iu-zone-sub">hoặc</span>
            <button
              type="button"
              className="iu-browse-btn"
              onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }}
            >
              <FiFolder size={13} /> Chọn từ máy
            </button>
            <span className="iu-zone-hint">JPG, PNG, GIF, WebP, SVG · Tối đa 5MB</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="iu-error">
          <FiX size={13} /> {error}
        </div>
      )}

      {/* Preview */}
      {currentUrl && !previewError && (
        <div className="iu-preview">
          <img
            src={currentUrl}
            alt="Preview"
            className="iu-preview-img"
            onError={() => setPreviewError(true)}
          />
          <div className="iu-preview-overlay">
            <button
              type="button"
              className="iu-remove-btn"
              onClick={() => { onClear(); setPreviewError(false); }}
              title="Xóa ảnh"
            >
              <FiX size={12} /> Xóa
            </button>
          </div>
        </div>
      )}

      {currentUrl && previewError && (
        <div className="iu-preview-error">
          <FiImage size={20} />
          <span>Ảnh không tải được</span>
          <button
            type="button"
            className="iu-remove-btn iu-remove-btn--inline"
            onClick={() => { onClear(); setPreviewError(false); }}
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}
