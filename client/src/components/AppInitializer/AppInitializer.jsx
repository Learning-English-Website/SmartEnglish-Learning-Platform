import { useEffect, useState } from 'react';
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
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  useEffect(() => {
    if (!loading) {
      setHasInitialized(true);
    }
  }, [loading]);

  if (loading && !hasInitialized) {
    return null;
  }

  return children;
}
