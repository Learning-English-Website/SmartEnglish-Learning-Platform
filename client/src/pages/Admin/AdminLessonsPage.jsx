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
          <div className="delete-confirm-warning">⚠️ Tất cả Challenges trong Lesson này sẽ bị xóa theo.</div>
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

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterUnit, setFilterUnit] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [form, setForm] = useState({
    unit: '', title: '', subtitle: '', order: 0,
    xpReward: 5, estimatedMinutes: 5, grammarFocus: '', vocabFocus: '', type: 'challenge',
  });

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10, paginate: 'true' };
      if (filterUnit) params.unitId = filterUnit;
      if (search.trim()) params.search = search.trim();

      const [lessonsRes, unitsRes] = await Promise.all([
        adminService.getLessons(params),
        adminService.getUnits(),
      ]);
      const lData = lessonsRes.data;
      setLessons(lData.lessons || []);
      setTotal(lData.total || 0);
      setPage(lData.page || 1);
      setPages(lData.pages || 1);
      setUnits(unitsRes.data || []);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [filterUnit, search]);

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
    setForm({ unit: units[0]?._id || '', title: '', subtitle: '', order: 0, xpReward: 5, estimatedMinutes: 5, grammarFocus: '', vocabFocus: '', type: 'challenge' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      unit: item.unit?._id || item.unit || '',
      title: item.title || '', subtitle: item.subtitle || '',
      order: item.order || 0, xpReward: item.xpReward || 5,
      estimatedMinutes: item.estimatedMinutes || 5,
      grammarFocus: (item.grammarFocus || []).join(', '),
      vocabFocus: (item.vocabFocus || []).join(', '),
      type: item.type || 'challenge',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.unit) { toast.error('Vui lòng chọn Unit'); return; }
    if (!form.title.trim()) { toast.error('Vui lòng nhập tên Lesson'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        grammarFocus: form.grammarFocus ? form.grammarFocus.split(',').map(s => s.trim()).filter(Boolean) : [],
        vocabFocus: form.vocabFocus ? form.vocabFocus.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editItem) { await adminService.updateLesson(editItem._id, payload); toast.success('Cập nhật thành công'); }
      else { await adminService.createLesson(payload); toast.success('Tạo Lesson thành công'); }
      setShowModal(false);
      loadData(editItem ? page : 1);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await adminService.deleteLesson(deleteItem._id); toast.success('Đã xóa Lesson'); setDeleteItem(null); loadData(page); }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  if (loading) return <div className="admin-page-loading"><div className="admin-spinner" /><p>Đang tải...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Danh sách Lessons</h2>
          <p>{total} lessons</p>
        </div>
        <button className="btn-primary-admin" onClick={openCreate} disabled={units.length === 0}><Plus size={15} /> Thêm Lesson</button>
      </div>

      <div className="admin-filter-bar">
        <select value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setPage(1); }}>
          <option value="">Tất cả Units</option>
          {units.map(u => <option key={u._id} value={u._id}>{u.title} ({u.course?.title})</option>)}
        </select>

        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm Lesson..."
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px' }}>Tìm</button>
        </form>
      </div>

      {lessons.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📖</div>
          <h3>Chưa có Lesson nào</h3>
          <p>{search || filterUnit ? 'Không tìm thấy kết quả phù hợp' : 'Tạo Lesson đầu tiên cho Unit của bạn'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Lesson</th>
                  <th>Unit</th>
                  <th>Loại</th>
                  <th>XP</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l, i) => (
                  <tr key={l._id}>
                    <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                    <td className="admin-td-title">{l.title}</td>
                    <td className="admin-td-muted">{l.unit?.title || '—'}</td>
                    <td><span className="admin-badge">{l.type || 'challenge'}</span></td>
                    <td>{l.xpReward}</td>
                    <td className="admin-td-actions">
                      <button className="btn-action" onClick={() => openEdit(l)}><Edit2 size={14} /></button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(l)}><Trash2 size={14} /></button>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa Lesson' : 'Thêm Lesson mới'}>
        <div className="modal-body">
          <div className="form-group">
            <label>Unit *</label>
            <select className="form-control-admin" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="">— Chọn Unit —</option>
              {units.map(u => <option key={u._id} value={u._id}>{u.title} ({u.course?.title})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tên Lesson *</label>
              <input className="form-control-admin" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ví dụ: Hello & Goodbye" />
            </div>
            <div className="form-group">
              <label>Phụ đề</label>
              <input className="form-control-admin" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="ví dụ: Basic greetings" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Loại</label>
              <select className="form-control-admin" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="challenge">Challenge</option>
                <option value="practice">Practice</option>
              </select>
            </div>
            <div className="form-group">
              <label>Thứ tự</label>
              <input type="number" className="form-control-admin" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>XP Reward</label>
              <input type="number" className="form-control-admin" value={form.xpReward} onChange={e => setForm(f => ({ ...f, xpReward: parseInt(e.target.value) || 0 }))} min={0} />
            </div>
            <div className="form-group">
              <label>Thời gian ước tính (phút)</label>
              <input type="number" className="form-control-admin" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: parseInt(e.target.value) || 5 }))} min={1} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Grammar Focus</label>
              <input className="form-control-admin" value={form.grammarFocus} onChange={e => setForm(f => ({ ...f, grammarFocus: e.target.value }))} placeholder="verb to be, pronouns (cách nhau bởi dấu phẩy)" />
            </div>
            <div className="form-group">
              <label>Vocab Focus</label>
              <input className="form-control-admin" value={form.vocabFocus} onChange={e => setForm(f => ({ ...f, vocabFocus: e.target.value }))} placeholder="hello, goodbye, thank you" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn-primary-admin" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo Lesson'}</button>
        </div>
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title={deleteItem?.title} />
    </div>
  );
}
