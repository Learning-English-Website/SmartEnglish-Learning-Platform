import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Trash2, Shield, ChevronLeft, ChevronRight, X, Check, Star } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import './AdminPage.css';

const ROLES = ['admin', 'student', 'teacher', 'cskh'];
const ROLE_COLORS = {
  admin: { bg: 'rgba(102, 126, 234, 0.1)', color: '#667eea', border: 'rgba(102, 126, 234, 0.2)' },
  student: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  teacher: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.2)' },
  cskh: { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.2)' },
};
const PREMIUM_COLORS = {
  premium: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  trial: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
  free: { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)' },
};

const PAGE_SIZE = 10;

function RoleBadge({ role, onClick }) {
  const s = ROLE_COLORS[role] || ROLE_COLORS.student;
  return (
    <span
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.2px' }}
      title={onClick ? 'Nhấn để đổi vai trò' : undefined}
    >
      {role}
    </span>
  );
}

function PremiumBadge({ premium }) {
  const type = premium === true || premium === 'premium' ? 'premium' : premium === 'trial' ? 'trial' : 'free';
  const s = PREMIUM_COLORS[type];
  const label = type === 'premium' ? 'Premium' : type === 'trial' ? 'Trial' : 'Free';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      {label}
    </span>
  );
}

function VerifiedBadge({ isVerified }) {
  return isVerified ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.15)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      <Check size={11} strokeWidth={3} /> Active
    </span>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.15)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      Pending
    </span>
  );
}

