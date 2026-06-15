import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Container } from 'react-bootstrap';
import { FiUser, FiLink, FiArrowLeft } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { selectAuthLoading } from '../../store/slices/authSlice';
import { updateProfile } from '../../store/slices/authSlice';
import ImageUploader from '../../components/media/ImageUploader';
import './ProfilePage.css';

export default function EditProfilePage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectAuthLoading);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    avatar: user?.avatar || '',
    emailReminderEnabled: user?.emailReminderEnabled ?? true,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.username) errs.username = 'Tên đăng nhập là bắt buộc';
    else if (formData.username.length < 3) errs.username = 'Tên đăng nhập tối thiểu 3 ký tự';
    else if (formData.username.length > 30) errs.username = 'Tên đăng nhập tối đa 30 ký tự';
    else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) errs.username = 'Chỉ dùng chữ cái và số';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const result = await dispatch(updateProfile({
      username: formData.username,
      ...(formData.avatar ? { avatar: formData.avatar } : {}),
      emailReminderEnabled: formData.emailReminderEnabled,
    }));

    if (updateProfile.fulfilled.match(result)) {
      toast.success('Cập nhật hồ sơ thành công! ✅');
      navigate('/profile');
    } else {
      toast.error(result.payload || 'Cập nhật thất bại');
    }
  };

  return (
    <div className="profile-page">
      <Container className="profile-container">
        <Link to="/profile" className="back-link">
          <FiArrowLeft /> Quay lại Hồ sơ
        </Link>

        <div className="profile-card" style={{ marginTop: '1rem' }}>
          <h2 className="profile-edit-title">Chỉnh sửa hồ sơ</h2>

          <Form onSubmit={handleSubmit} noValidate>
            {/* Email (read-only) */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Email (không thể thay đổi)</Form.Label>
              <Form.Control
                type="email"
                value={user?.email || ''}
                disabled
                className="auth-input-dark"
              />
            </Form.Group>

            {/* Username */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Tên đăng nhập</Form.Label>
              <div className="input-wrapper-dark">
                <FiUser className="input-icon-dark" />
                <Form.Control
                  type="text"
                  id="edit-username"
                  name="username"
                  placeholder="Tên đăng nhập của bạn"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, username: e.target.value }));
                    setErrors(p => ({ ...p, username: '' }));
                  }}
                  isInvalid={!!errors.username}
                  className="auth-input-dark padded"
                />
              </div>
              {errors.username ? (
                <div className="auth-field-error-inline" role="alert">{errors.username}</div>
              ) : null}
            </Form.Group>

            {/* Avatar URL */}
            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">Đường dẫn ảnh đại diện (tùy chọn)</Form.Label>
              <div className="input-wrapper-dark" style={{ marginBottom: '10px' }}>
                <FiLink className="input-icon-dark" />
                <Form.Control
                  type="url"
                  id="edit-avatar"
                  name="avatar"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar}
                  onChange={(e) => setFormData(p => ({ ...p, avatar: e.target.value }))}
                  className="auth-input-dark padded"
                />
              </div>
              <ImageUploader 
                currentUrl={formData.avatar}
                onUpload={(url) => setFormData(p => ({ ...p, avatar: url }))}
                onClear={() => setFormData(p => ({ ...p, avatar: '' }))}
              />
            </Form.Group>

            {/* Email reminders */}
            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">Nhắc nhở học tập qua email</Form.Label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'rgba(99,91,255,0.06)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 14,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontWeight: 700, color: '#1e1b4b' }}>
                    Nhắc streak qua email
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Bật để nhận email nhắc học mỗi ngày khi bạn chưa học.
                  </div>
                </div>
                <Form.Check
                  type="switch"
                  id="toggle-email-reminder"
                  checked={!!formData.emailReminderEnabled}
                  onChange={(e) => setFormData(p => ({ ...p, emailReminderEnabled: e.target.checked }))}
                  label={formData.emailReminderEnabled ? 'BẬT' : 'TẮT'}
                />
              </div>
            </Form.Group>

            <div className="edit-actions">
              <Button
                type="submit"
                className="btn-edit-profile"
                disabled={loading}
                id="save-profile-btn"
              >
                {loading && <span className="spinner-border spinner-border-sm me-2" />}
                {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </Button>
              <Button
                as={Link}
                to="/profile"
                variant="outline-secondary"
                className="btn-cancel"
                id="cancel-edit-btn"
              >
                Hủy
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
}
