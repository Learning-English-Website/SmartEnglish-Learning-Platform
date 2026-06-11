import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import './HomePage.css';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-page">
      <Container className="home-container">
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-badge">Your AI-powered learning platform</div>
          <h1 className="hero-title">
            Learn English the <span className="text-accent">smart way</span>
          </h1>
          <p className="hero-subtitle">
            Memorize faster with spaced repetition flashcards, practice daily with
            gamified exercises, and track your progress with real insights.
          </p>
          <div className="hero-buttons">
            {isAuthenticated ? (
              user?.role === 'teacher' ? (
                <>
                  <Button as={Link} to="/teacher/studio" className="btn-hero-primary">
                    Vào trang Soạn bài (Studio) <FiArrowRight />
                  </Button>
                  <Button as={Link} to="/dashboard" className="btn-hero-secondary">
                    Bảng điều khiển học tập
                  </Button>
                </>
              ) : user?.role === 'admin' ? (
                <>
                  <Button as={Link} to="/admin" className="btn-hero-primary">
                    Vào trang Admin <FiArrowRight />
                  </Button>
                  <Button as={Link} to="/dashboard" className="btn-hero-secondary">
                    Bảng điều khiển học tập
                  </Button>
                </>
              ) : (
                <Button as={Link} to="/dashboard" className="btn-hero-primary">
                  Go to Dashboard <FiArrowRight />
                </Button>
              )
            ) : (
              <>
                <Button as={Link} to="/register" className="btn-hero-primary">
                  Start Learning Free <FiArrowRight />
                </Button>
                <Button as={Link} to="/login" className="btn-hero-secondary">
                  Sign In
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Feature Cards */}
        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🃏</div>
            <h3>Quizlet Mode</h3>
            <p>Smart flashcards with spaced repetition. Create, study, and master vocabulary sets.</p>
            <Link to={isAuthenticated ? '/quizlet' : '/register'} className="feature-link">
              Explore <FiArrowRight />
            </Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🦜</div>
            <h3>Duolingo Mode</h3>
            <p>Daily gamified exercises, streaks, and leaderboards to keep you motivated.</p>
            <Link to={isAuthenticated ? '/duolingo' : '/register'} className="feature-link">
              Explore <FiArrowRight />
            </Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Smart Analytics</h3>
            <p>Track XP, streaks, mistake patterns, and optimize your learning path.</p>
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="feature-link">
              Explore <FiArrowRight />
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