function UserAvatar({ avatar, username }) {
  const [imgFailed, setImgFailed] = useState(false);
  
  if (avatar && !imgFailed) {
    return (
      <img 
        src={avatar} 
        alt={username} 
        onError={() => setImgFailed(true)} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
    );
  }
  
  const initial = username ? username.charAt(0).toUpperCase() : 'U';
  return (
    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#6366f1' }}>
      {initial}
    </span>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, user }) {
  const [loading, setLoading] = useState(false);
  if (!isOpen || !user) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Xác nhận xóa người dùng</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bạn có chắc muốn xóa người dùng <strong style={{ color: 'var(--text-heading)' }}>{user.username || user.email}</strong>?
          </p>
          <div className="delete-confirm-warning">
            ⚠️ Hành động này không thể hoàn tác. Toàn bộ dữ liệu liên quan đến tài khoản này sẽ bị mất.
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

function RoleModal({ isOpen, onClose, user, onSave }) {
  const { user: currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setSelectedRole(user.role || 'student');
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    if (!selectedRole || selectedRole === user.role) { onClose(); return; }
    setSaving(true);
    await onSave(user._id, selectedRole);
    setSaving(false);
    onClose();
  };

  const filteredRoles = currentUser?.role === 'cskh'
    ? ROLES.filter(r => r !== 'admin')
    : ROLES;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Đổi vai trò</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Chọn vai trò mới cho <strong style={{ color: 'var(--text-heading)' }}>{user.username || user.email}</strong>:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredRoles.map(role => {
              const s = ROLE_COLORS[role];
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 18px', borderRadius: '12px',
                    border: `2px solid ${isSelected ? s.color : 'var(--border-subtle)'}`,
                    background: isSelected ? s.bg : 'var(--bg-page)',
                    color: isSelected ? s.color : 'var(--text-body)',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                    transition: 'all 0.2s', textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {isSelected && <Check size={16} />}
                  {role}
                </button>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-primary-admin" disabled={saving || selectedRole === user.role} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu vai trò'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PremiumModal({ isOpen, onClose, user, onSave }) {
  const [premiumType, setPremiumType] = useState('free');
  const [durationDays, setDurationDays] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPremiumType(user.premium || 'free');
      setDurationDays(30);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(user._id, premiumType, Number(durationDays));
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Quản lý Premium</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Thiết lập gói Premium cho học viên: <strong style={{ color: 'var(--text-heading)' }}>{user.username || user.email}</strong>
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Loại gói</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['free', 'trial', 'premium'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPremiumType(type)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: `2px solid ${premiumType === type ? '#f59e0b' : 'var(--border-subtle)'}`,
                    background: premiumType === type ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-page)',
                    color: premiumType === type ? '#f59e0b' : 'var(--text-body)',
                    fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'premium' ? 'Premium' : type === 'trial' ? 'Trial (7d)' : 'Free'}
                </button>
              ))}
            </div>
          </div>

          {premiumType === 'premium' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Thời hạn Premium (ngày)</label>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[30, 90, 365, -1].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: '6px',
                      border: `1px solid ${durationDays === days ? '#f59e0b' : 'var(--border-subtle)'}`,
                      background: durationDays === days ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-page)',
                      color: durationDays === days ? '#f59e0b' : 'var(--text-muted)',
                      fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                  >
                    {days === -1 ? 'Vĩnh viễn' : `${days} ngày`}
                  </button>
                ))}
              </div>

              {durationDays !== -1 && (
                <input
                  type="number"
                  className="form-control-admin"
                  value={durationDays}
                  onChange={e => setDurationDays(Math.max(1, Number(e.target.value)))}
                  placeholder="Nhập số ngày..."
                  min="1"
                  style={{ width: '100%' }}
                />
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-primary-admin" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} disabled={saving} onClick={handleSave}>
            {saving ? 'Đang cập nhật...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteUser, setDeleteUser] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const [premiumUser, setPremiumUser] = useState(null);

  const loadUsers = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        page, pageSize: PAGE_SIZE,
        search: searchInput.trim() || undefined,
        role: roleFilter || undefined,
        ...params,
      });
      const d = res.data;
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setPremiumCount(d.premiumUsers || 0);
      setVerifiedCount(d.verifiedUsers || 0);
      setPage(d.page || 1);
    } catch {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, searchInput, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDelete = async () => {
    try {
      await adminService.deleteUser(deleteUser._id);
      toast.success('Đã xóa người dùng');
      setDeleteUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Xóa thất bại');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      toast.success('Đã cập nhật vai trò');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Cập nhật thất bại');
    }
  };

  const handleChangePremium = async (userId, premiumType, durationDays) => {
    try {
      await adminService.updateUserPremium(userId, premiumType, durationDays);
      toast.success('Đã cập nhật gói Premium');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Cập nhật Premium thất bại');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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

  if (loading && users.length === 0) {
    return (
      <div className="admin-page-loading">
        <div className="admin-spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Xem danh sách học viên, quản lý tài khoản và thiết lập kích hoạt gói Premium thủ công.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap blue">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Tổng học viên</span>
            <h3 className="admin-stat-value">{total}</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap amber">
            <Star size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Học viên Premium</span>
            <h3 className="admin-stat-value">{premiumCount}</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap green">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Đã xác minh</span>
            <h3 className="admin-stat-value">{verifiedCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-control-admin"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo username hoặc email..."
              style={{ paddingLeft: 38 }}
            />
          </div>
          <button type="submit" className="btn-primary-admin" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
            Tìm kiếm
          </button>
        </form>

        <select
          className="form-control-admin"
          value={roleFilter}
          onChange={e => handleRoleFilterChange(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><Users size={48} style={{ opacity: 0.4 }} /></div>
          <h3>Không tìm thấy người dùng</h3>
          <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Premium</th>
                  <th>Verified</th>
                  <th>XP</th>
                  <th>Level</th>
                  <th>Tham gia</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id}>
                    <td className="admin-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <UserAvatar avatar={u.avatar} username={u.username} />
                        </div>
                        <span className="admin-td-title" style={{ maxWidth: 140 }}>{u.username || '—'}</span>
                      </div>
                    </td>
                    <td className="admin-td-muted" style={{ maxWidth: 180 }}>{u.email}</td>
                    <td>
                      <RoleBadge
                        role={u.role}
                        onClick={currentUser?.role === 'cskh' ? undefined : () => {
                          if (u.role === 'admin' && currentUser?.role === 'cskh') {
                            toast.error('Bạn không có quyền chỉnh sửa tài khoản Admin');
                            return;
                          }
                          setRoleUser(u);
                        }}
                      />
                    </td>
                    <td><PremiumBadge premium={u.premium} /></td>
                    <td><VerifiedBadge isVerified={u.isVerified} /></td>
                    <td style={{ color: 'var(--text-body)', fontWeight: 600, fontSize: '0.85rem' }}>{u.gamification?.xp ?? 0}</td>
                    <td style={{ color: 'var(--text-body)', fontWeight: 600, fontSize: '0.85rem' }}>{u.gamification?.level ?? 1}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(u.createdAt)}</td>
                    <td className="admin-td-actions">
                      {currentUser?.role !== 'cskh' && (
                        <button
                          className="btn-action"
                          onClick={() => setRoleUser(u)}
                          title="Đổi vai trò"
                        >
                          <Shield size={14} />
                        </button>
                      )}

                      <button
                        className="btn-action"
                        onClick={() => {
                          if (u.role === 'admin' && currentUser?.role === 'cskh') {
                            toast.error('Bạn không có quyền chỉnh sửa tài khoản Admin');
                            return;
                          }
                          setPremiumUser(u);
                        }}
                        title="Quản lý Premium"
                        style={{
                          color: '#f59e0b',
                          opacity: (u.role === 'admin' && currentUser?.role === 'cskh') ? 0.5 : 1,
                          cursor: (u.role === 'admin' && currentUser?.role === 'cskh') ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Star size={14} />
                      </button>

                      {currentUser?.role !== 'cskh' && (
                        <button className="btn-action danger" onClick={() => setDeleteUser(u)} title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      )}
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

      {/* Modals */}
      <DeleteModal isOpen={!!deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} user={deleteUser} />
      {currentUser?.role !== 'cskh' && (
        <RoleModal isOpen={!!roleUser} onClose={() => setRoleUser(null)} user={roleUser} onSave={handleChangeRole} />
      )}
      <PremiumModal isOpen={!!premiumUser} onClose={() => setPremiumUser(null)} user={premiumUser} onSave={handleChangePremium} />
    </div>
  );
}
