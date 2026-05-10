import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Container } from 'react-bootstrap';
import { FiUser, FiLink, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/auth.api';
import { useAuthContext } from '../../context/AuthContext';
import './ProfilePage.css';

export default function EditProfilePage() {
  const { user, dispatch } = useAuthContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    avatar: user?.avatar || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.username) errs.username = 'Username is required';
    else if (formData.username.length < 3) errs.username = 'At least 3 characters';
    else if (formData.username.length > 30) errs.username = 'Max 30 characters';
    else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) errs.username = 'Letters and numbers only';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await authAPI.updateProfile({
        username: formData.username,
        ...(formData.avatar ? { avatar: formData.avatar } : {}),
      });
      dispatch({ type: 'SET_USER', payload: res.data });
      toast.success('Profile updated! ✅');
      navigate('/profile');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Container className="profile-container">
        <Link to="/profile" className="back-link">
          <FiArrowLeft /> Back to Profile
        </Link>

        <div className="profile-card" style={{ marginTop: '1rem' }}>
          <h2 className="profile-edit-title">Edit profile</h2>

          <Form onSubmit={handleSubmit} noValidate>
            {/* Email (read-only) */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Email (cannot be changed)</Form.Label>
              <Form.Control
                type="email"
                value={user?.email || ''}
                disabled
                className="auth-input-dark"
              />
            </Form.Group>

            {/* Username */}
            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">Username</Form.Label>
              <div className="input-wrapper-dark">
                <FiUser className="input-icon-dark" />
                <Form.Control
                  type="text"
                  id="edit-username"
                  name="username"
                  placeholder="Your username"
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
              <Form.Label className="form-label-custom">Avatar URL (optional)</Form.Label>
              <div className="input-wrapper-dark">
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
              {formData.avatar && (
                <div className="avatar-preview">
                  <img src={formData.avatar} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </Form.Group>

            <div className="edit-actions">
              <Button
                type="submit"
                className="btn-edit-profile"
                disabled={loading}
                id="save-profile-btn"
              >
                {loading && <span className="spinner-border spinner-border-sm me-2" />}
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                as={Link}
                to="/profile"
                variant="outline-secondary"
                className="btn-cancel"
                id="cancel-edit-btn"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
}
