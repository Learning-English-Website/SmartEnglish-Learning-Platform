import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Shows a loading spinner while auth state is being determined.
 * Redirects to /login if not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
