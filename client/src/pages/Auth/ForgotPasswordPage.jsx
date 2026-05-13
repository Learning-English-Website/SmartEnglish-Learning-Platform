import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiArrowLeft, FiCheckCircle, FiLock } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { selectAuthLoading } from '../../store/slices/authSlice';
import './Auth.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PENDING_RESET_EMAIL_KEY = 'pending_reset_email';

const normalizeEmail = (value) => value.trim().toLowerCase();

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPasswordOtp } = useAuth();
  const loading = useSelector(selectAuthLoading);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOtpStep = location.pathname === '/forgot-password/otp';
  const routeEmail = searchParams.get('email');
  const normalizedRouteEmail = routeEmail ? normalizeEmail(routeEmail) : '';
  const savedEmail = localStorage.getItem(PENDING_RESET_EMAIL_KEY) || '';

  const [email, setEmail] = useState(normalizedRouteEmail || savedEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const effectiveEmail = normalizedRouteEmail || savedEmail || email;

  useEffect(() => {
    if (normalizedRouteEmail) {
      localStorage.setItem(PENDING_RESET_EMAIL_KEY, normalizedRouteEmail);
    }
  }, [normalizedRouteEmail]);

  useEffect(() => {
    if (isOtpStep && !effectiveEmail) {
      navigate('/forgot-password', { replace: true });
    }
  }, [effectiveEmail, isOtpStep, navigate]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: 'Nhập email.' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Email không đúng định dạng.' });
      return;
    }
    setErrors({});
    const normalizedEmail = normalizeEmail(email);
    const success = await forgotPassword({ email: normalizedEmail });
    if (success) {
      localStorage.setItem(PENDING_RESET_EMAIL_KEY, normalizedEmail);
      navigate(`/forgot-password/otp?email=${encodeURIComponent(normalizedEmail)}`);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!otp || !/^\d{6}$/.test(otp)) nextErrors.otp = 'Nhập OTP 6 chữ số.';
    if (!newPassword) nextErrors.newPassword = 'Nhập mật khẩu mới.';
    else if (!PASSWORD_REGEX.test(newPassword)) {
      nextErrors.newPassword = 'Mật khẩu cần tối thiểu 8 ký tự, có chữ hoa, chữ thường và số.';
    }
    if (!confirmPassword) nextErrors.confirmPassword = 'Nhập lại mật khẩu mới.';
    else if (confirmPassword !== newPassword) nextErrors.confirmPassword = 'Hai mật khẩu không trùng nhau.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const success = await resetPasswordOtp({ email: effectiveEmail, otp, newPassword });
    if (success) {
      localStorage.removeItem(PENDING_RESET_EMAIL_KEY);
    }
  };

  const handleChangeEmail = () => {
    localStorage.removeItem(PENDING_RESET_EMAIL_KEY);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    navigate('/forgot-password');
  };

  const renderRequestForm = () => (
    <>
      <div className="auth-header">
        <div className="auth-logo">🔑</div>
        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-subtitle">We'll send a reset OTP to your email</p>
      </div>

      <Form onSubmit={handleRequestOtp} noValidate>
        <Form.Group className="mb-4">
          <div className="input-wrapper">
            <FiMail className="input-icon" />
            <Form.Control
              type="email"
              id="forgot-email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
              isInvalid={!!errors.email}
              className="auth-input"
              autoComplete="email"
            />
          </div>
          {errors.email ? <div className="auth-field-error">{errors.email}</div> : null}
        </Form.Group>

        <Button type="submit" className="btn-auth-primary" disabled={loading} id="forgot-submit">
          {loading && <span className="spinner-border spinner-border-sm me-2" />}
          {loading ? 'Sending...' : 'Send Reset OTP'}
        </Button>
      </Form>
    </>
  );

  const renderResetForm = () => (
    <div className="auth-success">
      <div className="success-icon"><FiCheckCircle /></div>
      <h2>Check your email for reset OTP</h2>
      <p>
        If an account exists for <strong>{effectiveEmail}</strong>, you will receive an OTP shortly.
        The OTP expires in 10 minutes.
      </p>

      <Form onSubmit={handleResetPassword} noValidate>
        <Form.Group className="mb-3">
          <div className="input-wrapper">
            <FiMail className="input-icon" />
            <Form.Control
              type="text"
              placeholder="OTP code (6 digits)"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors((prev) => ({ ...prev, otp: '' })); }}
              isInvalid={!!errors.otp}
              className="auth-input"
              autoComplete="one-time-code"
            />
          </div>
          {errors.otp ? <div className="auth-field-error">{errors.otp}</div> : null}
        </Form.Group>

        <Form.Group className="mb-3">
          <div className="input-wrapper">
            <FiLock className="input-icon" />
            <Form.Control
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors((prev) => ({ ...prev, newPassword: '' })); }}
              isInvalid={!!errors.newPassword}
              className="auth-input"
              autoComplete="new-password"
            />
          </div>
          {errors.newPassword ? <div className="auth-field-error">{errors.newPassword}</div> : null}
        </Form.Group>

        <Form.Group className="mb-3">
          <div className="input-wrapper">
            <FiLock className="input-icon" />
            <Form.Control
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
              isInvalid={!!errors.confirmPassword}
              className="auth-input"
              autoComplete="new-password"
            />
          </div>
          {errors.confirmPassword ? <div className="auth-field-error">{errors.confirmPassword}</div> : null}
        </Form.Group>

        <Button type="submit" className="btn-auth-primary" disabled={loading}>
          {loading && <span className="spinner-border spinner-border-sm me-2" />}
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </Form>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!isOtpStep ? renderRequestForm() : renderResetForm()}
        <p className="auth-footer-text">
          {isOtpStep ? (
            <button
              type="button"
              onClick={handleChangeEmail}
              className="auth-link"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <FiArrowLeft className="me-1" />
              Use another email
            </button>
          ) : (
            <Link to="/login" className="auth-link">
              <FiArrowLeft className="me-1" />
              Back to Login
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
