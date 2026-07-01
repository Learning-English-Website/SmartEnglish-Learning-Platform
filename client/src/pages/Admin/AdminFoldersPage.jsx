import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Trash2, Eye, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
            Bạn có chắc muốn xóa folder này?
          </p>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-heading)', wordBreak: 'break-word' }}>{title}</p>
          <div className="delete-confirm-warning">Folder và các sets bên trong sẽ bị xóa vĩnh viễn.</div>
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

export default function AdminFoldersPage() {
  const [folders, setFolders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const res = await adminService.getAllFolders(params);
      const data = res.data;
      setFolders(data.folders || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadData(1); }, [loadData]);

  const handleView = async (item) => {
    setViewLoading(true);
    setViewItem(item);
    try {
      const res = await adminService.getFolder(item._id);
      setViewItem(res.data);
    } catch {
      toast.error('Không thể tải chi tiết folder');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteFolder(deleteItem._id);
      toast.success('Đã xóa folder');
      setDeleteItem(null);
      loadData(page);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Xóa thất bại');
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
    if (!user) return '—';
    if (user.email && user.username) return `${user.username} (${user.email})`;
    return user.username || user.email || '—';
  };

  const renderTags = (tags = []) => {
    if (!tags.length) return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Chưa có nhãn</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {tags.map((tag, idx) => {
          const tagName = tag?.name || tag;
          const tagColor = tag?.color || '#6366f1';
          return (
            <span
              key={tag?._id || tagName || idx}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.7rem',
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

  if (loading && !folders.length) return (
    <div className="admin-page-loading">
      <div className="admin-spinner" />
      <p>Đang tải...</p>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Quản lý Folders</h2>
          <p>{total} folders</p>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40, minWidth: 280 }}
          />
        </div>
      </div>

      {folders.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><FolderOpen size={48} /></div>
          <h3>Chưa có Folder nào</h3>
          <p>{search ? 'Không tìm thấy folder phù hợp' : 'Chưa có folder nào được tạo'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Folder</th>
                  <th>Mô tả</th>
                  <th>Chủ sở hữu</th>
                  <th>Số Sets</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {folders.map((f, i) => {
                  const setsCount = f.sets?.length ?? f.setCount ?? 0;
                  return (
                    <tr key={f._id}>
                      <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                      <td className="admin-td-title" title={f.name}>{f.name}</td>
                      <td className="admin-td-muted" title={f.description || '—'}>{f.description || '—'}</td>
                      <td className="admin-td-muted">
                        {f.user ? (
                          <span title={f.user.email}>{f.user.username || f.user.email}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="admin-badge beginner" style={{ fontSize: '0.75rem' }}>{setsCount} sets</span>
                      </td>
                      <td className="admin-td-muted">{formatDate(f.createdAt)}</td>
                      <td className="admin-td-actions">
                        <button className="btn-action" onClick={() => handleView(f)}><Eye size={14} /></button>
                        <button className="btn-action danger" onClick={() => setDeleteItem(f)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* View Modal */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name || 'Chi tiết Folder'}
      >
        <div className="modal-body">
          {viewLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="admin-spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Đang tải...</p>
            </div>
          ) : viewItem ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên thư mục</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 700, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{viewItem.name || '—'}</div>
                </div>
                <div className="form-group">
                  <label>Chủ sở hữu</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontWeight: 600, color: 'var(--text-heading)', border: '1px solid var(--border-subtle)' }}>{ownerLabel(viewItem.user)}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Thư mục cha</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-body)', border: '1px solid var(--border-subtle)' }}>{viewItem.parent?.name || 'Không có'}</div>
                </div>
                <div className="form-group">
                  <label>ID thư mục</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>{viewItem._id || '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày tạo</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-body)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.createdAt)}</div>
                </div>
                <div className="form-group">
                  <label>Ngày cập nhật</label>
                  <div style={{ padding: '10px 16px', background: 'var(--bg-page)', borderRadius: 10, color: 'var(--text-body)', border: '1px solid var(--border-subtle)' }}>{formatDateTime(viewItem.updatedAt)}</div>
                </div>
              </div>
              <div className="form-group">
                <label>Số lượng Sets ({viewItem.sets?.length ?? 0})</label>
                {viewItem.sets && viewItem.sets.length > 0 ? (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                    {viewItem.sets.map((s, idx) => (
                      <div
                        key={s._id || idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          gap: 14,
                          padding: '12px 14px',
                          background: 'rgba(99, 102, 241, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 750, color: 'var(--text-heading)', fontSize: '0.92rem', wordBreak: 'break-word' }}>
                            {s.title || s.name || `Set ${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, wordBreak: 'break-word' }}>
                            {s.description || 'Không có mô tả'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span>Chủ sở hữu: {ownerLabel(s.user)}</span>
                            <span>Số thẻ: {s.cardCount ?? 0}</span>
                            <span>Cập nhật: {formatDate(s.updatedAt)}</span>
                          </div>
                          {renderTags(s.tags || [])}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, whiteSpace: 'nowrap' }}>
                          {s.isPublic !== undefined && (
                            <span className={`admin-badge ${s.isPublic ? 'published' : 'draft'}`}>
                              {s.isPublic ? 'Public' : 'Private'}
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Folder này chưa có sets nào.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setViewItem(null)}>Đóng</button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title={deleteItem?.name}
      />
    </div>
  );
}
