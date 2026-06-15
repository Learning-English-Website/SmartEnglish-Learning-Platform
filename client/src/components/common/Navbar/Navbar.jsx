import { Link, NavLink } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { FiUser, FiLogOut, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth';
import StreakCounter from '../../gamification/StreakCounter/StreakCounter';
import './Navbar.css';

export default function AppNavbar({ darkMode, onToggleDark }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Navbar className="memoris-navbar" expand="lg" fixed="top">
      <Container>
        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="brand d-flex align-items-center">
          <img src="/uploads/logo_app.png" alt="Memoris Logo" className="brand-logo-img" style={{ height: '32px', marginRight: '10px', objectFit: 'contain' }} />
          <span className="brand-name">Memoris</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="navbar-toggler-custom" />

        <Navbar.Collapse id="main-nav">
          {isAuthenticated && (
            <Nav className="me-auto nav-links">
              <Nav.Link as={NavLink} to="/dashboard" end>Bảng điều khiển</Nav.Link>
              <Nav.Link as={NavLink} to="/flashcards" end>Thẻ ghi nhớ</Nav.Link>
              <Nav.Link as={NavLink} to="/flashcards/browse">Khám phá</Nav.Link>
              <Nav.Link as={NavLink} to="/duolingo">Luyện tập</Nav.Link>
              {user?.role === 'teacher' && (
                <Nav.Link as={NavLink} to="/teacher/studio" className="text-primary fw-bold">Studio Soạn Bài</Nav.Link>
              )}
            </Nav>
          )}

          <Nav className="ms-auto align-items-center gap-2">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={onToggleDark}
              title={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </Button>

            {/* Streak counter — chỉ hiện khi đã đăng nhập */}
            {isAuthenticated && <StreakCounter />}

            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle as="div" className="user-dropdown-toggle" id="user-dropdown">
                  <div className="avatar-circle">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} />
                    ) : (
                      <span>{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <span className="username-text d-none d-md-inline">{user?.username}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="dropdown-menu-custom">
                  {user?.role === 'teacher' && (
                    <Dropdown.Item as={Link} to="/teacher/studio">
                      <FiSettings className="me-2 text-primary" /> Studio Giáo viên
                    </Dropdown.Item>
                  )}
                  {user?.role === 'admin' && (
                    <Dropdown.Item as={Link} to="/admin">
                      <FiSettings className="me-2 text-danger" /> Bảng Quản trị
                    </Dropdown.Item>
                  )}
                  <Dropdown.Item as={Link} to="/profile">
                    <FiUser className="me-2" /> Hồ sơ
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/profile/edit">
                    <FiSettings className="me-2" /> Chỉnh sửa hồ sơ
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={logout} className="logout-item">
                    <FiLogOut className="me-2" /> Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="auth-buttons">
                <Button as={Link} to="/login" variant="outline-primary" className="btn-login">
                  Đăng nhập
                </Button>
                <Button as={Link} to="/register" variant="primary" className="btn-register">
                  Bắt đầu
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
