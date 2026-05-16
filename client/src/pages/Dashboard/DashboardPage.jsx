import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { Flame, Zap, CreditCard, BookOpen, Layers, Target, TrendingUp } from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: 'Day Streak', value: '1', icon: Flame, color: 'var(--gl-tertiary)' },
    { label: 'Total XP', value: '0', icon: Zap, color: '#f59e0b' },
    { label: 'Cards Mastered', value: '0', icon: CreditCard, color: '#10b981' },
    { label: 'Lessons Done', value: '0', icon: BookOpen, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-page">
      <Container className="dashboard-container">
        {/* Welcome Hero */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-content">
            <div className="dashboard-greeting">
              <h1 className="dashboard-title">
                Welcome back, <span className="user-highlight">{user?.username}</span>
              </h1>
              <p className="dashboard-subtitle">Ready to continue your learning journey?</p>
            </div>
            <div className="dashboard-hero-icon">
              <Target size={48} />
            </div>
          </div>
          <div className="dashboard-hero-decoration" />
        </div>

        {/* Stats Grid */}
        <div className="stats-section">
          <h2 className="section-title">
            <TrendingUp size={18} />
            Your Progress
          </h2>
          <div className="stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon-wrap" style={{ background: `${s.color}15`, color: s.color }}>
                  <s.icon size={20} />
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="quick-access">
          <h2 className="section-title">
            <Layers size={18} />
            Quick Access
          </h2>
          <div className="quick-grid">
            <Link to="/quizlet" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(44, 94, 245, 0.1)', color: 'var(--gl-tertiary)' }}>
                <CreditCard size={24} />
              </div>
              <strong>Flashcards</strong>
              <p>Study vocabulary sets</p>
            </Link>
            <Link to="/duolingo" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <BookOpen size={24} />
              </div>
              <strong>Daily Practice</strong>
              <p>Gamified exercises</p>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
