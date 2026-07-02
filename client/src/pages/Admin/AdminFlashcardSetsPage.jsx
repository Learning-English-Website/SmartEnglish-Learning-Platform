import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import './AdminPage.css';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, title }) {
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Xác nhận xóa</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bạn có chắc muốn xóa bộ flashcard này?
          </p>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-heading)', wordBreak: 'break-word' }}>{title}</p>
          <div className="delete-confirm-warning">⚠️ Tất cả thẻ trong bộ này sẽ bị xóa vĩnh viễn.</div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-danger-admin" disabled={loading} onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}>
            {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFlashcardSetsPage() {
  const [sets, setSets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await adminService.getFlashcardSets(params);
      const data = res.data;
      setSets(data.sets || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadData(1); }, [loadData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const openView = async (item) => {
    setViewLoading(true);
    setViewItem(null);
    try {
      const res = await adminService.getFlashcardSet(item._id);
      setViewItem(res.data);
    } catch { toast.error('Không thể tải chi tiết'); }
    finally { setViewLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteFlashcardSet(deleteItem._id);
      toast.success('Đã xóa bộ flashcard');
      setDeleteItem(null);
      loadData(page);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ownerLabel = (user) => {
    if (!user) return '—';
    if (user.email && user.username) return `${user.username} (${user.email})`;
    return user.username || user.email || '—';
  };

  const cardFront = (card) => card.front || card.term || card.word || card.question || card.vocabulary || card.english || 'Chưa có mặt trước';
  const cardBack = (card) => card.back || card.definition || card.meaning || card.answer || card.translation || card.vietnamese || 'Chưa có mặt sau';
  const cardImage = (card) => card.imageUrl || card.image || card.thumbnail;

  const renderTags = (tags = []) => {
    if (!tags.length) return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa gắn nhãn</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map((tag, idx) => {
          const tagName = tag?.name || tag;
          const tagColor = tag?.color || '#6366f1';
          return (
            <span
              key={tag?._id || tagName || idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 9px',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 700,
                background: `${tagColor}16`,
                color: tagColor,
                border: `1px solid ${tagColor}30`,
              }}
            >
              {tagName}
            </span>
          );
        })}
      </div>
    );
  };

  const getPageNumbers = () => {
    const range = [];
    const delta = 2;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  if (loading && !sets.length) return <div className="admin-page-loading"><div className="admin-spinner" /><p>Đang tải...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Quản lý Flashcard Sets</h2>
          <p>{total} bộ flashcard</p>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, mô tả..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40, minWidth: 280 }}
          />
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📇</div>
          <h3>Chưa có bộ flashcard nào</h3>
          <p>{(search) ? 'Không tìm thấy kết quả phù hợp' : 'Danh sách trống'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tiêu đề</th>
                  <th>Mô tả</th>
                  <th>Chủ sở hữu</th>
                  <th>Thẻ</th>
                  <th>Ngôn ngữ</th>
                  <th>Công khai</th>
                  <th>Thumbnail</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s, i) => (
                  <tr key={s._id} onClick={() => openView(s)} style={{ cursor: 'pointer' }}>
                    <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                    <td className="admin-td-title">{s.title || '—'}</td>
                    <td className="admin-td-muted" title={s.description}>{s.description || '—'}</td>
                    <td className="admin-td-muted">{s.user?.username || s.user?.email || '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-heading)' }}>{s.cardCount ?? s.cards?.length ?? 0}</td>
                    <td><span className="admin-badge" style={{ fontSize: '0.7rem' }}>{s.language || '—'}</span></td>
                    <td>
                      <span className={`admin-badge ${s.isPublic ? 'published' : 'draft'}`} style={{ fontSize: '0.7rem' }}>
                        {s.isPublic ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td>
                      {s.thumbnail ? (
                        <img src={s.thumbnail} alt="thumb" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td className="admin-td-muted">{formatDate(s.createdAt)}</td>
                    <td className="admin-td-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-action" onClick={() => openView(s)} title="Xem chi tiết"><Eye size={14} /></button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(s)} title="Xóa"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination-btn"
                disabled={page <= 1 || loading}
                onClick={() => loadData(page - 1)}
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
                    onClick={() => loadData(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="admin-pagination-btn"
                disabled={page >= pages || loading}
                onClick={() => loadData(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!viewItem || viewLoading} onClose={() => setViewItem(null)} title="Chi tiết Flashcard Set">
        {viewLoading ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="admin-spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Đang tải...</p>
          </div>
        ) : viewItem ? (
          <>
            <div className="modal-body">
              {viewItem.thumbnail && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <img src={viewItem.thumbnail} alt="cover" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Tiêu đề</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{viewItem.title || '—'}</div>
                </div>
                <div className="form-group">
                  <label>Chủ sở hữu</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{ownerLabel(viewItem.user)}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngôn ngữ</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{viewItem.language || '—'}</div>
                </div>
                <div className="form-group">
                  <label>Công khai</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>
                    <span className={`admin-badge ${viewItem.isPublic ? 'published' : 'draft'}`}>{viewItem.isPublic ? 'Có' : 'Không'}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.9rem', color: 'var(--text-body)', border: '1px solid var(--border-subtle)', minHeight: 60 }}>{viewItem.description || '—'}</div>
              </div>
              <div className="form-group">
                <label>Nhãn</label>
                <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>{renderTags(viewItem.tags || [])}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng thẻ</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{viewItem.cards?.length ?? viewItem.cardCount ?? 0}</div>
                </div>
                <div className="form-group">
                  <label>ID bộ thẻ</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>{viewItem._id || '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày tạo</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.createdAt)}</div>
                </div>
                <div className="form-group">
                  <label>Ngày cập nhật</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.updatedAt)}</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Danh sách thẻ ({viewItem.cards?.length ?? 0})
                  </label>
                </div>
                {viewItem.cards && viewItem.cards.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
                    {viewItem.cards.map((card, idx) => (
                      <div
                        key={card._id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: cardImage(card) ? 'minmax(0, 1fr) 120px' : 'minmax(0, 1fr)',
                          minHeight: 118,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: '4px solid #6366f1',
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <div style={{ padding: '14px 16px', minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-heading)' }}>Thẻ #{idx + 1}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span className="admin-badge" style={{ fontSize: '0.68rem' }}>Order {card.order ?? idx + 1}</span>
                              <span className="admin-badge draft" style={{ fontSize: '0.68rem' }}>Độ khó {card.difficulty ?? 0}/5</span>
                              {card.nextReviewAt && <span className="admin-badge draft" style={{ fontSize: '0.68rem' }}>Ôn {formatDate(card.nextReviewAt)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase' }}>Mặt trước</div>
                              <div style={{ fontWeight: 750, color: 'var(--text-heading)', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.45 }}>{cardFront(card)}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase' }}>Mặt sau</div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.45 }}>{cardBack(card)}</div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginTop: 10 }}>
                            {card.pronunciation && <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontStyle: 'italic', wordBreak: 'break-word' }}><strong>Phát âm:</strong> {card.pronunciation}</div>}
                            {card.example && <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', wordBreak: 'break-word' }}><strong>Ví dụ:</strong> {card.example}</div>}
                            {card.note && <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', wordBreak: 'break-word' }}><strong>Ghi chú:</strong> {card.note}</div>}
                            {card.collocation && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}><strong>Cụm từ:</strong> {card.collocation}</div>}
                            {card.relatedWords && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}><strong>Từ liên quan:</strong> {card.relatedWords}</div>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
                            Tạo: {formatDate(card.createdAt)} · Cập nhật: {formatDate(card.updatedAt)}
                          </div>
                        </div>
                        {cardImage(card) && (
                          <div style={{ minHeight: 118, background: 'var(--bg-soft)', borderLeft: '1px solid var(--border-subtle)' }}>
                            <img src={cardImage(card)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>Không có thẻ nào</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-admin" onClick={() => setViewItem(null)}>Đóng</button>
            </div>
          </>
        ) : null}
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title={deleteItem?.title || ''} />
    </div>
  );
}
