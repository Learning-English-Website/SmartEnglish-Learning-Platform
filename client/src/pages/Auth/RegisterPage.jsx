import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** Tiếng Việt — nêu cụ thể rule nào thiếu (thanh độ mạnh vẫn có thể "Fair" nếu thiếu chữ HOA) */
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
  const { register, verifyEmailOtp } = useAuth();
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);

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
    if (otpStep) {
      if (!/^\d{6}$/.test(otp)) {
        setErrors({ otp: 'Nhập OTP 6 chữ số.' });
        toast.error('Nhập OTP 6 chữ số.');
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        await verifyEmailOtp({ email: formData.email, otp });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstMsg = Object.values(errs)[0];
      toast.error(firstMsg);
      const scrollOrder = [
        ['email', 'register-email'],
        ['username', 'register-username'],
        ['password', 'register-password'],
        ['confirm', 'register-confirm'],
      ];
      for (const [key, domId] of scrollOrder) {
        if (errs[key]) {
          document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
      return;
    }
    setErrors({});
    const { confirm, ...submitData } = formData;
    setSubmitting(true);
    try {
      const result = await register(submitData);
      if (result?.requiresEmailVerification) {
        setOtpStep(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const backendUrl = apiUrl.replace(/\/api$/, '');
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  // Password strength indicator
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
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🧠</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">
            {otpStep ? `Enter OTP sent to ${formData.email}` : 'Start your learning journey today'}
          </p>
        </div>

        {!otpStep ? (
          <>
            <Button className="btn-google" variant="outline-secondary" onClick={handleGoogleLogin}>
              <FcGoogle size={20} />
              Sign up with Google
            </Button>

            <div className="auth-divider"><span>or</span></div>
          </>
        ) : null}

        <Form onSubmit={handleSubmit} noValidate>
          {otpStep ? (
            <Form.Group className="mb-3">
              <div className="input-wrapper">
                <FiMail className="input-icon" />
                <Form.Control
                  type="text"
                  name="otp"
                  id="register-otp"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                  }}
                  isInvalid={!!errors.otp}
                  className="auth-input"
                  autoComplete="one-time-code"
                />
              </div>
              {errors.otp ? <div className="auth-field-error" role="alert">{errors.otp}</div> : null}
            </Form.Group>
          ) : (
            <>
          {/* Email */}
          <Form.Group className="mb-3">
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <Form.Control
                type="email"
                name="email"
                id="register-email"
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

          {/* Username */}
          <Form.Group className="mb-3">
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <Form.Control
                type="text"
                name="username"
                id="register-username"
                placeholder="Username (3-30 chars, letters & numbers)"
                value={formData.username}
                onChange={handleChange}
                isInvalid={!!errors.username}
                className="auth-input"
                autoComplete="username"
              />
            </div>
            {errors.username ? <div className="auth-field-error" role="alert">{errors.username}</div> : null}
          </Form.Group>

          {/* Password */}
          <Form.Group className="mb-1">
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="register-password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                isInvalid={!!errors.password}
                className="auth-input"
                autoComplete="new-password"
              />
              <button type="button" className="input-toggle" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password ? <div className="auth-field-error" role="alert">{errors.password}</div> : null}
          </Form.Group>

          {/* Strength bar */}
          {formData.password && (
            <div className="strength-bar mb-3">
              <div className="strength-track">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`strength-segment ${i <= strength ? 'strength-on' : ''}`} />
                ))}
              </div>
              <span className="strength-label">{strengthLabel}</span>
            </div>
          )}

          {/* Confirm password */}
          <Form.Group className="mb-3">
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                name="confirm"
                id="register-confirm"
                placeholder="Confirm password"
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
            disabled={submitting}
            id="register-submit"
          >
            {submitting && <span className="spinner-border spinner-border-sm me-2" />}
            {submitting ? (otpStep ? 'Verifying OTP...' : 'Creating account...') : (otpStep ? 'Verify OTP' : 'Create Account')}
          </Button>
        </Form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
