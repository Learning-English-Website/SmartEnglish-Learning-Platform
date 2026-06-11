import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Calendar
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './TeacherSidebar.css';

export default function TeacherSidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className={`teacher-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="teacher-sidebar-logo">
        <div className="teacher-sidebar-logo-icon"><Settings size={20} color="#fff" /></div>
        {!collapsed && (
          <div className="teacher-sidebar-logo-text">
            <span className="teacher-logo-title">SmartEnglish</span>
            <span className="teacher-logo-sub">Teacher Panel</span>
          </div>
        )}
        <button className="teacher-sidebar-toggle" onClick={onToggle} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="teacher-sidebar-nav">
        <div className="teacher-sidebar-section-label">
          {!collapsed && <span>Quản lý giáo trình</span>}
        </div>
        <NavLink
          to="/teacher/studio"
          className={({ isActive }) =>
            `teacher-sidebar-item ${isActive || location.pathname.startsWith('/teacher/studio') ? 'active' : ''}`
          }
          title={collapsed ? 'Duolingo Studio' : undefined}
        >
          <span className="teacher-sidebar-item-icon"><BookOpen size={18} /></span>
          {!collapsed && <span className="teacher-sidebar-item-label">Duolingo Studio</span>}
        </NavLink>
        <NavLink
          to="/teacher/daily-challenge"
          className={({ isActive }) =>
            `teacher-sidebar-item ${isActive ? 'active' : ''}`
          }
          title={collapsed ? 'Lên lịch Thử thách' : undefined}
        >
          <span className="teacher-sidebar-item-icon"><Calendar size={18} /></span>
          {!collapsed && <span className="teacher-sidebar-item-label">Lên lịch Thử thách</span>}
        </NavLink>
      </nav>

      {/* Bottom: user + logout */}
      <div className="teacher-sidebar-bottom">
        <div className="teacher-sidebar-user">
          <div className="teacher-sidebar-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} />
              : (user?.username?.charAt(0)?.toUpperCase() || 'T')
            }
          </div>
          {!collapsed && (
            <div className="teacher-sidebar-user-info">
              <span className="teacher-sidebar-username">{user?.username || 'Teacher'}</span>
              <span className="teacher-sidebar-role">Giáo viên</span>
            </div>
          )}
        </div>
        <button className="teacher-sidebar-item teacher-sidebar-logout" onClick={logout} title="Đăng xuất">
          <span className="teacher-sidebar-item-icon"><LogOut size={18} /></span>
          {!collapsed && <span className="teacher-sidebar-item-label">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
