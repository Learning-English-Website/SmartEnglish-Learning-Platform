import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { CreditCard, Search, ChevronLeft, ChevronRight, X, Check, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminPage.css';

const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  pending: { label: 'Chờ thanh toán', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
  completed: { label: 'Thành công', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
  failed: { label: 'Thất bại', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  refunded: { label: 'Đã hoàn tiền', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)' }
};

const METHOD_CONFIG = {
  momo: { label: 'MoMo', color: '#a81c64', bg: 'rgba(168, 28, 100, 0.1)', border: 'rgba(168, 28, 100, 0.2)' },
  payos: { label: 'PayOS', color: '#0052cc', bg: 'rgba(0, 82, 204, 0.1)', border: 'rgba(0, 82, 204, 0.2)' }
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      {s.label}
    </span>
  );
}

function MethodBadge({ method }) {
  const m = METHOD_CONFIG[method] || { label: method, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, textTransform: 'uppercase', letterSpacing: '0.2px' }}>
      {m.label}
    </span>
  );
}

function EditStatusModal({ isOpen, onClose, order, onConfirm }) {
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) setStatus(order.status || 'pending');
  }, [order]);

  if (!isOpen || !order) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(order.orderId, status);
      toast.success('Đã cập nhật trạng thái đơn hàng');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Cập nhật trạng thái thủ công</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Thay đổi trạng thái cho đơn hàng <strong style={{ color: 'var(--text-heading)' }}>{order.orderId}</strong> của người dùng <strong>{order.user?.username}</strong>.
          </p>

          {status === 'completed' && order.status !== 'completed' && (
            <div className="delete-confirm-warning" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1rem' }}>
              ⚠️ Việc chuyển sang trạng thái <strong>Thành công</strong> sẽ tự động nâng cấp Premium (30 ngày) cho tài khoản học sinh tương ứng.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['pending', 'completed', 'failed', 'refunded'].map(s => {
              const cfg = STATUS_CONFIG[s];
              const isSelected = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', borderRadius: '10px',
                    border: `2px solid ${isSelected ? cfg.color : 'var(--border-subtle)'}`,
                    background: isSelected ? cfg.bg : 'var(--bg-page)',
                    color: isSelected ? cfg.color : 'var(--text-body)',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    transition: 'all 0.2s', textTransform: 'uppercase'
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-primary-admin" disabled={loading || status === order.status} onClick={handleConfirm}>
            {loading ? 'Đang cập nhật...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [syncingId, setSyncingId] = useState(null);
  const [editOrder, setEditOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getOrders({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        method: methodFilter || undefined
      });
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
    } catch {
      toast.error('Không thể tải danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, methodFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSyncPayment = async (orderId) => {
    setSyncingId(orderId);
    try {
      const res = await adminService.verifyOrderPayment(orderId);
      const data = res.data;
      if (data.valid) {
        toast.success(`Giao dịch thành công! Trạng thái: ${data.status.toUpperCase()}`);
      } else {
        toast.error(`Cổng thanh toán phản hồi: Trạng thái ${data.status.toUpperCase()}`);
      }
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Đồng bộ thất bại');
    } finally {
      setSyncingId(null);
    }
  };

  const handleConfirmStatusChange = async (orderId, newStatus) => {
    await adminService.updateOrderStatusManually(orderId, newStatus);
    loadOrders();
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
          Tra cứu thông tin đơn hàng, đồng bộ trạng thái giao dịch từ gateway và phê duyệt đơn hàng thủ công.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap blue">
            <CreditCard size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Tổng đơn hàng</span>
            <h3 className="admin-stat-value">{total}</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap amber">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Cổng kết nối</span>
            <h3 className="admin-stat-value" style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '5px' }}>MOMO / PAYOS</h3>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap green">
            <Check size={20} strokeWidth={2.5} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Trạng thái cổng</span>
            <h3 className="admin-stat-value" style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '5px', color: '#10b981' }}>HOẠT ĐỘNG</h3>
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
              placeholder="Tìm theo Mã đơn, Mã GD, User..."
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
            value={methodFilter}
            onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
            style={{ minWidth: 150 }}
          >
            <option value="">Tất cả cổng thanh toán</option>
            <option value="momo">MoMo</option>
            <option value="payos">PayOS</option>
          </select>

          <select
            className="form-control-admin"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ minWidth: 150 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="completed">Thành công</option>
            <option value="failed">Thất bại</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="admin-page-loading">
          <div className="admin-spinner" />
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><CreditCard size={48} style={{ opacity: 0.4 }} /></div>
          <h3>Không tìm thấy đơn hàng</h3>
          <p>Không có đơn hàng nào khớp với điều kiện tìm kiếm</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã đơn hàng (Order ID)</th>
                  <th>Học viên</th>
                  <th>Cổng</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Mã GD (Trans ID)</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={o._id}>
                    <td className="admin-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div className="admin-td-title" style={{ maxWidth: 160, fontWeight: 700, fontFamily: 'monospace' }} title="Click để copy" onClick={() => {
                        navigator.clipboard.writeText(o.orderId);
                        toast.success('Đã copy mã đơn hàng');
                      }}>
                        {o.orderId}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {o.user?.avatar && (
                            <img 
                              src={o.user.avatar} 
                              alt="avatar" 
                              onError={(e) => { e.target.style.display = 'none'; }} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }} 
                            />
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6366f1', zIndex: 1 }}>
                            {o.user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <span className="admin-td-title" style={{ display: 'block', maxWidth: 120 }}>{o.user?.username || '—'}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{o.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><MethodBadge method={o.method} /></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{formatPrice(o.amount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="admin-td-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.transId || '—'}</td>
                    <td className="admin-td-muted">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="admin-td-actions">
                      <button
                        className="btn-action"
                        onClick={() => handleSyncPayment(o.orderId)}
                        disabled={syncingId === o.orderId}
                        title="Đồng bộ cổng thanh toán"
                        style={{ color: '#6366f1' }}
                      >
                        <RefreshCw size={14} className={syncingId === o.orderId ? 'admin-spin' : ''} />
                      </button>
                      <button
                        className="btn-action"
                        onClick={() => setEditOrder(o)}
                        title="Cập nhật trạng thái thủ công"
                        style={{ color: '#10b981' }}
                      >
                        <ShieldCheck size={14} />
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

      <EditStatusModal
        isOpen={!!editOrder}
        onClose={() => setEditOrder(null)}
        order={editOrder}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
