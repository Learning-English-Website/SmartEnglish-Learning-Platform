import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  loginUser,
  registerUser,
  verifyEmailOtp,
  resendVerificationOtp,
  logoutUser,
  forgotPassword,
  resetPasswordOtp,
  loadUser,
  clearError,
  selectAuth,
  resetAuth,
} from '../store/slices/authSlice';

/**
 * useAuth — provides auth state and actions using Redux.
 * All actions handle loading state, error handling, and success toasts.
 */
export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, requiresEmailVerification } = useSelector(selectAuth);

  const login = useCallback(async ({ email, password }, redirect) => {
    dispatch(clearError());
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success(`Chào mừng quay trở lại, ${result.payload.username}! 👋`);
      if (result.payload.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (result.payload.role === 'cskh') {
        navigate('/admin/users', { replace: true });
      } else if (result.payload.role === 'teacher') {
        navigate('/teacher/studio', { replace: true });
      } else {
        const dest = (redirect && redirect !== 'null' && redirect !== '/') ? redirect : '/dashboard';
        navigate(dest, { replace: true });
      }
    } else {
      toast.error(result.payload || 'Đăng nhập thất bại');
    }
  }, [dispatch, navigate]);

  const register = useCallback(async ({ email, username, password }) => {
    dispatch(clearError());
    const result = await dispatch(registerUser({ email, username, password }));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Mã OTP đã được gửi đến email của bạn. Xác thực để kích hoạt tài khoản.');
      return { requiresEmailVerification: true };
    } else {
      toast.error(result.payload || 'Đăng ký thất bại');
      return null;
    }
  }, [dispatch]);

  const verifyEmailOtpAction = useCallback(async ({ email, otp }) => {
    dispatch(clearError());
    const result = await dispatch(verifyEmailOtp({ email, otp }));
    if (verifyEmailOtp.fulfilled.match(result)) {
      toast.success('Xác thực email thành công! Tài khoản đã được kích hoạt.');
      if (result.payload.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (result.payload.role === 'cskh') {
        navigate('/admin/users', { replace: true });
      } else if (result.payload.role === 'teacher') {
        navigate('/teacher/studio', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return true;
    } else {
      toast.error(result.payload || 'Xác thực OTP thất bại');
      return false;
    }
  }, [dispatch, navigate]);

  const resendVerificationOtpAction = useCallback(async ({ email }) => {
    dispatch(clearError());
    const result = await dispatch(resendVerificationOtp({ email }));
    if (resendVerificationOtp.fulfilled.match(result)) {
      toast.success('Mã OTP mới đã được gửi đến email của bạn.');
      return true;
    } else {
      toast.error(result.payload || 'Gửi lại mã OTP thất bại');
      return false;
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    toast.success('Đăng xuất thành công');
    navigate('/login');
  }, [dispatch, navigate]);

  const forgotPasswordAction = useCallback(async ({ email }) => {
    dispatch(clearError());
    const result = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(result)) {
      toast.success('Đã gửi mã OTP! Vui lòng kiểm tra email 📧');
      return true;
    } else {
      toast.error(result.payload || 'Gửi mã OTP khôi phục thất bại');
      return false;
    }
  }, [dispatch]);

  const resetPasswordOtpAction = useCallback(async ({ email, otp, newPassword }) => {
    dispatch(clearError());
    const result = await dispatch(resetPasswordOtp({ email, otp, newPassword }));
    if (resetPasswordOtp.fulfilled.match(result)) {
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      navigate('/login');
      return true;
    } else {
      toast.error(result.payload || 'Đặt lại mật khẩu thất bại');
      return false;
    }
  }, [dispatch, navigate]);

  const loadCurrentUser = useCallback(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    requiresEmailVerification,
    login,
    register,
    verifyEmailOtp: verifyEmailOtpAction,
    resendVerificationOtp: resendVerificationOtpAction,
    logout,
    forgotPassword: forgotPasswordAction,
    resetPasswordOtp: resetPasswordOtpAction,
    loadUser: loadCurrentUser,
    clearError: () => dispatch(clearError()),
    resetAuth: () => dispatch(resetAuth()),
  };
}
