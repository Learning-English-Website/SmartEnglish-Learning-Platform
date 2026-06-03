import { useLocation } from 'react-router-dom';
import './AdminTopbar.css';

const PAGE_TITLES = {
  '/admin': 'Tổng quan',
  '/admin/dashboard': 'Tổng quan',
  '/admin/courses': 'Quản lý Khóa học',
  '/admin/units': 'Quản lý Units',
  '/admin/lessons': 'Quản lý Lessons',
  '/admin/challenges': 'Quản lý Challenges',
  '/admin/flashcards': 'Flashcard Sets',
  '/admin/folders': 'Quản lý Folders',
  '/admin/community': 'Cộng đồng',
  '/admin/users': 'Quản lý Người dùng',
};

export default function AdminTopbar() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Admin Panel';

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <h1 className="admin-topbar-title">{title}</h1>
      </div>
      <div className="admin-topbar-right">
        <span className="admin-topbar-badge">
          <span className="admin-topbar-dot" />
          Admin Mode
        </span>
      </div>
    </header>
  );
}
