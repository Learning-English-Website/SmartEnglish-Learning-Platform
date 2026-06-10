import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { notificationService } from '../../services/notificationService';
import { toast } from 'react-hot-toast';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { setUnreadCount } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 100 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('[NotificationsPage] Failed to load:', err);
      toast.error('Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Đã đánh dấu đã đọc');
    } catch (err) {
      console.error('[NotificationsPage] markAsRead failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu đọc tất cả');
    } catch (err) {
      console.error('[NotificationsPage] markAllRead failed:', err);
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
      toast.success('Đã xóa thông báo');
    } catch (err) {
      console.error('[NotificationsPage] delete failed:', err);
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
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadList = notifications.filter(n => !n.read);

  return (
    <div className="notif-page-container">
      {/* Breadcrumb / Header */}
      <div className="notif-page-header">
        <div className="notif-header-left">
          <button className="notif-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="notif-page-title">Thông báo</h1>
            <p className="notif-page-subtitle">
              Bạn có {unreadList.length} thông báo chưa đọc
            </p>
          </div>
        </div>
        {unreadList.length > 0 && (
          <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
            <CheckCheck size={16} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Content */}
      <div className="notif-page-content">
        {loading ? (
          <div className="notif-loading-state">
            <div className="notif-spinner" />
            <span>Đang tải thông báo...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon-wrap">
              <Bell size={48} />
            </div>
            <h3>Hộp thư của bạn trống</h3>
            <p>Khi có hoạt động hay nhắc nhở học tập, thông báo sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="notif-list">
            <AnimatePresence>
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  className={`notif-card ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => {
                    if (notif.actionUrl) {
                      if (notif.actionUrl.startsWith('http')) {
                        window.open(notif.actionUrl, '_blank');
                      } else {
                        navigate(notif.actionUrl);
                      }
                    }
                  }}
                  style={{ cursor: notif.actionUrl ? 'pointer' : 'default' }}
                >
                  <div className="notif-card-main">
                    {/* Visual Badge Icon */}
                    <div className="notif-badge-icon">
                      {getIcon(notif.type)}
                    </div>

                    {/* Text Details */}
                    <div className="notif-card-details">
                      <div className="notif-card-title-row">
                        <h3 className="notif-card-title">{notif.title}</h3>
                        {!notif.read && <span className="notif-unread-dot" />}
                      </div>
                      {notif.body && <p className="notif-card-body">{notif.body}</p>}
                      <span className="notif-card-time">
                        <Calendar size={12} />
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Action Bar */}
                    <div className="notif-card-actions" onClick={e => e.stopPropagation()}>
                      {notif.actionUrl && (
                        <button
                          className="notif-action-btn"
                          title="Chi tiết"
                          onClick={() => {
                            if (notif.actionUrl.startsWith('http')) {
                              window.open(notif.actionUrl, '_blank');
                            } else {
                              navigate(notif.actionUrl);
                            }
                          }}
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                      {!notif.read && (
                        <button
                          className="notif-action-btn check"
                          title="Đọc"
                          onClick={e => handleMarkRead(e, notif._id)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="notif-action-btn trash"
                        title="Xóa"
                        onClick={e => handleDelete(e, notif._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
