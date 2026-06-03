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

          {pages > 1 && (
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
              <div className="form-group">
                <label>Mô tả</label>
                <p style={{ color: 'var(--text-body)', margin: 0 }}>{viewItem.description || 'Không có mô tả'}</p>
              </div>
              <div className="form-group">
                <label>Chủ sở hữu</label>
                <p style={{ color: 'var(--text-body)', margin: 0 }}>
                  {viewItem.user ? (
                    <span>{viewItem.user.username || viewItem.user.email}</span>
                  ) : '—'}
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày tạo</label>
                  <p style={{ color: 'var(--text-body)', margin: 0 }}>{formatDate(viewItem.createdAt)}</p>
                </div>
                <div className="form-group">
                  <label>Ngày cập nhật</label>
                  <p style={{ color: 'var(--text-body)', margin: 0 }}>{formatDate(viewItem.updatedAt)}</p>
                </div>
              </div>
              <div className="form-group">
                <label>Số lượng Sets ({viewItem.sets?.length ?? 0})</label>
                {viewItem.sets && viewItem.sets.length > 0 ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    {viewItem.sets.map((s, idx) => (
                      <div
                        key={s._id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'rgba(99, 102, 241, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                            {s.title || s.name || `Set ${idx + 1}`}
                          </div>
                          {s.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {s.description}
                            </div>
                          )}
                        </div>
                        {s.isPublic !== undefined && (
                          <span className={`admin-badge ${s.isPublic ? 'published' : 'draft'}`}>
                            {s.isPublic ? 'Public' : 'Private'}
                          </span>
                        )}
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
