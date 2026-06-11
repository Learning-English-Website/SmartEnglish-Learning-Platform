import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { MessageSquare, Search, ChevronLeft, ChevronRight, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminPage.css';

const PAGE_SIZE = 10;
const CATEGORIES = {
  bug: { label: 'Báo lỗi', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  feature: { label: 'Góp ý tính năng', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  other: { label: 'Khác', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)' }
};

const STATUSES = {
  pending: { label: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
  in_progress: { label: 'Đang xử lý', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)' },
  resolved: { label: 'Đã giải quyết', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' }
};

function Badge({ value, config }) {
  const s = config[value] || { label: value, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      {s.label}
    </span>
  );
}

function FeedbackModal({ isOpen, onClose, feedbackId, onSave }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!feedbackId) return;
    setLoading(true);
    try {
      const res = await adminService.getFeedbackDetail(feedbackId);
      setFeedback(res.data);
      setReplyText(res.data.cskhReply || '');
      setStatus(res.data.status || 'pending');
    } catch {
      toast.error('Không thể tải chi tiết phản hồi');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [feedbackId, onClose]);

  useEffect(() => {
    if (isOpen) fetchDetail();
  }, [isOpen, fetchDetail]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(feedbackId, { status, cskhReply: replyText });
      toast.success('Đã lưu phản hồi thành công');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3>Chi tiết Phản hồi</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {loading || !feedback ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải...</div>
        ) : (
          <>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Badge value={feedback.category} config={CATEGORIES} />
                  <Badge value={feedback.status} config={STATUSES} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Gửi lúc: {new Date(feedback.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>{feedback.title}</h4>
              <p style={{
                background: 'var(--bg-page)', padding: '12px 16px', borderRadius: '8px',
                color: 'var(--text-body)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', border: '1px solid var(--border-subtle)', marginBottom: '1rem'
              }}>
                {feedback.content}
              </p>

              {/* Attachments */}
              {feedback.attachments && feedback.attachments.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Ảnh đính kèm ({feedback.attachments.length})</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {feedback.attachments.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <img src={url} alt={`attachment-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <h5 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-heading)' }}>Học viên gửi</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-page)', padding: '8px 12px', borderRadius: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {feedback.user?.avatar ? (
                      <img src={feedback.user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      feedback.user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{feedback.user?.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{feedback.user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Reply Section */}
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Trạng thái xử lý</label>
                <select
                  className="form-control-admin"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  style={{ marginBottom: '1rem', width: '100%' }}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="in_progress">Đang tiến hành</option>
                  <option value="resolved">Đã giải quyết</option>
                </select>

                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Trả lời học viên</label>
                <textarea
                  className="form-control-admin"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung phản hồi, hướng dẫn giải quyết..."
                  rows={4}
                  style={{ width: '100%', height: 'auto', resize: 'vertical' }}
                />
                
                {feedback.repliedBy && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Người phản hồi cuối: <strong>{feedback.repliedBy.username}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
              <button className="btn-primary-admin" disabled={saving} onClick={handleSave}>
                {saving ? 'Đang lưu...' : 'Lưu phản hồi'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getFeedbacks({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined
      });
      setFeedbacks(res.data.feedbacks || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
    } catch {
      toast.error('Không thể tải danh sách phản hồi');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSaveReply = async (id, data) => {
    await adminService.replyFeedback(id, data);
    loadFeedbacks();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const getPageNumbers = () => {
    const range = [];
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Tiếp nhận góp ý, báo cáo lỗi từ học viên và gửi câu trả lời hướng dẫn khắc phục.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap blue">
            <MessageSquare size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Tổng phản hồi</span>
            <h3 className="admin-stat-value">{total}</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap amber">
            <AlertCircle size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Kênh tiếp nhận</span>
            <h3 className="admin-stat-value" style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '5px' }}>WIDGET BÁO LỖI</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap green">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Hệ thống</span>
            <h3 className="admin-stat-value" style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '5px', color: '#10b981' }}>ONLINE</h3>
          </div>
        </div>
      </div>

      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-control-admin"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, user..."
              style={{ paddingLeft: 38 }}
            />
          </div>
          <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
            Tìm kiếm
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-control-admin"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            style={{ minWidth: 150 }}
          >
            <option value="">Tất cả loại phản hồi</option>
            <option value="bug">Báo lỗi</option>
            <option value="feature">Góp ý tính năng</option>
            <option value="other">Khác</option>
          </select>

          <select
            className="form-control-admin"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ minWidth: 150 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_progress">Đang tiến hành</option>
            <option value="resolved">Đã giải quyết</option>
          </select>
        </div>
      </div>

      {loading && feedbacks.length === 0 ? (
        <div className="admin-page-loading">
          <div className="admin-spinner" />
          <p>Đang tải danh sách phản hồi...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><MessageSquare size={48} style={{ opacity: 0.4 }} /></div>
          <h3>Không tìm thấy phản hồi</h3>
          <p>Không có phản hồi nào trùng khớp với bộ lọc hiện tại</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Học viên</th>
                  <th>Loại</th>
                  <th>Tiêu đề</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                  <th>Người xử lý</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f, i) => (
                  <tr key={f._id}>
                    <td className="admin-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {f.user?.avatar ? (
                            <img src={f.user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <MessageSquare size={14} style={{ color: '#6366f1' }} />
                          )}
                        </div>
                        <span className="admin-td-title" style={{ maxWidth: 120 }}>{f.user?.username || '—'}</span>
                      </div>
                    </td>
                    <td><Badge value={f.category} config={CATEGORIES} /></td>
                    <td>
                      <div className="admin-td-title" style={{ maxWidth: 220, fontWeight: 500 }} title={f.title}>
                        {f.title}
                      </div>
                    </td>
                    <td><Badge value={f.status} config={STATUSES} /></td>
                    <td className="admin-td-muted">{new Date(f.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="admin-td-muted">{f.repliedBy?.username || '—'}</td>
                    <td className="admin-td-actions">
                      <button className="btn-action" onClick={() => setSelectedFeedbackId(f._id)} title="Xem chi tiết & Trả lời">
                        <MessageSquare size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination-btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">...</span>;
                }
                return (
                  <button
                    key={p}
                    className={`admin-pagination-btn ${page === p ? 'active' : ''}`}
                    disabled={loading}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="admin-pagination-btn"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <FeedbackModal
        isOpen={!!selectedFeedbackId}
        onClose={() => setSelectedFeedbackId(null)}
        feedbackId={selectedFeedbackId}
        onSave={handleSaveReply}
      />
    </div>
  );
}
