import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const handleGoogleLogin = () => {
    // VITE_API_URL already contains /api (e.g. http://localhost:5000/api)
    // Strip /api to get the base server URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    window.location.href = `${backendUrl}/api/auth/google`;
  };
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
      toast.error(Object.values(errs)[0]);
      const sid = errs.email ? 'login-email' : 'login-password';
      document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(formData);
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue learning</p>
        </div>

        {/* Google Button */}
        {/* Google Button */}
        <Button className="btn-google" variant="outline-secondary" onClick={handleGoogleLogin}>
          <FcGoogle size={20} />
          Sign in with Google
        </Button>

        <div className="auth-divider"><span>or</span></div>

        {/* Form */}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3">
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <Form.Control
                type="email"
                name="email"
                id="login-email"
                placeholder="Email address"
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
                placeholder="Password"
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
            <Link to="/forgot-password" className="auth-link-small">Forgot Password?</Link>
          </div>

          <Button
            type="submit"
            className="btn-auth-primary"
            disabled={submitting}
            id="login-submit"
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </Form>

        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
