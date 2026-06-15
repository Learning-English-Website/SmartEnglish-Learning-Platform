import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="memoris-footer">
      <Container>
        <div className="footer-content">
          <div className="footer-brand d-flex align-items-center">
            <img src="/uploads/logo_app.png" alt="Memoris Logo" style={{ height: '24px', marginRight: '8px', objectFit: 'contain' }} />
            <span className="footer-brand-name">Memoris</span>
          </div>
          <p className="footer-tagline">Học thông minh hơn, nhớ lâu hơn.</p>
          <div className="footer-links">
            <Link to="/">Trang chủ</Link>
            <Link to="/dashboard">Bảng điều khiển</Link>
            <Link to="/quizlet">Thẻ ghi nhớ</Link>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} Memoris. Mọi quyền được bảo lưu.</p>
        </div>
      </Container>
    </footer>
  );
}
