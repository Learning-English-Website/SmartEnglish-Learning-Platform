import { Link } from 'react-router-dom';
import { FiArrowRight, FiHome, FiRotateCcw, FiXCircle } from 'react-icons/fi';
import './ProPage.css';

export default function CancelPage() {
  return (
    <div className="payment-status-container">
      <div className="payment-status-bg" aria-hidden="true" />

      <div className="premium-status-card payment-status-card cancel-card animate-fade-in">
        <div className="payment-status-topbar">
          <span className="payment-provider-pill muted">Thanh toán Premium</span>
          <span className="payment-status-mini cancelled">Đã hủy</span>
        </div>

        <div className="payment-status-icon payment-status-icon--cancel">
          <FiXCircle />
        </div>

        <span className="payment-status-label">Giao dịch chưa hoàn tất</span>
        <h2 className="payment-status-title">Thanh toán đã bị hủy</h2>
        <p className="payment-status-subtitle">
          Bạn đã rời khỏi cổng thanh toán trước khi hoàn tất. Tài khoản chưa bị trừ phí và gói Premium chưa được kích hoạt.
        </p>

        <div className="payment-cancel-note">
          <div className="payment-cancel-note-icon">
            <FiRotateCcw />
          </div>
          <div>
            <strong>Bạn có thể thử lại bất kỳ lúc nào.</strong>
            <span>Hệ thống sẽ tạo giao dịch mới và giữ nguyên lựa chọn gói Premium của bạn.</span>
          </div>
        </div>

        <div className="premium-action-group">
          <Link to="/premium" className="btn-clean-primary">
            Thử lại <FiArrowRight className="btn-icon" />
          </Link>
          <Link to="/dashboard" className="btn-clean-secondary">
            <FiHome className="btn-icon-left" /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

