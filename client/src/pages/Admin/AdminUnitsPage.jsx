import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

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
            ⚠️ Tất cả Lessons và Challenges trong Unit này sẽ bị xóa theo.
          </div>
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

export default function AdminUnitsPage() {
  const [units, setUnits] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [form, setForm] = useState({
    course: '', title: '', description: '', summary: '',
    order: 0, xpReward: 10, isLockedDefault: true,
  });

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10, paginate: 'true' };
      if (filterCourse) params.courseId = filterCourse;
      if (search.trim()) params.search = search.trim();

      const [unitsRes, coursesRes] = await Promise.all([
        adminService.getUnits(params),
        adminService.getCourses(),
      ]);
      const uData = unitsRes.data;
      setUnits(uData.units || []);
      setTotal(uData.total || 0);
      setPage(uData.page || 1);
      setPages(uData.pages || 1);
      setCourses(coursesRes.data || []);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [filterCourse, search]);

  useEffect(() => { loadData(1); }, [loadData]);

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
    setForm({ course: courses[0]?._id || '', title: '', description: '', summary: '', order: 0, xpReward: 10, isLockedDefault: true });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      course: item.course?._id || item.course || '',
      title: item.title || '', description: item.description || '', summary: item.summary || '',
      order: item.order || 0, xpReward: item.xpReward || 10,
      isLockedDefault: item.isLockedDefault ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.course) { toast.error('Vui lòng chọn khóa học'); return; }
    if (!form.title.trim()) { toast.error('Vui lòng nhập tên Unit'); return; }
    setSaving(true);
    try {
      if (editItem) { await adminService.updateUnit(editItem._id, form); toast.success('Cập nhật thành công'); }
      else { await adminService.createUnit(form); toast.success('Tạo Unit thành công'); }
      setShowModal(false);
      loadData(editItem ? page : 1);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await adminService.deleteUnit(deleteItem._id); toast.success('Đã xóa Unit'); setDeleteItem(null); loadData(page); }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  if (loading) return <div className="admin-page-loading"><div className="admin-spinner" /><p>Đang tải...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Danh sách Units</h2>
          <p>{total} units</p>
        </div>
        <button className="btn-primary-admin" onClick={openCreate} disabled={courses.length === 0}><Plus size={15} /> Thêm Unit</button>
      </div>

      <div className="admin-filter-bar">
        <select value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setPage(1); }}>
          <option value="">Tất cả khóa học</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>

        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm Unit..."
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px' }}>Tìm</button>
        </form>
      </div>

      {units.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📂</div>
          <h3>Chưa có Unit nào</h3>
          <p>{search || filterCourse ? 'Không tìm thấy kết quả phù hợp' : 'Tạo Unit đầu tiên cho khóa học của bạn'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Unit</th>
                  <th>Khóa học</th>
                  <th>XP</th>
                  <th>Thứ tự</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={u._id}>
                    <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                    <td className="admin-td-title">{u.title}</td>
                    <td className="admin-td-muted">{u.course?.title || '—'}</td>
                    <td>{u.xpReward}</td>
                    <td>{u.order}</td>
                    <td><span className={`admin-badge ${u.isLockedDefault ? 'locked' : 'unlocked'}`}>{u.isLockedDefault ? '🔒 Khóa' : '🔓 Mở'}</span></td>
                    <td className="admin-td-actions">
                      <button className="btn-action" onClick={() => openEdit(u)} title="Sửa"><Edit2 size={14} /></button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(u)} title="Xóa"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa Unit' : 'Thêm Unit mới'}>
        <div className="modal-body">
          <div className="form-group">
            <label>Khóa học *</label>
            <select className="form-control-admin" value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
              <option value="">— Chọn khóa học —</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tên Unit *</label>
            <input className="form-control-admin" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ví dụ: Numbers & Counting" />
          </div>
          <div className="form-group">
            <label>Mô tả</label>
            <textarea className="form-control-admin" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Thứ tự</label>
              <input type="number" className="form-control-admin" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
            <div className="form-group">
              <label>XP Reward</label>
              <input type="number" className="form-control-admin" value={form.xpReward} onChange={e => setForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
          </div>
          <div className="form-group">
            <label className="admin-checkbox-label">
              <input type="checkbox" checked={form.isLockedDefault} onChange={e => setForm(f => ({ ...f, isLockedDefault: e.target.checked }))} />
              Mặc định khóa (user phải hoàn thành unit trước)
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn-primary-admin" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo Unit'}</button>
        </div>
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title={deleteItem?.title} />
    </div>
  );
}
