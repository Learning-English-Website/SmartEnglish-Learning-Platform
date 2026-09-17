import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiImage, FiX, FiFolder, FiRefreshCw } from 'react-icons/fi';
import axiosClient from '../../api/axiosClient';
import { getMediaUrl } from '../../utils/mediaUtils';
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
  const [dragging, setDragging]         = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState('');
  const [lastFailedFile, setLastFailedFile] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    setPreviewError(false);
    setError('');
  }, [currentUrl]);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh: JPG, PNG, GIF, WebP, SVG');
      setLastFailedFile(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Kích thước tối đa: 5MB');
      setLastFailedFile(null);
      return;
    }

    setError('');
    setLastFailedFile(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Explicitly set Content-Type to undefined to let Axios/browser set multipart/form-data with boundary
      const res = await axiosClient.post('/media/upload', formData, {
        headers: {
          'Content-Type': undefined,
        },
      });

      const returnedUrl = res?.url || res?.data?.url;
      if (!returnedUrl) {
        throw new Error('Không nhận được URL ảnh từ máy chủ');
      }

      onUpload(returnedUrl);
    } catch (err) {
      console.error('[ImageUploader] Upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Upload thất bại. Vui lòng thử lại.');
      setLastFailedFile(file);
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FiX size={13} /> {error}
          </span>
          {lastFailedFile && (
            <button
              type="button"
              className="iu-retry-btn"
              onClick={() => uploadFile(lastFailedFile)}
              title="Thử tải lại ảnh này"
            >
              <FiRefreshCw size={11} /> Thử lại
            </button>
          )}
        </div>
      )}

      {/* Preview */}
      {currentUrl && !previewError && (
        <div className="iu-preview">
          <img
            src={getMediaUrl(currentUrl)}
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
