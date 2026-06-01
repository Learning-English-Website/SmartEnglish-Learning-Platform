import { useState } from 'react';
import { paymentService } from '../../services/paymentService';
import './ProPage.css';

export default function ProPage() {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [methods] = useState({
    momo: {
      name: 'MoMo',
      icon: '/momo-logo.png',
      description: 'Quét mã QR bằng ứng dụng MoMo',
    },
    payos: {
      name: 'PayOS',
      icon: '/payos-logo.png',
      description: 'Thanh toán qua QR VietQR với ngân hàng bất kỳ',
    },
  });

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const data = await paymentService.createCheckout(selectedMethod);
      window.location.href = data.data.payUrl || data.data.checkoutUrl;
    } catch (err) {
      console.error('Checkout failed', err);
      alert(err.response?.data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page-container">
      {/* Hero Section */}
      <div className="pro-hero-section">
        <span className="premium-label">SmartEnglish Premium</span>
        <h1 className="pro-hero-title">Đầu tư cho tương lai ngôn ngữ của bạn</h1>
        <p className="pro-hero-subtitle">
          Chỉ với 5.000đ/tháng, nâng cấp ngay để mở khóa toàn bộ tính năng và loại bỏ mọi giới hạn học tập.
        </p>
      </div>

      <div className="pro-main-content">
        {/* Left Column: Premium Features list */}
        <div className="pro-features-column">
          <h2 className="section-title">Tính năng đặc quyền Premium</h2>
          <div className="features-list-clean">
            <div className="feature-item-clean">
              <div className="feature-icon-clean red-theme">❤️</div>
              <div className="feature-text-clean">
                <h3>Sinh mệnh vô hạn (Infinite Hearts)</h3>
                <p>Học tập liên tục không bao giờ sợ hết tim. Tự do vượt qua mọi thử thách.</p>
              </div>
            </div>
            
            <div className="feature-item-clean blue-theme">
              <div className="feature-icon-clean">🔥</div>
              <div className="feature-text-clean">
                <h3>Bảo hiểm Streak tự động</h3>
                <p>Cấp 3 lượt tự động giữ chuỗi ngày học liên tục mỗi tháng nếu bạn lỡ quên học.</p>
              </div>
            </div>

            <div className="feature-item-clean green-theme">
              <div className="feature-icon-clean">📚</div>
              <div className="feature-text-clean">
                <h3>Tạo bộ thẻ không giới hạn</h3>
                <p>Vượt qua giới hạn tối đa 5 bộ thẻ học của tài khoản thường. Tạo không giới hạn thư viện học tập.</p>
              </div>
            </div>

            <div className="feature-item-clean amber-theme">
              <div className="feature-icon-clean">🗂️</div>
              <div className="feature-text-clean">
                <h3>Thêm từ vựng không giới hạn</h3>
                <p>Thêm bao nhiêu từ tùy thích vào mỗi bộ thẻ học (tài khoản thường bị giới hạn 30 từ mỗi bộ).</p>
              </div>
            </div>

            <div className="feature-item-clean purple-theme">
              <div className="feature-icon-clean">🏆</div>
              <div className="feature-text-clean">
                <h3>Huy hiệu Premium độc quyền</h3>
                <p>Sở hữu nhãn hổ phách Premium soft-gold lấp lánh trên bảng xếp hạng và trang cá nhân.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Card */}
        <div className="pro-checkout-column">
          <div className="checkout-card-clean">
            <div className="card-badge-gold">ĐƯỢC YÊU THÍCH</div>
            <h3 className="plan-name">Gói Thành Viên Tháng</h3>
            <div className="price-tag-clean">
              <span className="amount">5.000đ</span>
              <span className="period">/ tháng</span>
            </div>
            <p className="plan-description">Không cam kết dài hạn. Tự do hủy gia hạn bất kỳ lúc nào.</p>

            <div className="payment-selectors-clean">
              <h4 className="selector-title">Chọn phương thức thanh toán</h4>
              
              <div 
                className={`payment-card-option ${selectedMethod === 'momo' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('momo')}
              >
                <div className="option-radio">
                  <div className="radio-dot" />
                </div>
                <img src={methods.momo?.icon} alt="MoMo" className="pay-icon" />
                <div className="pay-details">
                  <span className="pay-title">Ví điện tử MoMo</span>
                  <span className="pay-sub">Thanh toán nhanh qua QR MoMo</span>
                </div>
              </div>

              <div 
                className={`payment-card-option ${selectedMethod === 'payos' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('payos')}
              >
                <div className="option-radio">
                  <div className="radio-dot" />
                </div>
                <img src={methods.payos?.icon} alt="PayOS" className="pay-icon" />
                <div className="pay-details">
                  <span className="pay-title">Cổng VietQR (PayOS)</span>
                  <span className="pay-sub">Quét mã QR bằng mọi ngân hàng Việt Nam</span>
                </div>
              </div>
            </div>

            <button 
              className="btn-pro-pay-clean" 
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <span className="pay-spinner-glow">
                  <span className="mini-spinner" />
                  Đang chuẩn bị cổng thanh toán...
                </span>
              ) : 'Nâng cấp ngay'}
            </button>

            <p className="checkout-footer-note">
              Giao dịch của bạn được bảo mật tuyệt đối. Hóa đơn điện tử sẽ được gửi về email tài khoản của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
