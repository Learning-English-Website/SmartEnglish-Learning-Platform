import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import './ProPage.css';

export default function CancelPage() {
  return (
    <div className="payment-status-container clean-layout">
      <div className="premium-status-card clean-card error-card animate-fade-in">
        <div className="error-icon-wrapper-clean">
          <FiAlertCircle style={{ fontSize: '4.5rem', color: '#ef4444' }} />
        </div>
        <h2 className="error-title-clean">Thanh toán đã bị hủy</h2>
        <p className="success-subtitle-clean">
          Giao dịch của bạn đã bị hủy bỏ. Bạn không bị trừ bất kỳ khoản phí nào và có thể thử lại bất kỳ lúc nào.
        </p>

        <div className="premium-action-group">
          <Link to="/premium" className="btn-clean-primary">
            Thử lại <FiArrowRight className="btn-icon" />
          </Link>
          <Link to="/dashboard" className="btn-clean-secondary">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

