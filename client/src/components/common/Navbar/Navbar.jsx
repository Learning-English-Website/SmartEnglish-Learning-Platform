import { Link, NavLink } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { FiUser, FiLogOut, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth';
import './Navbar.css';

export default function AppNavbar({ darkMode, onToggleDark }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Navbar className="memoris-navbar" expand="lg" fixed="top">
      <Container>
        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="brand">
          <span className="brand-icon">🧠</span>
          <span className="brand-name">Memoris</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="navbar-toggler-custom" />

        <Navbar.Collapse id="main-nav">
          {isAuthenticated && (
            <Nav className="me-auto nav-links">
              <Nav.Link as={NavLink} to="/dashboard" end>Dashboard</Nav.Link>
              <Nav.Link as={NavLink} to="/flashcards" end>Flashcards</Nav.Link>
              <Nav.Link as={NavLink} to="/flashcards/browse">Browse</Nav.Link>
              <Nav.Link as={NavLink} to="/duolingo">Practice</Nav.Link>
            </Nav>
          )}

          <Nav className="ms-auto align-items-center gap-2">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={onToggleDark}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </Button>

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
                  <Dropdown.Item as={Link} to="/profile">
                    <FiUser className="me-2" /> Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/profile/edit">
                    <FiSettings className="me-2" /> Edit Profile
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={logout} className="logout-item">
                    <FiLogOut className="me-2" /> Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="auth-buttons">
                <Button as={Link} to="/login" variant="outline-primary" className="btn-login">
                  Log In
                </Button>
                <Button as={Link} to="/register" variant="primary" className="btn-register">
                  Get Started
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
