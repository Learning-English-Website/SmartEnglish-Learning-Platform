import { Navigate } from 'react-router-dom';
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

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
