import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PENDING_VERIFICATION_EMAIL_KEY = 'pending_verification_email';

const normalizeEmail = (value) => value.trim().toLowerCase();

function getInitialCooldown() {
  const savedExpiry = localStorage.getItem('otp_cooldown_expiry');
  if (!savedExpiry) return 0;

  const remaining = Math.ceil((parseInt(savedExpiry, 10) - Date.now()) / 1000);
  if (remaining > 0) return remaining;

  localStorage.removeItem('otp_cooldown_expiry');
  return 0;
}

function vietnamesePasswordRuleMessage(pw) {
  const p = pw || '';
  const parts = [];
  if (p.length < 8) parts.push('ít nhất 8 ký tự');
  if (!/[a-z]/.test(p)) parts.push('ít nhất một chữ thường');
  if (!/[A-Z]/.test(p)) parts.push('ít nhất một chữ HOA');
  if (!/\d/.test(p)) parts.push('ít nhất một chữ số');
  return parts.length ? `Mật khẩu cần: ${parts.join(', ')}.` : '';
}

export default function RegisterPage() {
  const {
    register,
    verifyEmailOtp,
    resendVerificationOtp,
    loading,
    resetAuth,
    isAuthenticated,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOtpStep = location.pathname === '/register/otp';
  const routeEmail = searchParams.get('email');
  const normalizedRouteEmail = routeEmail ? normalizeEmail(routeEmail) : '';
  const savedEmail = localStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || '';
  const effectiveEmail = normalizedRouteEmail || savedEmail;

  const [formData, setFormData] = useState({
    email: isOtpStep ? effectiveEmail : '',
    username: '',
    password: '',
    confirm: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [countdown, setCountdown] = useState(getInitialCooldown);
  const canResend = countdown === 0;

  const startCountdown = useCallback((seconds = 60) => {
    setCountdown(seconds);
    const expiry = Date.now() + seconds * 1000;
    localStorage.setItem('otp_cooldown_expiry', expiry.toString());
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('otp_cooldown_expiry');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (normalizedRouteEmail) {
      localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedRouteEmail);
    }
  }, [normalizedRouteEmail]);

  useEffect(() => {
    if (isOtpStep && !effectiveEmail) {
      navigate('/register', { replace: true });
    }
  }, [effectiveEmail, isOtpStep, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
      localStorage.removeItem('otp_cooldown_expiry');
    }
  }, [isAuthenticated]);

  const handleRestart = () => {
    localStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
    localStorage.removeItem('otp_cooldown_expiry');
    resetAuth();
    setOtp('');
    setCountdown(0);
    setErrors({});
    setFormData({ email: '', username: '', password: '', confirm: '' });
    navigate('/register');
  };

  const validate = () => {
    const errs = {};
    if (!formData.email) errs.email = 'Nhập email.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email không đúng định dạng.';
    if (!formData.username) errs.username = 'Nhập tên đăng nhập.';
    else if (formData.username.length < 3) errs.username = 'Tên đăng nhập tối thiểu 3 ký tự.';
    else if (formData.username.length > 30) errs.username = 'Tên đăng nhập tối đa 30 ký tự.';
    else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) errs.username = 'Chỉ dùng chữ cái và số.';
    if (!formData.password) errs.password = 'Nhập mật khẩu.';
    else if (!PASSWORD_REGEX.test(formData.password)) {
      errs.password =
        vietnamesePasswordRuleMessage(formData.password)
        || 'Mật khẩu cần có chữ hoa, chữ thường và số (tối thiểu 8 ký tự).';
    }
    if (!formData.confirm) errs.confirm = 'Nhập lại mật khẩu.';
    else if (formData.password !== formData.confirm) errs.confirm = 'Hai mật khẩu không trùng nhau.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOtpStep) {
      if (!/^\d{6}$/.test(otp)) {
        setErrors({ otp: 'Nhập OTP 6 chữ số.' });
        return;
      }
      setErrors({});
      await verifyEmailOtp({ email: effectiveEmail, otp });
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    const submitData = {
      email: formData.email,
      username: formData.username,
      password: formData.password,
    };
    const result = await register(submitData);
    if (result?.requiresEmailVerification) {
      const normalizedEmail = normalizeEmail(formData.email);
      localStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, normalizedEmail);
      startCountdown(60);
      navigate(`/register/otp?email=${encodeURIComponent(normalizedEmail)}`);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    const result = await resendVerificationOtp({ email: effectiveEmail });
    if (result) {
      startCountdown(60);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    const redirect = searchParams.get('redirect') || '/';
    window.location.href = `${backendUrl}/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
  };

  const getStrength = () => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  };

  const strength = getStrength();
  const strengthLabel = ['', 'Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][strength];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/uploads/logo_app.png" alt="Memoris Logo" style={{ height: '48px', objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-subtitle">
            {isOtpStep ? `Nhập mã OTP đã gửi tới ${effectiveEmail}` : 'Bắt đầu hành trình học tập của bạn ngay hôm nay'}
          </p>
        </div>

        {!isOtpStep ? (
          <>
            <Button className="btn-google" variant="outline-secondary" onClick={handleGoogleLogin}>
              <FcGoogle size={20} />
              Đăng ký với Google
            </Button>

            <div className="auth-divider"><span>hoặc</span></div>
          </>
        ) : null}

        <Form onSubmit={handleSubmit} noValidate>
          {isOtpStep ? (
            <>
              <Form.Group className="mb-3">
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <Form.Control
                    type="text"
                    name="otp"
                    id="register-otp"
                    placeholder="Mã OTP gồm 6 chữ số"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                    }}
                    isInvalid={!!errors.otp}
                    className="auth-input"
                    autoComplete="one-time-code"
                  />
                </div>
                {errors.otp ? <div className="auth-field-error" role="alert">{errors.otp}</div> : null}
              </Form.Group>

              <div className="otp-actions mb-4">
                {countdown > 0 ? (
                  <p className="countdown-text">
                    Gửi lại mã sau <strong>{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="otp-link-button"
                    onClick={handleResendOtp}
                  >
                    Gửi lại mã xác nhận
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRestart}
                  className="otp-link-button otp-link-button-secondary"
                >
                  Sử dụng email khác
                </button>
              </div>
            </>
          ) : (
            <>
              <Form.Group className="mb-3">
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <Form.Control
                    type="email"
                    name="email"
                    id="register-email"
                    placeholder="Địa chỉ email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>
                {errors.email ? <div className="auth-field-error" role="alert">{errors.email}</div> : null}
              </Form.Group>

              <Form.Group className="mb-3">
                <div className="input-wrapper">
                  <FiUser className="input-icon" />
                  <Form.Control
                    type="text"
                    name="username"
                    id="register-username"
                    placeholder="Tên đăng nhập (3-30 ký tự, chữ và số)"
                    value={formData.username}
                    onChange={handleChange}
                    isInvalid={!!errors.username}
                    className="auth-input"
                    autoComplete="username"
                  />
                </div>
                {errors.username ? <div className="auth-field-error" role="alert">{errors.username}</div> : null}
              </Form.Group>

              <Form.Group className="mb-1">
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="register-password"
                    placeholder="Mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    className="auth-input"
                    autoComplete="new-password"
                  />
                  <button type="button" className="input-toggle" onClick={() => setShowPassword((p) => !p)} tabIndex={-1}>
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password ? <div className="auth-field-error" role="alert">{errors.password}</div> : null}
              </Form.Group>

              {formData.password && (
                <div className="strength-bar mb-3">
                  <div className="strength-track">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`strength-segment ${i <= strength ? 'strength-on' : ''}`} />
                    ))}
                  </div>
                  <span className="strength-label">{strengthLabel}</span>
                </div>
              )}

              <Form.Group className="mb-3">
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="confirm"
                    id="register-confirm"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirm}
                    onChange={handleChange}
                    isInvalid={!!errors.confirm}
                    className="auth-input"
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirm ? <div className="auth-field-error" role="alert">{errors.confirm}</div> : null}
              </Form.Group>
            </>
          )}

          <Button
            type="submit"
            className="btn-auth-primary"
            disabled={loading}
            id="register-submit"
          >
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            {loading ? (isOtpStep ? 'Đang xác thực OTP...' : 'Đang tạo tài khoản...') : (isOtpStep ? 'Xác thực OTP' : 'Tạo tài khoản')}
          </Button>
        </Form>

        <p className="auth-footer-text">
          {!isOtpStep ? (
            <>
              Đã có tài khoản?{' '}
              <Link to="/login" className="auth-link">Đăng nhập</Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
