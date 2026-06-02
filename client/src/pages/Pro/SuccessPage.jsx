import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loadUser } from '../../store/slices/authSlice';
import { paymentService } from '../../services/paymentService';
import { FiCheck, FiAlertTriangle, FiArrowRight, FiUser } from 'react-icons/fi';
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

  return (
    <div className="payment-status-container clean-layout">
      {status === 'verifying' && (
        <div className="premium-status-card clean-card loading-card">
          <div className="spinner-glow-container">
            <div className="premium-spinner"></div>
          </div>
          <h2 className="loading-text">Đang xác minh giao dịch</h2>
          <p>Vui lòng đợi giây lát để hệ thống cập nhật gói của bạn...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="premium-status-card clean-card success-card animate-fade-in">
          {/* Minimalist checkmark */}
          <div className="checkmark-wrapper-clean">
            <div className="checkmark-circle-clean">
              <FiCheck className="checkmark-icon-clean" />
            </div>
          </div>

          <h2 className="success-title-clean">Thanh toán thành công</h2>
          <p className="success-subtitle-clean">Tài khoản của bạn đã được nâng cấp lên gói **Memoris Pro**.</p>

          {/* Receipt Section */}
          <div className="premium-receipt-clean">
            <h3 className="receipt-title-clean">Thông tin giao dịch</h3>
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
                  <span className="receipt-value message-value">{decodeURIComponent(orderInfo)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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
        <div className="premium-status-card clean-card pending-card animate-fade-in">
          <div className="warning-icon-wrapper-clean">
            <FiAlertTriangle className="warning-icon" />
          </div>
          <h2 className="pending-title-clean">Giao dịch đang xử lý</h2>
          <p className="success-subtitle-clean">Thanh toán đang được hệ thống xử lý. Vui lòng kiểm tra lại sau ít phút.</p>
          
          <div className="premium-action-group">
            <button onClick={verifyPayment} className="btn-clean-primary">
              Kiểm tra lại
            </button>
            <Link to="/premium" className="btn-clean-secondary">
              Quay lại trang Premium
            </Link>
          </div>
        </div>
      )}

      {(status === 'error' || status === 'invalid') && (
        <div className="premium-status-card clean-card error-card animate-fade-in">
          <div className="error-icon-wrapper-clean">
            <span className="error-cross-clean">×</span>
          </div>
          <h2 className="error-title-clean">Thanh toán thất bại</h2>
          <p className="success-subtitle-clean">Có lỗi xảy ra trong quá trình xác minh thanh toán.</p>
          <div className="error-help-box-clean">
            Nếu tài khoản của bạn đã bị trừ tiền, vui lòng liên hệ bộ phận hỗ trợ để được kích hoạt gói thủ công.
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
