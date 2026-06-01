import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { notificationService } from '../../services/notificationService';

export default function NotificationBell() {
  const { unreadCount, setUnreadCount } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    loadNotifications();
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 20 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('[NotificationBell] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationBell] markAsRead failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] markAllRead failed:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      const notif = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[NotificationBell] delete failed:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'streak': return '🔥';
      case 'reminder': return '⏰';
      case 'quest': return '🎯';
      case 'leaderboard': return '⚡';
      case 'friend': return '👤';
      default: return '🔔';
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin}p trước`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h trước`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Bell Icon */}
        <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,91,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <Bell size={20} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: '18px',
                height: '18px',
                borderRadius: '999px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #fff',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '380px',
              maxWidth: '90vw',
              background: '#fff',
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
              zIndex: 9990,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="#635bff" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e1b4b' }}>
                  Thông báo
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px', borderRadius: '8px', color: '#635bff',
                      display: 'flex', alignItems: 'center',
                    }}
                    title="Đọc tất cả"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px', borderRadius: '8px', color: '#94a3b8',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Đang tải...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <Bell size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Không có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px 18px',
                      borderBottom: idx < notifications.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                      background: notif.read ? 'transparent' : 'rgba(99,91,255,0.03)',
                      cursor: notif.actionUrl ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => { if (notif.actionUrl) window.location.href = notif.actionUrl; }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,91,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(99,91,255,0.03)'}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '12px',
                      background: 'rgba(99,91,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>
                      {getIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 2px',
                        fontWeight: notif.read ? 500 : 700,
                        fontSize: '0.875rem',
                        color: notif.read ? '#64748b' : '#1e1b4b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p style={{
                          margin: 0,
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {notif.body}
                        </p>
                      )}
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: '0.72rem',
                        color: '#cbd5e1',
                      }}>
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {notif.actionUrl && (
                        <button style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', borderRadius: '6px', color: '#94a3b8',
                          display: 'flex', alignItems: 'center',
                        }} title="Mở">
                          <ExternalLink size={13} />
                        </button>
                      )}
                      {!notif.read && (
                        <button
                          onClick={e => handleMarkRead(e, notif._id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px', borderRadius: '6px', color: '#94a3b8',
                            display: 'flex', alignItems: 'center',
                          }}
                          title="Đánh dấu đã đọc"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={e => handleDelete(e, notif._id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', borderRadius: '6px', color: '#94a3b8',
                          display: 'flex', alignItems: 'center',
                        }}
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    );
}
