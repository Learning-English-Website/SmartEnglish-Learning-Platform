import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';

/**
 * PublicSetRoute - cho phép xem set public mà không cần login.
 * Nếu set là private và user chưa login -> redirect login.
 * Nếu set là public -> cho xem (có hoặc không có login).
 */
export default function PublicSetRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Luôn cho phép xem (dù có login hay không)
  // Check private/public set sẽ được handle trong SetDetail page
  return children;
}
