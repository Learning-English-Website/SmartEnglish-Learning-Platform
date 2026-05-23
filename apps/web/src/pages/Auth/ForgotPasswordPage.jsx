import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Invalid email format'); return; }
    setError('');
    setSubmitting(true);
    try {
      const success = await forgotPassword({ email });
      if (success) setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!sent ? (
          <>
            <div className="auth-header">
              <div className="auth-logo">🔑</div>
              <h1 className="auth-title">Forgot password?</h1>
              <p className="auth-subtitle">We'll send a reset link to your email</p>
            </div>

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-4">
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <Form.Control
                    type="email"
                    id="forgot-email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    isInvalid={!!error}
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>
                <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
              </Form.Group>

              <Button
                type="submit"
                className="btn-auth-primary"
                disabled={submitting}
                id="forgot-submit"
              >
                {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Form>

            <p className="auth-footer-text">
              <Link to="/login" className="auth-link">
                <FiArrowLeft className="me-1" />
                Back to Login
              </Link>
            </p>
          </>
        ) : (
          <div className="auth-success">
            <div className="success-icon"><FiCheckCircle /></div>
            <h2>Check your email for reset instructions</h2>
            <p>
              If an account exists for <strong>{email}</strong>, you will receive a link shortly.
              The link expires in 15 minutes.
            </p>
            <Link to="/login" className="auth-link">
              <FiArrowLeft className="me-1" />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
