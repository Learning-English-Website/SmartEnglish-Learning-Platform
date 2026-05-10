import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth.api';

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// ── Reducer ───────────────────────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case 'LOAD_DONE':
      return { ...state, loading: false };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * On mount: gọi /api/users/me để kiểm tra phiên đăng nhập.
   * Cookie HttpOnly được gửi tự động bởi axiosClient (withCredentials: true).
   */
  const loadUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      dispatch({ type: 'SET_USER', payload: res.data });
    } catch {
      // Chưa đăng nhập hoặc cookie hết hạn
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ ...state, dispatch, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
