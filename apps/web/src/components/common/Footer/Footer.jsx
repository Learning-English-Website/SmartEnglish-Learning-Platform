import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="memoris-footer">
      <Container>
        <div className="footer-content">
          <div className="footer-brand">
            <span>🧠</span>
            <span className="footer-brand-name">Memoris</span>
          </div>
          <p className="footer-tagline">Learn smarter, remember longer.</p>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/quizlet">Flashcards</Link>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} Memoris. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
