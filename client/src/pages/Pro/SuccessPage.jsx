import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loadUser } from '../../store/slices/authSlice';
import { paymentService } from '../../services/paymentService';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiShield,
  FiUser,
  FiXCircle
} from 'react-icons/fi';
import './ProPage.css';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const dispatch = useDispatch();
  const orderId = searchParams.get('orderId');

  // Extract other payment details for a beautiful receipt
  const method = searchParams.get('method') || 'momo';
  const amount = searchParams.get('amount') || '5000';
  const transId = searchParams.get('transId');
  const orderInfo = searchParams.get('orderInfo');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    // If URL query parameters confirm success, display success screen instantly
    const resultCode = searchParams.get('resultCode');
    const payosStatus = searchParams.get('status');

    if (resultCode === '0' || payosStatus === 'PAID' || payosStatus === 'success') {
      setStatus('success');
      // Quietly trigger verifyPayment in the background to sync the backend state
      if (orderId) {
        paymentService.verifyPayment(orderId)
          .then(() => {
            dispatch(loadUser());
          })
          .catch(console.error);
      } else {
        dispatch(loadUser());
      }
      return;
    }

    if (!orderId) {
      setStatus('invalid');
      return;
    }

    try {
      const data = await paymentService.verifyPayment(orderId);
      if (data.data.valid) {
        setStatus('success');
        dispatch(loadUser());
      } else if (data.data.status === 'pending') {
        setStatus('pending');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Verify error:', err);
      setStatus('error');
    }
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    const num = parseInt(val, 10) || 5000;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Helper to format payment method name
  const getMethodName = (m) => {
    if (m?.toLowerCase() === 'momo') return 'Ví điện tử MoMo';
    if (m?.toLowerCase() === 'payos') return 'Cổng thanh toán PayOS';
    return m;
  };

  const getSafeOrderInfo = () => {
    if (!orderInfo) return '';
    try {
      return decodeURIComponent(orderInfo);
    } catch {
      return orderInfo;
    }
  };

  return (
    <div className="payment-status-container">
      <div className="payment-status-bg" aria-hidden="true" />

      {status === 'verifying' && (
        <div className="premium-status-card payment-status-card loading-card animate-fade-in">
          <div className="payment-status-icon payment-status-icon--loading">
            <div className="premium-spinner" />
          </div>
          <span className="payment-status-label">Đang đồng bộ</span>
          <h2 className="payment-status-title">Đang xác minh giao dịch</h2>
          <p className="payment-status-subtitle">
            Vui lòng giữ trang này trong vài giây để hệ thống cập nhật trạng thái Premium.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="premium-status-card payment-status-card success-card animate-fade-in">
          <div className="payment-status-topbar">
            <span className="payment-provider-pill">{getMethodName(method)}</span>
            <span className="payment-status-mini success">Đã kích hoạt</span>
          </div>

          <div className="payment-status-icon payment-status-icon--success">
            <FiCheck />
          </div>

          <span className="payment-status-label">Memoris Premium</span>
          <h2 className="payment-status-title">Thanh toán thành công</h2>
          <p className="payment-status-subtitle">
            Tài khoản của bạn đã được nâng cấp lên <strong>Memoris Pro</strong>. Các quyền lợi Premium đã sẵn sàng để sử dụng.
          </p>

          <div className="payment-benefit-strip" aria-label="Premium benefits">
            <span><FiShield /> Mở khóa giới hạn</span>
            <span><FiClock /> Đồng bộ tức thì</span>
            <span><FiCreditCard /> Biên nhận giao dịch</span>
          </div>

          <div className="premium-receipt-clean payment-receipt-card">
            <div className="receipt-header-clean">
              <h3 className="receipt-title-clean">Thông tin giao dịch</h3>
              <span className="receipt-status-dot">Thành công</span>
            </div>
            <div className="receipt-grid">
              <div className="receipt-row">
                <span className="receipt-label">Mã giao dịch</span>
                <span className="receipt-value">{transId || 'N/A'}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Mã đơn hàng</span>
                <span className="receipt-value truncate-order">{orderId || 'N/A'}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Phương thức</span>
                <span className="receipt-value">{getMethodName(method)}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Số tiền</span>
                <span className="receipt-value price-highlight-clean">{formatCurrency(amount)}</span>
              </div>
              {orderInfo && (
                <div className="receipt-row full-width">
                  <span className="receipt-label">Nội dung</span>
                  <span className="receipt-value message-value">{getSafeOrderInfo()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="premium-action-group">
            <Link to="/dashboard" className="btn-clean-primary">
              Bắt đầu học ngay <FiArrowRight className="btn-icon" />
            </Link>
            <Link to="/profile" className="btn-clean-secondary">
              <FiUser className="btn-icon-left" /> Hồ sơ
            </Link>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="premium-status-card payment-status-card pending-card animate-fade-in">
          <div className="payment-status-icon payment-status-icon--pending">
            <FiAlertTriangle />
          </div>
          <span className="payment-status-label">Đang chờ xác nhận</span>
          <h2 className="payment-status-title">Giao dịch đang xử lý</h2>
          <p className="payment-status-subtitle">
            Cổng thanh toán chưa trả kết quả cuối cùng. Bạn có thể kiểm tra lại sau vài giây hoặc quay về trang Premium.
          </p>
          
          <div className="premium-action-group">
            <button onClick={verifyPayment} className="btn-clean-primary">
              <FiRefreshCw className="btn-icon-left" /> Kiểm tra lại
            </button>
            <Link to="/premium" className="btn-clean-secondary">
              Quay lại trang Premium
            </Link>
          </div>
        </div>
      )}

      {(status === 'error' || status === 'invalid') && (
        <div className="premium-status-card payment-status-card error-card animate-fade-in">
          <div className="payment-status-icon payment-status-icon--error">
            <FiXCircle />
          </div>
          <span className="payment-status-label">Chưa kích hoạt Premium</span>
          <h2 className="payment-status-title">Thanh toán thất bại</h2>
          <p className="payment-status-subtitle">
            Hệ thống chưa thể xác minh giao dịch này. Bạn có thể thử lại hoặc liên hệ hỗ trợ nếu tài khoản đã bị trừ tiền.
          </p>
          <div className="error-help-box-clean">
            Nếu tài khoản của bạn đã bị trừ tiền, vui lòng gửi mã đơn hàng cho bộ phận hỗ trợ để được kiểm tra và kích hoạt thủ công.
          </div>

          <div className="premium-action-group">
            <Link to="/premium" className="btn-clean-primary">
              Thử lại
            </Link>
            <Link to="/dashboard" className="btn-clean-secondary">
              Về trang chủ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
