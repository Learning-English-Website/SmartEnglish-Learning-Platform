import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import ImageUploader from '../../components/media/ImageUploader';

const LEVELS = ['beginner', 'intermediate', 'advanced'];

// ── Shared Modal ──────────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
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
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bạn có chắc muốn xóa <strong style={{ color: 'var(--text-heading)' }}>{title}</strong>?
          </p>
          <div className="delete-confirm-warning">
            ⚠️ Tất cả Units, Lessons và Challenges trong khóa học này sẽ bị xóa theo.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-danger-admin" disabled={loading} onClick={async () => {
            setLoading(true);
            await onConfirm();
            setLoading(false);
          }}>
            {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [form, setForm] = useState({
    title: '', slug: '', description: '', level: 'beginner', order: 0,
    languageFrom: 'en', languageTo: 'vi', isPublished: false, thumbnailUrl: '',
  });

  const loadCourses = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10, paginate: 'true' };
      if (search.trim()) params.search = search.trim();
      const res = await adminService.getCourses(params);
      const data = res.data;
      setCourses(data.courses || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch { toast.error('Không thể tải danh sách khóa học'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadCourses(1); }, [loadCourses]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
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

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', slug: '', description: '', level: 'beginner', order: 0, languageFrom: 'en', languageTo: 'vi', isPublished: false, thumbnailUrl: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title || '', slug: item.slug || '', description: item.description || '',
      level: item.level || 'beginner', order: item.order || 0,
      languageFrom: item.languageFrom || 'en', languageTo: item.languageTo || 'vi',
      isPublished: item.isPublished || item.isActive || false, thumbnailUrl: item.thumbnailUrl || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Vui lòng nhập tên khóa học'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await adminService.updateCourse(editItem._id, form);
        toast.success('Cập nhật thành công');
      } else {
        await adminService.createCourse(form);
        toast.success('Tạo khóa học thành công');
      }
      setShowModal(false);
      loadCourses(editItem ? page : 1);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteCourse(deleteItem._id);
      toast.success('Đã xóa khóa học');
      setDeleteItem(null);
      loadCourses(page);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  if (loading) return <div className="admin-page-loading"><div className="admin-spinner" /><p>Đang tải...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Danh sách Khóa học</h2>
          <p>{total} khóa học</p>
        </div>
        <button className="btn-primary-admin" onClick={openCreate}><Plus size={15} /> Thêm khóa học</button>
      </div>

      <div className="admin-filter-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm khóa học..."
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px' }}>Tìm</button>
        </form>
      </div>

      {courses.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📚</div>
          <h3>Chưa có khóa học nào</h3>
          <p>{search ? 'Không tìm thấy kết quả phù hợp' : 'Tạo khóa học đầu tiên để bắt đầu'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên khóa học</th>
                  <th>Slug</th>
                  <th>Cấp độ</th>
                  <th>Thứ tự</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr key={c._id}>
                    <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                    <td className="admin-td-title">{c.title}</td>
                    <td className="admin-td-mono">{c.slug}</td>
                    <td><span className={`admin-badge ${c.level}`}>{c.level}</span></td>
                    <td>{c.order}</td>
                    <td><span className={`admin-badge ${c.isPublished || c.isActive ? 'published' : 'draft'}`}>
                      {c.isPublished || c.isActive ? 'Đã xuất bản' : 'Bản nháp'}
                    </span></td>
                    <td className="admin-td-actions">
                      <button className="btn-action" onClick={() => openEdit(c)} title="Sửa"><Edit2 size={14} /></button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(c)} title="Xóa"><Trash2 size={14} /></button>
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
                onClick={() => loadCourses(page - 1)}
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
                    onClick={() => loadCourses(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="admin-pagination-btn"
                disabled={page >= pages || loading}
                onClick={() => loadCourses(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa khóa học' : 'Thêm khóa học mới'}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Tên khóa học *</label>
              <input className="form-control-admin" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ví dụ: Tiếng Anh cơ bản" />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input className="form-control-admin" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-from-title" />
            </div>
          </div>
          <div className="form-group">
            <label>Mô tả</label>
            <textarea className="form-control-admin" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cấp độ</label>
              <select className="form-control-admin" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Thứ tự hiển thị</label>
              <input type="number" className="form-control-admin" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Ngôn ngữ nguồn</label>
              <input className="form-control-admin" value={form.languageFrom} onChange={e => setForm(f => ({ ...f, languageFrom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Ngôn ngữ đích</label>
              <input className="form-control-admin" value={form.languageTo} onChange={e => setForm(f => ({ ...f, languageTo: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>URL hình ảnh (Thumbnail)</label>
            <input className="form-control-admin" value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://..." style={{ marginBottom: '8px' }} />
            <ImageUploader 
              currentUrl={form.thumbnailUrl}
              onUpload={(url) => setForm(f => ({ ...f, thumbnailUrl: url }))}
              onClear={() => setForm(f => ({ ...f, thumbnailUrl: '' }))}
            />
          </div>
          <div className="form-group">
            <label className="admin-checkbox-label">
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
              Xuất bản ngay (hiển thị với người dùng)
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn-primary-admin" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo khóa học'}
          </button>
        </div>
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title={deleteItem?.title} />
    </div>
  );
}
