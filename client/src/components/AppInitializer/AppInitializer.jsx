import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser, selectAuthLoading } from '../../store/slices/authSlice';

/**
 * AppInitializer — dispatches loadUser on app startup.
 * Shows a loading spinner while auth state is being determined.
 * This ensures ProtectedRoute works correctly.
 */
export default function AppInitializer({ children }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  if (loading) {
    return null;
  }

  return children;
}
