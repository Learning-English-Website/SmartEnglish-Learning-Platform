import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading, selectUser } from '../../store/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';

/**
 * AdminRoute — wraps routes that require admin role.
 * Shows a loading spinner while auth state is being determined.
 * Redirects to /dashboard if not admin.
 */
export default function AdminRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'cskh') {
    return <Navigate to="/dashboard" replace />;
  }

  if (user?.role === 'cskh') {
    const allowedPrefixes = [
      '/admin/users',
      '/admin/orders',
      '/admin/feedback',
      '/admin/support-chat'
    ];
    const isAllowed = allowedPrefixes.some(prefix => 
      location.pathname === prefix || location.pathname.startsWith(prefix + '/')
    );
    if (!isAllowed) {
      return <Navigate to="/admin/users" replace />;
    }
  }

  return children;
}
