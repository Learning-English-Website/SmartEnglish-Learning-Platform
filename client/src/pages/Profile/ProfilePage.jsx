import { Link } from 'react-router-dom';
import { Container, Form } from 'react-bootstrap';
import {
  FiEdit2, FiMail, FiUser, FiShield, FiStar,
  FiCalendar, FiZap, FiAward, FiBell,
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService } from '../../api/gamificationService';
import { updateProfile } from '../../store/slices/authSlice';
import { selectAuthLoading } from '../../store/slices/authSlice';
import XPProgressBar from '../../components/gamification/XPProgressBar/XPProgressBar';
import AchievementBadge from '../../components/gamification/AchievementBadge/AchievementBadge';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const [gamStats, setGamStats] = useState(null);

  useEffect(() => {
    gamificationService.getStats().then(res => {
      setGamStats(res?.data || res);
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const streakData = gamStats?.streak;
  const gamData = gamStats?.gamification;

  const currentStreak = streakData?.current ?? user.streak?.current ?? 0;
  const longestStreak  = streakData?.longest  ?? user.streak?.longest  ?? 0;
  const studiedToday   = streakData?.studiedToday ?? false;
  const totalXP        = gamData?.xp       ?? user.gamification?.xp    ?? 0;
  const level          = gamData?.level    ?? user.gamification?.level ?? 1;
  const streakFreezes  = streakData?.streakFreezes ?? user.streakFreezes ?? 0;

  const memberSince = new Date(user.createdAt).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="profile-page">
      <Container className="profile-container">

        {/* ── Hero Card ─────────────────────────────────────────────── */}
        <div className="profile-hero-card">
          {/* Background gradient strip */}
          <div className="profile-hero-bg" />

          <div className="profile-hero-body">
            {/* Avatar */}
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <span>{user.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              {/* Streak flame overlay */}
              {currentStreak > 0 && (
                <div
                  className={`profile-streak-badge ${studiedToday ? 'profile-streak-badge--active' : ''}`}
                  title={`🔥 ${currentStreak} ngày liên tiếp`}
                >
                  🔥
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="profile-info">
              <h1 className="profile-username">{user.username}</h1>
              <div className="profile-badges">
                <span className="badge-role">
                  <FiShield size={11} className="me-1" />{user.role}
                </span>
                <span className="badge-role badge-role--premium">
                  <FiStar size={11} className="me-1" />{user.premium}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <Link to="/profile/edit" className="btn-edit-profile" id="edit-profile-btn">
              <FiEdit2 size={14} />
              Chỉnh sửa
            </Link>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────── */}
        <div className="profile-stats-row">
          <div className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--fire">🔥</div>
            <div className="profile-stat-body">
              <span className="profile-stat-value">{currentStreak}</span>
              <span className="profile-stat-label">Chuỗi hiện tại</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--trophy">🏆</div>
            <div className="profile-stat-body">
              <span className="profile-stat-value">{longestStreak}</span>
              <span className="profile-stat-label">Chuỗi dài nhất</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--level">⭐</div>
            <div className="profile-stat-body">
              <span className="profile-stat-value">Level {level}</span>
              <span className="profile-stat-label">Cấp độ</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--xp">
              <FiZap size={18} />
            </div>
            <div className="profile-stat-body">
              <span className="profile-stat-value">
                {totalXP.toLocaleString()}
              </span>
              <span className="profile-stat-label">Tổng XP</span>
            </div>
          </div>
          {user.premium === 'premium' && (
            <div className="profile-stat-card">
              <div className="profile-stat-icon profile-stat-icon--freeze">❄️</div>
              <div className="profile-stat-body">
                <span className="profile-stat-value">{streakFreezes} / 3</span>
                <span className="profile-stat-label">Bảo hiểm</span>
              </div>
            </div>
          )}
        </div>

        {/* ── XP Progress ───────────────────────────────────────────── */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <FiZap size={16} className="profile-section-icon profile-section-icon--purple" />
            <h2 className="profile-section-title">Tiến độ XP</h2>
          </div>
          <XPProgressBar />
        </div>

        {/* ── Account Info ──────────────────────────────────────────── */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <FiUser size={16} className="profile-section-icon profile-section-icon--blue" />
            <h2 className="profile-section-title">Thông tin tài khoản</h2>
          </div>
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
                <span className="detail-label">Thành viên từ</span>
                <span className="detail-value">{memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notification Preferences ──────────────────────────────────── */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <FiBell size={16} className="profile-section-icon" style={{ color: '#f97316' }} />
            <h2 className="profile-section-title">Thông báo</h2>
          </div>
          <div className="profile-details">
            <div className="detail-row" style={{ alignItems: 'center' }}>
              <FiMail className="detail-icon" style={{ marginTop: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <span className="detail-label">Nhắc streak qua email</span>
                  <div className="detail-sub">Bật để nhận email nhắc học mỗi ngày khi bạn chưa học.</div>
                </div>
                <Form.Check
                  type="switch"
                  id="toggle-email-reminder"
                  checked={!!user.emailReminderEnabled}
                  onChange={async (e) => {
                    const result = await dispatch(updateProfile({ emailReminderEnabled: e.target.checked }));
                    if (updateProfile.fulfilled.match(result)) {
                      toast.success(e.target.checked ? 'Đã bật nhắc streak qua email' : 'Đã tắt nhắc streak qua email');
                    } else {
                      toast.error('Cập nhật thất bại');
                    }
                  }}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Achievements ──────────────────────────────────────────── */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <FiAward size={16} className="profile-section-icon profile-section-icon--gold" />
            <h2 className="profile-section-title">Thành tích</h2>
          </div>
          <AchievementBadge />
        </div>

      </Container>
    </div>
  );
}
