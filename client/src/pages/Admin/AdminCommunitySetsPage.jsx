import { useState, useEffect, useCallback } from 'react';
import { Grid3x3, Trash2, Search, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import './AdminPage.css';

function Modal({ isOpen, onClose, title, children, size = 'modal-lg' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${size}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, item }) {
  const [loading, setLoading] = useState(false);
  if (!isOpen || !item) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Xác nhận xóa</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bạn có chắc muốn xóa flashcard set này khỏi cộng đồng?
          </p>
          <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{item.title}</p>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 0 }}>bởi {item.user?.username || 'Unknown'}</p>
          <div className="delete-confirm-warning">⚠️ Set sẽ bị gỡ khỏi trang cộng đồng. Dữ liệu gốc của người dùng không bị ảnh hưởng.</div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-danger-admin" disabled={loading} onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}>
            {loading ? 'Đang xóa...' : 'Xóa khỏi cộng đồng'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCommunitySetsPage() {
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

  const LIMIT = 10;

  const loadData = useCallback(async (searchTerm = '', pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: LIMIT };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await adminService.getCommunitySets(params);
      const data = res.data;
      setSets(data.sets || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch { toast.error('Không thể tải danh sách community sets'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(search, page);
  }, [loadData, search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openView = async (item) => {
    setViewLoading(true);
    setViewItem(item);
    try {
      const res = await adminService.getFlashcardSet(item._id);
      setViewItem(res.data);
    } catch {
      toast.error('Không thể tải chi tiết community set');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteCommunitySet(deleteItem._id);
      toast.success('Đã xóa set khỏi cộng đồng');
      setDeleteItem(null);
      loadData(search, page);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pages) return;
    setPage(newPage);
  };

  const startItem = (page - 1) * LIMIT + 1;
  const endItem = Math.min(page * LIMIT, total);

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ownerLabel = (user) => {
    if (!user) return 'Unknown';
    if (user.email && user.username) return `${user.username} (${user.email})`;
    return user.username || user.email || 'Unknown';
  };

  const cardFront = (card) => card.front || card.term || card.word || card.question || card.vocabulary || card.english || 'Chưa có mặt trước';
  const cardBack = (card) => card.back || card.definition || card.meaning || card.answer || card.translation || card.vietnamese || 'Chưa có mặt sau';
  const cardImage = (card) => card.imageUrl || card.image || card.thumbnail;

  const renderTags = (tags = []) => {
    if (!tags.length) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa có tags</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map((tag, idx) => {
          const tagName = tag?.name || tag;
          const tagColor = tag?.color || '#6366f1';
          return (
            <span
              key={tag?._id || tagName || idx}
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                background: `${tagColor}15`,
                color: tagColor,
                border: `1px solid ${tagColor}25`,
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

  if (loading && sets.length === 0) {
    return (
      <div className="admin-page">
        <div className="admin-page-loading">
          <div className="admin-spinner" />
          <p>Đang tải community sets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Community Flashcard Sets</h2>
          <p>{total} public sets</p>
        </div>
      </div>

      <form className="admin-filter-bar" onSubmit={handleSearch} style={{ maxWidth: 480 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc mô tả..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ paddingLeft: 40, width: '100%' }}
          />
        </div>
        <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px' }}>
          <Search size={14} /> Tìm
        </button>
        {search && (
          <button
            type="button"
            className="btn-secondary-admin"
            style={{ padding: '10px 12px' }}
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
          >
            <X size={14} /> Xóa
          </button>
        )}
      </form>

      {sets.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><Grid3x3 size={56} strokeWidth={1.5} /></div>
          <h3>Chưa có community set nào</h3>
          <p>{search ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có flashcard set nào được chia sẻ lên cộng đồng'}</p>
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
                  <th>Người tạo</th>
                  <th style={{ textAlign: 'center' }}>Số thẻ</th>
                  <th>Tags</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set, i) => (
                  <tr key={set._id} onClick={() => openView(set)} style={{ cursor: 'pointer' }}>
                    <td className="admin-td-num">{(page - 1) * LIMIT + i + 1}</td>
                    <td className="admin-td-title" title={set.title}>{set.title}</td>
                    <td className="admin-td-muted" title={set.description}>{set.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {set.user?.avatar ? (
                          <img src={set.user.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                            {(set.user?.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="admin-td-muted" style={{ maxWidth: 100 }}>{set.user?.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.85rem' }}>{set.cardCount || 0}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 160 }}>
                        {(set.tags || []).slice(0, 3).map(tag => {
                          const tagId = tag?._id || tag;
                          const tagName = tag?.name || tag;
                          const tagColor = tag?.color || '#6366f1';
                          return (
                            <span
                              key={tagId}
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: `${tagColor}15`,
                                color: tagColor,
                                border: `1px solid ${tagColor}25`,
                                maxWidth: 80,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tagName}
                            </span>
                          );
                        })}
                        {(set.tags || []).length > 3 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            +{set.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="admin-td-muted" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(set.createdAt)}
                    </td>
                    <td className="admin-td-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn-action" onClick={() => openView(set)} title="Xem chi tiết">
                        <Eye size={14} />
                      </button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(set)} title="Xóa khỏi cộng đồng">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
                Hiển thị {startItem}–{endItem} trong {total} sets
              </p>
              <div className="admin-pagination" style={{ margin: 0 }}>
                <button
                  className="admin-pagination-btn"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
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
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  className="admin-pagination-btn"
                  disabled={page >= pages || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title || 'Chi tiết Community Set'}
        size="modal-xl"
      >
        <div className="modal-body">
          {viewLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="admin-spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Đang tải...</p>
            </div>
          ) : viewItem ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Tiêu đề</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 700, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{viewItem.title || '—'}</div>
                </div>
                <div className="form-group">
                  <label>Người tạo</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{ownerLabel(viewItem.user)}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, minHeight: 58, color: 'var(--text-body)', border: '1px solid var(--border-subtle)' }}>{viewItem.description || 'Không có mô tả'}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trạng thái</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <span className={`admin-badge ${viewItem.isPublic ? 'published' : 'draft'}`}>{viewItem.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Số thẻ</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-body)', border: '1px solid var(--border-subtle)' }}>{viewItem.cards?.length ?? viewItem.cardCount ?? 0}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Tags</label>
                <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>{renderTags(viewItem.tags || [])}</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày tạo</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.createdAt)}</div>
                </div>
                <div className="form-group">
                  <label>Ngày cập nhật</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.updatedAt)}</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>
                  Danh sách thẻ ({viewItem.cards?.length ?? 0})
                </label>
                {viewItem.cards && viewItem.cards.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 6 }}>
                    {viewItem.cards.map((card, idx) => (
                      <div
                        key={card._id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: cardImage(card) ? 'minmax(0, 1fr) 140px' : 'minmax(0, 1fr)',
                          minHeight: 124,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: '4px solid #14b8a6',
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <div style={{ padding: '16px 18px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 850, color: 'var(--text-heading)' }}>Thẻ #{idx + 1}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span className="admin-badge" style={{ fontSize: '0.68rem' }}>Order {card.order ?? idx + 1}</span>
                              <span className="admin-badge draft" style={{ fontSize: '0.68rem' }}>Độ khó {card.difficulty ?? 0}/5</span>
                              {card.nextReviewAt && <span className="admin-badge draft" style={{ fontSize: '0.68rem' }}>Ôn {formatDate(card.nextReviewAt)}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>Mặt trước</div>
                              <div style={{ fontWeight: 800, color: 'var(--text-heading)', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.45 }}>{cardFront(card)}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>Mặt sau</div>
                              <div style={{ fontSize: '0.95rem', color: 'var(--text-body)', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.45 }}>{cardBack(card)}</div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginTop: 10 }}>
                            {card.pronunciation && <div style={{ fontSize: '0.82rem', color: '#0f766e', fontStyle: 'italic', wordBreak: 'break-word' }}><strong>Phát âm:</strong> {card.pronunciation}</div>}
                            {card.example && <div style={{ fontSize: '0.84rem', color: 'var(--text-body)', wordBreak: 'break-word' }}><strong>Ví dụ:</strong> {card.example}</div>}
                            {card.note && <div style={{ fontSize: '0.84rem', color: 'var(--text-body)', wordBreak: 'break-word' }}><strong>Ghi chú:</strong> {card.note}</div>}
                            {card.collocation && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}><strong>Cụm từ:</strong> {card.collocation}</div>}
                            {card.relatedWords && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}><strong>Từ liên quan:</strong> {card.relatedWords}</div>}
                          </div>
                        </div>
                        {cardImage(card) && (
                          <div style={{ minHeight: 124, background: 'var(--bg-soft)', borderLeft: '1px solid var(--border-subtle)' }}>
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
            </>
          ) : null}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setViewItem(null)}>Đóng</button>
        </div>
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} item={deleteItem} />
    </div>
  );
}
