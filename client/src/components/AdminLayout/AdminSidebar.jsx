import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, Layers, FileText, Target, LayoutDashboard,
  Settings, LogOut, ChevronLeft, ChevronRight,
  BookMarked, FolderOpen, Users, Grid3X3, Library,
  MessageSquare, MessageCircle, CreditCard, Home,
  ChevronDown, Maximize, Lock, User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import axiosClient from '../../api/axiosClient';
import './AdminSidebar.css';

export default function AdminSidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isCskh = user?.role === 'cskh';
  const { socket } = useSocket();

  const [sessions, setSessions] = useState([]);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  // Collapsible menus state
  const [openMenus, setOpenMenus] = useState({
    home: true,
    content: false,
    quizlet: false,
    system: false
  });

  const toggleMenu = (menuKey) => {
    if (collapsed) {
      // If collapsed, expand the sidebar first
      onToggle();
    }
    setOpenMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Automatically expand active menu on mount / route change
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/dashboard') || path === '/admin') {
      setOpenMenus(prev => ({ ...prev, home: true }));
    } else if (['/admin/courses', '/admin/units', '/admin/lessons', '/admin/challenges'].some(p => path.startsWith(p))) {
      setOpenMenus(prev => ({ ...prev, content: true }));
    } else if (['/admin/flashcards', '/admin/folders', '/admin/community'].some(p => path.startsWith(p))) {
      setOpenMenus(prev => ({ ...prev, quizlet: true }));
    } else if (['/admin/users', '/admin/orders', '/admin/feedback', '/admin/support-chat'].some(p => path.startsWith(p))) {
      setOpenMenus(prev => ({ ...prev, system: true }));
    }
  }, [location.pathname]);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Gentelella Logo Header */}
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-icon">
          <img src="/uploads/logo_app.png" alt="Logo" style={{ height: '20px', width: '20px', objectFit: 'contain' }} />
        </div>
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

      {/* Welcome Section */}
      <div className="admin-sidebar-welcome">
        <div className="admin-welcome-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <div className="admin-avatar-fallback">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="admin-sidebar-welcome-info">
            <span className="admin-welcome-greet">Chào mừng,</span>
            <h2 className="admin-welcome-name">{user?.username || 'Quản trị viên'}</h2>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="admin-sidebar-nav">
        <div className="admin-sidebar-section-label">
          {!collapsed && <span>Tổng quan</span>}
        </div>

        {/* Home Dropdown Menu */}
        <div className={`admin-sidebar-menu-group ${openMenus.home ? 'is-open' : ''}`}>
          <button 
            className={`admin-sidebar-menu-header ${location.pathname === '/admin/dashboard' || location.pathname === '/admin' ? 'active-parent' : ''}`} 
            onClick={() => toggleMenu('home')}
          >
            <span className="menu-header-icon"><Home size={16} /></span>
            {!collapsed && <span className="menu-header-label">Trang chủ</span>}
            {!collapsed && <ChevronDown size={12} className="menu-header-chevron" />}
          </button>
          <div className="admin-sidebar-submenu">
            <NavLink 
              to="/admin/dashboard" 
              className={({ isActive }) => `admin-sidebar-submenu-item ${isActive || location.pathname === '/admin' ? 'active' : ''}`}
            >
              {!collapsed && <span className="submenu-dot">•</span>}
              <span className="submenu-label">Bảng điều khiển</span>
            </NavLink>
          </div>
        </div>

        {/* Content Management Dropdown */}
        {!isCskh && (
          <div className={`admin-sidebar-menu-group ${openMenus.content ? 'is-open' : ''}`}>
            <button 
              className={`admin-sidebar-menu-header ${['/admin/courses', '/admin/units', '/admin/lessons', '/admin/challenges'].some(p => location.pathname.startsWith(p)) ? 'active-parent' : ''}`} 
              onClick={() => toggleMenu('content')}
            >
              <span className="menu-header-icon"><BookOpen size={16} /></span>
              {!collapsed && <span className="menu-header-label">Quản lý Nội dung</span>}
              {!collapsed && <ChevronDown size={12} className="menu-header-chevron" />}
            </button>
            <div className="admin-sidebar-submenu">
              <NavLink to="/admin/courses" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Khóa học</span>
              </NavLink>
              <NavLink to="/admin/units" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Chương học</span>
              </NavLink>
              <NavLink to="/admin/lessons" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Bài học</span>
              </NavLink>
              <NavLink to="/admin/challenges" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Thử thách</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Quizlet Dropdown */}
        {!isCskh && (
          <div className={`admin-sidebar-menu-group ${openMenus.quizlet ? 'is-open' : ''}`}>
            <button 
              className={`admin-sidebar-menu-header ${['/admin/flashcards', '/admin/folders', '/admin/community'].some(p => location.pathname.startsWith(p)) ? 'active-parent' : ''}`} 
              onClick={() => toggleMenu('quizlet')}
            >
              <span className="menu-header-icon"><BookMarked size={16} /></span>
              {!collapsed && <span className="menu-header-label">Phân hệ Quizlet</span>}
              {!collapsed && <ChevronDown size={12} className="menu-header-chevron" />}
            </button>
            <div className="admin-sidebar-submenu">
              <NavLink to="/admin/flashcards" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Bộ thẻ học</span>
              </NavLink>
              <NavLink to="/admin/folders" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Thư mục</span>
              </NavLink>
              <NavLink to="/admin/community" className="admin-sidebar-submenu-item">
                {!collapsed && <span className="submenu-dot">•</span>}
                <span className="submenu-label">Cộng đồng</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* System Management Dropdown */}
        <div className={`admin-sidebar-menu-group ${openMenus.system ? 'is-open' : ''}`}>
          <button 
            className={`admin-sidebar-menu-header ${['/admin/users', '/admin/orders', '/admin/feedback', '/admin/support-chat'].some(p => location.pathname.startsWith(p)) ? 'active-parent' : ''}`} 
            onClick={() => toggleMenu('system')}
          >
            <span className="menu-header-icon"><Settings size={16} /></span>
            {!collapsed && <span className="menu-header-label">Quản lý Hệ thống</span>}
            {!collapsed && <ChevronDown size={12} className="menu-header-chevron" />}
          </button>
          <div className="admin-sidebar-submenu">
            <NavLink to="/admin/users" className="admin-sidebar-submenu-item">
              {!collapsed && <span className="submenu-dot">•</span>}
              <span className="submenu-label">Người dùng</span>
            </NavLink>
            <NavLink to="/admin/orders" className="admin-sidebar-submenu-item">
              {!collapsed && <span className="submenu-dot">•</span>}
              <span className="submenu-label">Đơn hàng</span>
            </NavLink>
            <NavLink to="/admin/feedback" className="admin-sidebar-submenu-item" style={{ position: 'relative' }}>
              {!collapsed && <span className="submenu-dot">•</span>}
              <span className="submenu-label">Phản hồi & Lỗi</span>
              {pendingFeedbackCount > 0 && (
                <span className="sidebar-badge-count">{pendingFeedbackCount}</span>
              )}
            </NavLink>
            <NavLink to="/admin/support-chat" className="admin-sidebar-submenu-item" style={{ position: 'relative' }}>
              {!collapsed && <span className="submenu-dot">•</span>}
              <span className="submenu-label">Hỗ trợ Chat</span>
              {supportUnreadCount > 0 && (
                <span className="sidebar-badge-count info-badge">{supportUnreadCount}</span>
              )}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Gentelella Footer Buttons */}
      <div className="admin-sidebar-footer">
        <a href="/profile" className="footer-action-btn" title="Cài đặt Profile">
          <User size={15} />
        </a>
        <button className="footer-action-btn" onClick={toggleFullscreen} title="Toàn màn hình">
          <Maximize size={15} />
        </button>
        <a href="/dashboard" className="footer-action-btn" title="Về trang chính">
          <Home size={15} />
        </a>
        <button className="footer-action-btn logout-btn" onClick={logout} title="Đăng xuất">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
