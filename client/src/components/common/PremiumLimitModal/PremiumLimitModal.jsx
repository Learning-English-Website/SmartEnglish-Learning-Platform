import { useNavigate } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { FiHeart, FiLayers, FiShield, FiAward, FiX } from 'react-icons/fi';
import './PremiumLimitModal.css';

// Sleek, minimal custom SVG Crown for high-end tech branding
const SleekCrown = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="sleek-crown-svg">
    <path
      d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z"
      fill="#d97706"
      stroke="#d97706"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 19H21"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function PremiumLimitModal({ show, onHide, reason = 'Tài khoản miễn phí đã đạt giới hạn học tập.' }) {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    onHide();
    navigate('/premium');
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="premium-limit-modal-wrap"
      contentClassName="premium-limit-modal-content"
    >
      {/* Close button */}
      <button className="premium-limit-close" onClick={onHide} aria-label="Đóng">
        <FiX size={16} />
      </button>

      <Modal.Body className="premium-limit-body">
        {/* Sleek Icon Container */}
        <div className="premium-limit-icon-container">
          <div className="premium-limit-icon-box">
            <SleekCrown />
          </div>
        </div>

        {/* Header Title */}
        <h2 className="premium-limit-title">Mở khóa giới hạn</h2>
        <p className="premium-limit-reason">{reason}</p>

        {/* Premium Benefits List - Minimal & Spacious */}
        <div className="premium-limit-features-list">
          <div className="premium-limit-feature-item">
            <div className="feature-check-icon">
              <FiHeart size={14} />
            </div>
            <div className="feature-details">
              <strong>Vô hạn sinh mệnh</strong>
              <span>Học tập liên tục không lo hết lượt.</span>
            </div>
          </div>

          <div className="premium-limit-feature-item">
            <div className="feature-check-icon">
              <FiLayers size={14} />
            </div>
            <div className="feature-details">
              <strong>Không giới hạn học phần</strong>
              <span>Không còn giới hạn 5 bộ thẻ và 30 từ mỗi bộ.</span>
            </div>
          </div>

          <div className="premium-limit-feature-item">
            <div className="feature-check-icon">
              <FiShield size={14} />
            </div>
            <div className="feature-details">
              <strong>Bảo hiểm Streak tự động</strong>
              <span>Tự động bảo toàn chuỗi ngày học hàng tháng.</span>
            </div>
          </div>

          <div className="premium-limit-feature-item">
            <div className="feature-check-icon">
              <FiAward size={14} />
            </div>
            <div className="feature-details">
              <strong>Huy hiệu Premium</strong>
              <span>Biểu tượng vàng sang trọng trên trang cá nhân.</span>
            </div>
          </div>
        </div>

        {/* Pricing Container */}
        <div className="premium-limit-pricing-box">
          <div className="premium-limit-pricing">
            <span className="price">5.000đ</span>
            <span className="period">/ tháng</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="premium-limit-actions">
          <button className="btn-premium-limit-upgrade" onClick={handleUpgradeClick}>
            Nâng cấp ngay
          </button>
          <button className="btn-premium-limit-dismiss" onClick={onHide}>
            Có lẽ để sau
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
