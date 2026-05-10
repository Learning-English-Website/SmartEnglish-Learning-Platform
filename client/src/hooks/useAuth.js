import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthContext } from '../context/AuthContext';
import { authAPI } from '../api/auth.api';

/**
 * useAuth — provides login, register, logout, and forgotPassword actions.
 * All actions handle loading state, error handling, and success toasts.
 */
export function useAuth() {
  const { user, isAuthenticated, loading, error, dispatch } = useAuthContext();
  const navigate = useNavigate();

  const login = useCallback(async ({ email, password }) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await authAPI.login({ email, password });
      const { user } = res.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      toast.success(`Welcome back, ${user.username}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      toast.error(msg);
    }
  }, [dispatch, navigate]);

  const register = useCallback(async ({ email, username, password }) => {
    try {
      const res = await authAPI.register({ email, username, password });
      toast.success('OTP sent to your email. Verify to activate account.');
      dispatch({ type: 'LOAD_DONE' });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      toast.error(msg);
      return null;
    }
  }, [dispatch]);

  const verifyEmailOtp = useCallback(async ({ email, otp }) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await authAPI.verifyEmailOtp({ email, otp });
      const { user } = res.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      toast.success('Email verified! Account activated.');
      navigate('/dashboard');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'OTP verification failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      toast.error(msg);
      return false;
    }
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore errors — always clear local state
    } finally {
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
      navigate('/login');
    }
  }, [dispatch, navigate]);

  const forgotPassword = useCallback(async ({ email }) => {
    try {
      await authAPI.forgotPassword({ email });
      toast.success('OTP sent! Check your email 📧');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to send reset OTP';
      toast.error(msg);
      return false;
    }
  }, []);

  const resetPasswordOtp = useCallback(async ({ email, otp, newPassword }) => {
    try {
      await authAPI.resetPasswordOtp({ email, otp, newPassword });
      toast.success('Password reset successful. Please sign in.');
      navigate('/login');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to reset password';
      toast.error(msg);
      return false;
    }
  }, [navigate]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    verifyEmailOtp,
    logout,
    forgotPassword,
    resetPasswordOtp,
  };
}

