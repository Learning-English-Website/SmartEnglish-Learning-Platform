import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthContext } from '../context/AuthContext';
import { authAPI } from '../api/auth.api';

/**
 * useAuth — provides login, register, logout, and forgotPassword actions.
 * Tokens are stored in HttpOnly cookies set by the server — NO localStorage.
 */
export function useAuth() {
  const { user, isAuthenticated, loading, error, dispatch } = useAuthContext();
  const navigate = useNavigate();

  const login = useCallback(async ({ email, password }) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await authAPI.login({ email, password });
      // Server đã set HttpOnly cookies — chỉ cần lưu user vào state
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
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await authAPI.register({ email, username, password });
      // Server đã set HttpOnly cookies — chỉ cần lưu user vào state
      const { user } = res.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      toast.success(`Welcome to Memoris, ${user.username}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      toast.error(msg);
    }
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout(); // Server sẽ clearCookie + xóa Redis
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
      toast.success('Reset link sent! Check your email 📧');
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to send reset link';
      toast.error(msg);
      return false;
    }
  }, []);

  return { user, isAuthenticated, loading, error, login, register, logout, forgotPassword };
}

