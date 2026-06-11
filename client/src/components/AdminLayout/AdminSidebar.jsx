import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen, Layers, FileText, Target, LayoutDashboard,
  Settings, LogOut, ChevronLeft, ChevronRight,
  BookMarked, FolderOpen, Users, Grid3X3, Library,
  MessageSquare, MessageCircle, CreditCard
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
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

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-icon"><Settings size={20} color="#fff" /></div>
        {!collapsed && (
          <div className="admin-sidebar-logo-text">
            <span className="admin-logo-title">SmartEnglish</span>
            <span className="admin-logo-sub">Admin Panel</span>
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
        {SYSTEM_ITEMS.map(item => (
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
