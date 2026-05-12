import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  loginUser,
  registerUser,
  verifyEmailOtp,
  logoutUser,
  forgotPassword,
  resetPasswordOtp,
  loadUser,
  clearError,
  selectAuth,
} from '../store/slices/authSlice';

/**
 * useAuth — provides auth state and actions using Redux.
 * All actions handle loading state, error handling, and success toasts.
 */
export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, requiresEmailVerification } = useSelector(selectAuth);

  const login = useCallback(async ({ email, password }) => {
    dispatch(clearError());
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.username}! 👋`);
      navigate('/dashboard');
    } else {
      toast.error(result.payload || 'Login failed');
    }
  }, [dispatch, navigate]);

  const register = useCallback(async ({ email, username, password }) => {
    dispatch(clearError());
    const result = await dispatch(registerUser({ email, username, password }));
    if (registerUser.fulfilled.match(result)) {
      toast.success('OTP sent to your email. Verify to activate account.');
      return { requiresEmailVerification: true };
    } else {
      toast.error(result.payload || 'Registration failed');
      return null;
    }
  }, [dispatch]);

  const verifyEmailOtpAction = useCallback(async ({ email, otp }) => {
    dispatch(clearError());
    const result = await dispatch(verifyEmailOtp({ email, otp }));
    if (verifyEmailOtp.fulfilled.match(result)) {
      toast.success('Email verified! Account activated.');
      navigate('/dashboard');
      return true;
    } else {
      toast.error(result.payload || 'OTP verification failed');
      return false;
    }
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    toast.success('Logged out successfully');
    navigate('/login');
  }, [dispatch, navigate]);

  const forgotPasswordAction = useCallback(async ({ email }) => {
    dispatch(clearError());
    const result = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(result)) {
      toast.success('OTP sent! Check your email 📧');
      return true;
    } else {
      toast.error(result.payload || 'Failed to send reset OTP');
      return false;
    }
  }, [dispatch]);

  const resetPasswordOtpAction = useCallback(async ({ email, otp, newPassword }) => {
    dispatch(clearError());
    const result = await dispatch(resetPasswordOtp({ email, otp, newPassword }));
    if (resetPasswordOtp.fulfilled.match(result)) {
      toast.success('Password reset successful. Please sign in.');
      navigate('/login');
      return true;
    } else {
      toast.error(result.payload || 'Failed to reset password');
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
    logout,
    forgotPassword: forgotPasswordAction,
    resetPasswordOtp: resetPasswordOtpAction,
    loadUser: loadCurrentUser,
    clearError: () => dispatch(clearError()),
  };
}
