import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiArrowLeft, FiCheckCircle, FiLock } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPasswordOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      const success = await forgotPassword({ email });
      if (success) setSent(true);
    } finally {
      setSubmitting(false);
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
    setSubmitting(true);
    try {
      await resetPasswordOtp({ email, otp, newPassword });
    } finally {
      setSubmitting(false);
    }
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

        <Button type="submit" className="btn-auth-primary" disabled={submitting} id="forgot-submit">
          {submitting && <span className="spinner-border spinner-border-sm me-2" />}
          {submitting ? 'Sending...' : 'Send Reset OTP'}
        </Button>
      </Form>
    </>
  );

  const renderResetForm = () => (
    <div className="auth-success">
      <div className="success-icon"><FiCheckCircle /></div>
      <h2>Check your email for reset OTP</h2>
      <p>
        If an account exists for <strong>{email}</strong>, you will receive an OTP shortly.
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

        <Button type="submit" className="btn-auth-primary" disabled={submitting}>
          {submitting && <span className="spinner-border spinner-border-sm me-2" />}
          {submitting ? 'Resetting...' : 'Reset Password'}
        </Button>
      </Form>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!sent ? renderRequestForm() : renderResetForm()}
        <p className="auth-footer-text">
          <Link to="/login" className="auth-link">
            <FiArrowLeft className="me-1" />
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
