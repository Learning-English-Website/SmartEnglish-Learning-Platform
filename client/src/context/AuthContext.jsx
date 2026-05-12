/**
 * AuthContext — now a thin wrapper around Redux.
 * Kept for backwards compatibility with existing components.
 * All auth state and actions are now managed by Redux (authSlice).
 *
 * New code should use the `useAuth` hook instead.
 */
import { useSelector, useDispatch } from 'react-redux';
import { selectAuth, setUser, clearError } from '../store/slices/authSlice';

// Re-export actions for convenience
export { clearError, setUser, resetAuth } from '../store/slices/authSlice';
export { loadUser, loginUser, registerUser, verifyEmailOtp, logoutUser, forgotPassword, resetPasswordOtp, updateProfile } from '../store/slices/authSlice';

// Selectors
export const useAuthContext = () => {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);

  return {
    ...auth,
    dispatch,
  };
};

// Provider — now just renders children (Redux Provider is in App.jsx)
// Kept for backwards compatibility
export function AuthProvider({ children }) {
  return children;
}
