import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import './Auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, login, loading } = useAuth();
  const errorHandled = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'teacher') {
        navigate('/teacher/studio', { replace: true });
      } else {
        const redirect = searchParams.get('redirect') || '/dashboard';
        navigate(redirect, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (!errorHandled.current) {
        errorHandled.current = true;
        if (errorParam === 'locked') {
          toast.error('Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.');
        } else {
          toast.error('Đăng nhập bằng Google thất bại.');
        }
      }
      const redirect = searchParams.get('redirect');
      const dest = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
      navigate(dest, { replace: true });
    } else {
      errorHandled.current = false;
    }
  }, [searchParams, navigate]);

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    const redirect = searchParams.get('redirect') || '/';
    window.location.href = `${backendUrl}/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
  };

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Nhập email.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email không đúng định dạng.';
    if (!formData.password) errs.password = 'Nhập mật khẩu.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const redirect = searchParams.get('redirect');
    await login(formData, redirect);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">🧠</div>
          <h1 className="auth-title">Chào mừng quay trở lại</h1>
          <p className="auth-subtitle">Đăng nhập để tiếp tục học tập</p>
        </div>

        {/* Google Button */}
        <Button className="btn-google" variant="outline-secondary" onClick={handleGoogleLogin}>
          <FcGoogle size={20} />
          Đăng nhập với Google
        </Button>

        <div className="auth-divider"><span>hoặc</span></div>

        {/* Form */}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3">
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <Form.Control
                type="email"
                name="email"
                id="login-email"
                placeholder="Địa chỉ Email"
                value={formData.email}
                onChange={handleChange}
                isInvalid={!!errors.email}
                className="auth-input"
                autoComplete="email"
              />
            </div>
            {errors.email ? <div className="auth-field-error" role="alert">{errors.email}</div> : null}
          </Form.Group>

          <Form.Group className="mb-2">
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="login-password"
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                isInvalid={!!errors.password}
                className="auth-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password ? <div className="auth-field-error" role="alert">{errors.password}</div> : null}
          </Form.Group>

          <div className="text-end mb-3">
            <Link to="/forgot-password" className="auth-link-small">Quên mật khẩu?</Link>
          </div>

          <Button
            type="submit"
            className="btn-auth-primary"
            disabled={loading}
            id="login-submit"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </Form>

        <p className="auth-footer-text">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">Đăng ký miễn phí</Link>
        </p>
      </div>
    </div>
  );
}
