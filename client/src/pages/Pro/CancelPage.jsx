import { Link } from 'react-router-dom';

export default function CancelPage() {
  return (
    <div className="cancel-page">
      <div className="status-card">
        <span className="icon">😔</span>
        <h2>Đã hủy</h2>
        <p>Thanh toán đã bị hủy. Bạn có thể thử lại bất kỳ lúc nào.</p>
        <Link to="/premium" className="btn-primary">
          Quay lại trang Premium
        </Link>
      </div>
    </div>
  );
}
