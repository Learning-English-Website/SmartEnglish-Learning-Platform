import { NavLink, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Bell, Plus, ChevronLeft, ChevronRight,
  Home, LibraryBig, FolderPlus, Folder, CreditCard,
  Menu, X, Check, LogOut, User, Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { folderService } from '../../api/folderService';
import './DashboardLayout.css';

export default function DashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [topNavSearch, setTopNavSearch] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const location = useLocation();
  const { user, logout } = useAuth();
  const userMenuRef = useRef(null);

  const fetchFolders = useCallback(async () => {
    try {
      const result = await folderService.getAll();
      setFolders(result?.data ?? result ?? []);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await folderService.create(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
      fetchFolders();
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);
  const toggleMobileSidebar = () => setMobileSidebarOpen((v) => !v);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="q-root">
      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header className="q-topbar">
        <div className="q-topbar-left">
          <button className="q-hamburger" onClick={toggleMobileSidebar} aria-label="Menu">
            <Menu size={18} />
          </button>
          <Link to="/dashboard" className="q-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#2563eb" />
              <path d="M2 17l10 5 10-5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>SmartEnglish</span>
          </Link>
        </div>

        {/* Center: Search */}
        <form className="q-topbar-search" onSubmit={(e) => e.preventDefault()}>
          <Search size={14} className="q-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm học phần..."
            value={topNavSearch}
            onChange={(e) => setTopNavSearch(e.target.value)}
          />
        </form>

        {/* Right: Actions */}
        <div className="q-topbar-right">
          <button className="q-topbar-create-btn" title="Tạo mới">
            <Plus size={16} />
            <span>Tạo</span>
          </button>

          <button className="q-topbar-iconbtn" title="Thông báo">
            <Bell size={18} />
          </button>

          <button className="q-plus-btn">Nâng cấp lên Plus</button>

          {/* User avatar */}
          <div className="q-user-menu-wrap" ref={userMenuRef}>
            <button
              className="q-avatar-btn"
              onClick={() => setShowUserMenu((v) => !v)}
              aria-label="Tài khoản"
            >
              <div className="q-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </button>

            {showUserMenu && (
              <div className="q-user-dropdown">
                <div className="q-ud-header">
                  <div className="q-ud-avatar">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} />
                    ) : (
                      user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <div className="q-ud-name">{user?.username || 'User'}</div>
                    <div className="q-ud-email">{user?.email || ''}</div>
                  </div>
                </div>
                <div className="q-ud-divider" />
                <Link to="/profile" className="q-ud-item" onClick={() => setShowUserMenu(false)}>
                  <User size={14} />
                  Hồ sơ &amp; Cài đặt
                </Link>
                <Link to="/profile/edit" className="q-ud-item" onClick={() => setShowUserMenu(false)}>
                  <Settings size={14} />
                  Cài đặt
                </Link>
                <div className="q-ud-divider" />
                <button className="q-ud-item q-ud-logout" onClick={logout}>
                  <LogOut size={14} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ─────────────────────────────── */}
      <div className="q-body">

        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div className="q-sidebar-overlay" onClick={closeMobileSidebar} />
        )}

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={`q-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>

          {/* Mobile close button */}
          <button className="q-sidebar-close" onClick={closeMobileSidebar}>
            <X size={18} />
          </button>

          <nav className="q-sidebar-nav">

            {/* Section 1: Navigation */}
            <div className="q-sidebar-section">
              <NavLink
                to="/dashboard"
                className={`q-nav-item ${isActive('/dashboard') && location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={closeMobileSidebar}
              >
                <Home size={17} />
                <span>Trang chủ</span>
              </NavLink>

              <NavLink
                to="/library"
                className={`q-nav-item ${location.pathname === '/library' ? 'active' : ''}`}
                onClick={closeMobileSidebar}
              >
                <LibraryBig size={17} />
                <span>Thư viện của bạn</span>
              </NavLink>

              <NavLink
                to="/library?tab=notifications"
                className="q-nav-item"
                onClick={closeMobileSidebar}
              >
                <Bell size={17} />
                <span>Thông báo</span>
              </NavLink>
            </div>

            {/* Section 2: Folders */}
            <div className="q-sidebar-section">
              <div className="q-sidebar-section-title">
                <span>Thư mục</span>
                <button
                  className="q-sidebar-addbtn"
                  title="Tạo thư mục mới"
                  onClick={() => {
                    setShowNewFolderInput((v) => !v);
                    setNewFolderName('');
                  }}
                >
                  <FolderPlus size={13} />
                </button>
              </div>

              {showNewFolderInput && (
                <div className="q-new-folder-row">
                  <input
                    type="text"
                    className="q-new-folder-input"
                    placeholder="Tên thư mục..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="q-new-folder-confirm"
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className="q-new-folder-cancel"
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {loadingFolders ? (
                <div className="q-sidebar-loading">Đang tải...</div>
              ) : folders.length === 0 && !showNewFolderInput ? (
                <button
                  className="q-nav-item q-nav-new-folder"
                  onClick={() => setShowNewFolderInput(true)}
                >
                  <FolderPlus size={17} />
                  <span>Thư mục mới</span>
                </button>
              ) : (
                <>
                  {folders.map((folder) => (
                    <NavLink
                      key={folder._id}
                      to={`/folders/${folder._id}/${encodeURIComponent(folder.name)}`}
                      className={({ isActive }) =>
                        `q-nav-item q-nav-folder ${isActive ? 'active' : ''}`
                      }
                      onClick={closeMobileSidebar}
                    >
                      <Folder size={17} />
                      <span>{folder.name}</span>
                    </NavLink>
                  ))}
                </>
              )}
            </div>

            {/* Section 3: Bắt đầu tại đây */}
            <div className="q-sidebar-section">
              <div className="q-sidebar-section-title">Bắt đầu tại đây</div>

              <NavLink
                to="/flashcards"
                className={`q-nav-item ${isActive('/flashcards') && location.pathname === '/flashcards' ? 'active' : ''}`}
                onClick={closeMobileSidebar}
              >
                <CreditCard size={17} />
                <span>Thẻ ghi nhớ</span>
              </NavLink>

              <NavLink
                to="/flashcards/browse"
                className={`q-nav-item ${isActive('/flashcards/browse') ? 'active' : ''}`}
                onClick={closeMobileSidebar}
              >
                <CreditCard size={17} />
                <span>Khám phá học phần</span>
              </NavLink>
            </div>

          </nav>

          {/* Collapse toggle (desktop only) */}
          <button
            className="q-sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </aside>

        {/* ── Main Content ──────────────────────────────────────── */}
        <main className={`q-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
