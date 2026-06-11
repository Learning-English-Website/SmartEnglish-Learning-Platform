import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading, selectUser } from '../../store/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';

/**
 * TeacherRoute — wraps routes that require teacher or admin role.
 * Shows a loading spinner while auth state is being determined.
 * Redirects to /dashboard if not authorized.
 */
export default function TeacherRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins are allowed to access Teacher sections (Superuser concept)
  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
