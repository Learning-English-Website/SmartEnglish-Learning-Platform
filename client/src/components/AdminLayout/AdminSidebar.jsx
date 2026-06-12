import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, Layers, FileText, Target, LayoutDashboard,
  Settings, LogOut, ChevronLeft, ChevronRight,
  BookMarked, FolderOpen, Users, Grid3X3, Library,
  MessageSquare, MessageCircle, CreditCard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import axiosClient from '../../api/axiosClient';
import './AdminSidebar.css';

const CONTENT_ITEMS = [
  { path: '/admin/dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={18} /> },
  { path: '/admin/courses', label: 'Khóa học', icon: <BookOpen size={18} /> },
  { path: '/admin/units', label: 'Units', icon: <Layers size={18} /> },
  { path: '/admin/lessons', label: 'Lessons', icon: <FileText size={18} /> },
  { path: '/admin/challenges', label: 'Challenges', icon: <Target size={18} /> },
];

const QUIZLET_ITEMS = [
  { path: '/admin/flashcards', label: 'Flashcard Sets', icon: <BookMarked size={18} /> },
  { path: '/admin/folders', label: 'Folders', icon: <FolderOpen size={18} /> },
  { path: '/admin/community', label: 'Cộng đồng', icon: <Grid3X3 size={18} /> },
];

const SYSTEM_ITEMS = [
  { path: '/admin/users', label: 'Người dùng', icon: <Users size={18} /> },
  { path: '/admin/orders', label: 'Đơn hàng', icon: <CreditCard size={18} /> },
  { path: '/admin/feedback', label: 'Phản hồi & Báo lỗi', icon: <MessageSquare size={18} /> },
  { path: '/admin/support-chat', label: 'Trò chuyện hỗ trợ', icon: <MessageCircle size={18} /> },
];

const SECTION_LABELS = {
  content: 'Quản lý nội dung',
  quizlet: 'Quizlet',
  system: 'Hệ thống',
};

export default function AdminSidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isCskh = user?.role === 'cskh';
  const { socket } = useSocket();

  const [sessions, setSessions] = useState([]);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  // Load support sessions and pending feedback count on mount
  useEffect(() => {
    const isAgentOrAdmin = user?.role === 'admin' || user?.role === 'cskh';
    if (!isAgentOrAdmin) return;

    const fetchSessions = async () => {
      try {
        const res = await axiosClient.get('/support-chat/admin/sessions');
        setSessions(res.data || []);
      } catch (err) {
        console.error('Failed to load support sessions in sidebar:', err);
      }
    };

    const fetchPendingFeedback = async () => {
      try {
        const res = await axiosClient.get('/feedback/admin?status=pending&limit=1');
        setPendingFeedbackCount(res.data?.total || 0);
      } catch (err) {
        console.error('Failed to load pending feedbacks in sidebar:', err);
      }
    };

    fetchSessions();
    fetchPendingFeedback();
  }, [user]);

  // Sync unread counts and pending feedbacks in real-time
  useEffect(() => {
    const isAgentOrAdmin = user?.role === 'admin' || user?.role === 'cskh';
    if (!isAgentOrAdmin || !socket) return;

    const handleNewMessage = (payload) => {
      if (!payload || !payload.session) return;
      const { session: updatedSession } = payload;
      setSessions(prev => {
        const index = prev.findIndex(s => s._id === updatedSession._id);
        let newSessions = [...prev];
        if (index !== -1) {
          newSessions[index] = updatedSession;
        } else if (updatedSession.status === 'open') {
          newSessions.push(updatedSession);
        }
        return newSessions;
      });
    };

    const handleSessionUpdated = (updatedSession) => {
      if (!updatedSession) return;
      setSessions(prev => {
        if (updatedSession.status === 'closed') {
          return prev.filter(s => s._id !== updatedSession._id);
        }
        const index = prev.findIndex(s => s._id === updatedSession._id);
        let newSessions = [...prev];
        if (index !== -1) {
          newSessions[index] = updatedSession;
        } else {
          newSessions.push(updatedSession);
        }
        return newSessions;
      });
    };

    const handleFeedbackChange = async () => {
      try {
        const res = await axiosClient.get('/feedback/admin?status=pending&limit=1');
        setPendingFeedbackCount(res.data?.total || 0);
      } catch (err) {
        console.error('Failed to sync pending feedback count:', err);
      }
    };

    socket.on('support:message:receive', handleNewMessage);
    socket.on('support:session:updated', handleSessionUpdated);
    socket.on('feedback:new', handleFeedbackChange);
    socket.on('feedback:updated', handleFeedbackChange);

    return () => {
      socket.off('support:message:receive', handleNewMessage);
      socket.off('support:session:updated', handleSessionUpdated);
      socket.off('feedback:new', handleFeedbackChange);
      socket.off('feedback:updated', handleFeedbackChange);
    };
  }, [socket, user]);

  // Compute total unread count whenever sessions change
  useEffect(() => {
    const count = sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
    setSupportUnreadCount(count);
  }, [sessions]);

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-icon"><Settings size={20} color="#fff" /></div>
        {!collapsed && (
          <div className="admin-sidebar-logo-text">
            <span className="admin-logo-title">SmartEnglish</span>
            <span className="admin-logo-sub">{isCskh ? 'Support Panel' : 'Admin Panel'}</span>
          </div>
        )}
        <button className="admin-sidebar-toggle" onClick={onToggle} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="admin-sidebar-nav">
        {/* Content Management */}
        {!isCskh && (
          <>
            <div className="admin-sidebar-section-label">
              {!collapsed && <span>{SECTION_LABELS.content}</span>}
            </div>
            {CONTENT_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `admin-sidebar-item ${isActive || location.pathname === item.path ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="admin-sidebar-item-icon">{item.icon}</span>
                {!collapsed && <span className="admin-sidebar-item-label">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {/* Quizlet */}
        {!isCskh && (
          <>
            <div className="admin-sidebar-section-label">
              {!collapsed && <span>{SECTION_LABELS.quizlet}</span>}
            </div>
            {QUIZLET_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `admin-sidebar-item ${isActive || location.pathname === item.path ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="admin-sidebar-item-icon">{item.icon}</span>
                {!collapsed && <span className="admin-sidebar-item-label">{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}

        {/* System */}
        <div className="admin-sidebar-section-label">
          {!collapsed && <span>{SECTION_LABELS.system}</span>}
        </div>
        {SYSTEM_ITEMS.map(item => {
          const isSupport = item.path === '/admin/support-chat';
          const isFeedback = item.path === '/admin/feedback';

          let badgeCount = 0;
          if (isSupport) badgeCount = supportUnreadCount;
          else if (isFeedback) badgeCount = pendingFeedbackCount;

          const hasBadge = badgeCount > 0;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: linkActive }) =>
                `admin-sidebar-item ${linkActive || location.pathname === item.path ? 'active' : ''}`
              }
              title={collapsed ? (hasBadge ? `${item.label} (${badgeCount})` : item.label) : undefined}
            >
              <span className="admin-sidebar-item-icon" style={{ position: 'relative' }}>
                {item.icon}
                {hasBadge && (
                  <span className="admin-sidebar-badge-collapsed">
                    {badgeCount}
                  </span>
                )}
              </span>
              {!collapsed && <span className="admin-sidebar-item-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="admin-sidebar-bottom">
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} />
              : (user?.username?.charAt(0)?.toUpperCase() || 'A')
            }
          </div>
          {!collapsed && (
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-username">{user?.username || 'Admin'}</span>
              <span className="admin-sidebar-role">{isCskh ? 'Chăm sóc khách hàng' : 'Quản trị viên'}</span>
            </div>
          )}
        </div>
        <NavLink to="/dashboard" className="admin-sidebar-item admin-sidebar-back" title="Về trang chính">
          <span className="admin-sidebar-item-icon"><LayoutDashboard size={18} /></span>
          {!collapsed && <span className="admin-sidebar-item-label">Về trang chính</span>}
        </NavLink>
        <button className="admin-sidebar-item admin-sidebar-logout" onClick={logout} title="Đăng xuất">
          <span className="admin-sidebar-item-icon"><LogOut size={18} /></span>
          {!collapsed && <span className="admin-sidebar-item-label">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
