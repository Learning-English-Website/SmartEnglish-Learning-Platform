import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuthContext } from '../../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuthContext();

  const stats = [
    { label: 'Day Streak', value: '1', icon: '🔥' },
    { label: 'Total XP', value: '0', icon: '⚡' },
    { label: 'Cards Mastered', value: '0', icon: '🃏' },
    { label: 'Lessons Done', value: '0', icon: '📚' },
  ];

  return (
    <div className="dashboard-page">
      <Container className="dashboard-container">
        {/* Welcome */}
        <div className="dashboard-welcome">
          <h1>
            Welcome back, <span className="user-highlight">{user?.username}</span>! 👋
          </h1>
          <p>Ready to continue your learning journey?</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick access */}
        <div className="quick-access">
          <h2 className="section-title">Quick Access</h2>
          <div className="quick-grid">
            <Link to="/quizlet" className="quick-card">
              <span>🃏</span>
              <strong>Flashcards</strong>
              <p>Study vocabulary sets</p>
            </Link>
            <Link to="/duolingo" className="quick-card">
              <span>🦜</span>
              <strong>Daily Practice</strong>
              <p>Gamified exercises</p>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
