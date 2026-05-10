import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { authAPI } from '../../api/auth.api';
import LoadingSpinner from '../../components/common/LoadingSpinner/LoadingSpinner';

/**
 * Trang xử lý callback sau khi đăng nhập Google thành công.
 * Backend đã set HttpOnly cookies — trang này chỉ cần gọi /api/users/me
 * để lấy thông tin user và cập nhật state, rồi chuyển về /dashboard.
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useAuthContext();

  useEffect(() => {
    // Kiểm tra nếu backend redirect kèm lỗi
    const error = searchParams.get('error');
    if (error) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    dispatch({ type: 'AUTH_LOADING' });

    // Cookie đã được set bởi backend — axiosClient tự gửi cookie (withCredentials: true)
    authAPI.getMe()
      .then((res) => {
        if (res.success && res.data) {
          dispatch({ type: 'SET_USER', payload: res.data });
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=oauth_failed', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, [searchParams, navigate, dispatch]);

  return <LoadingSpinner fullScreen text="Đang đăng nhập bằng Google..." />;
}

