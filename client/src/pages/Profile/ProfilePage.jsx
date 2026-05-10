import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { FiEdit2, FiMail, FiUser, FiShield, FiStar, FiCalendar } from 'react-icons/fi';
import { useAuthContext } from '../../context/AuthContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuthContext();

  if (!user) return null;

  return (
    <div className="profile-page">
      <Container className="profile-container">
        <div className="profile-card">
          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{user.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="profile-info">
            <h1 className="profile-username">{user.username}</h1>
            <div className="profile-badges">
              <span className="badge-role">
                <FiShield className="me-1" />{user.role}
              </span>
              <span className="badge-role">
                <FiStar className="me-1" />{user.premium}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="profile-details">
            <div className="detail-row">
              <FiMail className="detail-icon" />
              <div>
                <span className="detail-label">Email</span>
                <span className="detail-value">{user.email}</span>
              </div>
            </div>
            <div className="detail-row">
              <FiUser className="detail-icon" />
              <div>
                <span className="detail-label">Username</span>
                <span className="detail-value">{user.username}</span>
              </div>
            </div>
            <div className="detail-row">
              <FiCalendar className="detail-icon" />
              <div>
                <span className="detail-label">Member since</span>
                <span className="detail-value">
                  {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <Button as={Link} to="/profile/edit" className="btn-edit-profile" id="edit-profile-btn">
              <FiEdit2 className="me-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
