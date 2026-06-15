import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Mail, ChevronDown, User, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../context/SocketContext';
import axiosClient from '../../api/axiosClient';
import './AdminTopbar.css';

export default function AdminTopbar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isCskh = user?.role === 'cskh';
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportSessions, setSupportSessions] = useState([]);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch feedback and support unread counts on mount
  useEffect(() => {
    const isAgentOrAdmin = user?.role === 'admin' || user?.role === 'cskh';
    if (!isAgentOrAdmin) return;

    const fetchSessions = async () => {
      try {
        const res = await axiosClient.get('/support-chat/admin/sessions');
        setSupportSessions(res.data || []);
      } catch (err) {
        console.error('Failed to load support sessions in topbar:', err);
      }
    };

    const fetchPendingFeedback = async () => {
      try {
        const res = await axiosClient.get('/feedback/admin?status=pending&limit=1');
        setFeedbackCount(res.data?.total || 0);
      } catch (err) {
        console.error('Failed to load pending feedbacks in topbar:', err);
      }
    };

    fetchSessions();
    fetchPendingFeedback();
  }, [user]);

  // Real-time synchronization
  useEffect(() => {
    const isAgentOrAdmin = user?.role === 'admin' || user?.role === 'cskh';
    if (!isAgentOrAdmin || !socket) return;

    const handleNewMessage = (payload) => {
      if (!payload || !payload.session) return;
      const { session: updatedSession } = payload;
      setSupportSessions(prev => {
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
      setSupportSessions(prev => {
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
        setFeedbackCount(res.data?.total || 0);
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

  // Total notification count (unread chat sessions + pending feedback)
  useEffect(() => {
    const chatUnread = supportSessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
    setUnreadCount(chatUnread + feedbackCount);
  }, [supportSessions, feedbackCount]);

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        {/* Hamburger Menu Toggle Button */}
        <button 
          className="admin-topbar-toggle-btn" 
          onClick={onToggle}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="admin-topbar-right">
        {/* Notification Mail Icon */}
        <Link 
          to={isCskh ? "/admin/support-chat" : "/admin/feedback"} 
          className="admin-topbar-notification"
          title="Thông báo hệ thống"
        >
          <Mail size={18} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </Link>

        {/* User Dropdown */}
        <div className="admin-topbar-user" ref={dropdownRef}>
          <button 
            className="admin-user-trigger" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="admin-user-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <div className="admin-avatar-fallback-small">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <span className="admin-user-name">{user?.username || 'John Doe'}</span>
            <ChevronDown size={12} className={`admin-user-chevron ${showDropdown ? 'rotate' : ''}`} />
          </button>

          {showDropdown && (
            <div className="admin-user-dropdown-menu">
              <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                <User size={14} className="dropdown-item-icon" />
                <span>Hồ sơ cá nhân</span>
              </Link>
              <Link to="/dashboard" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                <HelpCircle size={14} className="dropdown-item-icon" />
                <span>Về trang chủ</span>
              </Link>
              <div className="dropdown-divider" />
              <button 
                className="dropdown-item logout-btn" 
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
              >
                <LogOut size={14} className="dropdown-item-icon text-danger" />
                <span className="text-danger">Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
