import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import {
  Flame, Zap, CreditCard, BookOpen, Layers,
  Target, TrendingUp, ChevronRight, Plus, Trophy, Clock
} from 'lucide-react';
import { progressService } from '../../services/progressService';
import { setService } from '../../api/setService';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState(null);
  const [recentSets, setRecentSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, setsRes] = await Promise.all([
          progressService.getOverallStats(),
          setService.getMySets().catch(() => [])
        ]);

        setStatsData(statsRes?.data ?? statsRes);

        const setsData = setsRes?.data ?? setsRes ?? [];
        // Sort by updatedAt descending
        const sortedSets = [...setsData].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setRecentSets(sortedSets.slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Level progress variables
  const currentLevel = statsData?.level ?? 1;
  const currentXp = statsData?.xp ?? 0;
  const xpToNextLevel = statsData?.xpToNextLevel ?? 500;
  const xpPercent = Math.min(100, Math.round((currentXp / xpToNextLevel) * 100));

  const stats = [
    { label: 'Ngày Streak', value: statsData?.currentStreak ?? '0', icon: Flame, color: '#f97316' },
    { label: 'Tổng số XP', value: statsData?.xp !== undefined ? (statsData.xp + (statsData.level - 1) * 500) : '0', icon: Zap, color: '#eab308' },
    { label: 'Thành thạo', value: statsData?.masteredCards ?? '0', icon: CreditCard, color: '#22c55e' },
    { label: 'Bài học đã xong', value: statsData?.totalSessionsCompleted ?? '0', icon: BookOpen, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-page">
      <Container className="dashboard-container">
        <div className="dashboard-grid">
          
          {/* ── MAIN COLUMN (70%) ──────────────────────────────────── */}
          <main className="dashboard-main">
            {/* Welcome Hero Card */}
            <div className="dashboard-hero">
              <div className="dashboard-hero-content">
                <div className="dashboard-greeting">
                  <span className="dashboard-date-tag">{getFormattedDate()}</span>
                  <h1 className="dashboard-title">
                    Chào mừng trở lại, <span className="user-highlight">{user?.username}</span> 👋
                  </h1>
                  <p className="dashboard-subtitle">Hôm nay bạn muốn học gì nào? Hãy tiếp tục cải thiện vốn từ vựng nhé!</p>
                </div>
                <div className="dashboard-hero-actions">
                  <button 
                    className="db-action-btn db-action-btn--primary"
                    onClick={() => navigate('/flashcards/sets/create')}
                  >
                    <Plus size={16} />
                    Tạo học phần mới
                  </button>
                </div>
              </div>
              <div className="dashboard-hero-decoration" />
            </div>

            {/* Level & XP Progress Card */}
            <div className="db-progress-card">
              <div className="db-progress-header">
                <div className="db-level-badge">
                  <Trophy size={20} className="db-level-icon" />
                  <span>Cấp độ {currentLevel}</span>
                </div>
                <span className="db-xp-fraction">{currentXp} / {xpToNextLevel} XP</span>
              </div>
              <div className="db-progress-track">
                <div className="db-progress-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="db-progress-footer">
                <span>Tiến trình cấp độ</span>
                <span>Còn {xpToNextLevel - currentXp} XP để lên Cấp {currentLevel + 1}</span>
              </div>
            </div>

            {/* Recent Sets Section */}
            <div className="dashboard-section">
              <div className="db-section-header">
                <h2 className="section-title">
                  <Clock size={18} />
                  Học phần gần đây
                </h2>
                <Link to="/library" className="db-view-all">
                  Xem tất cả <ChevronRight size={14} />
                </Link>
              </div>
              
              {loading ? (
                <div className="db-loading-block">
                  <div className="db-spinner" />
                  <span>Đang tải học phần...</span>
                </div>
              ) : recentSets.length === 0 ? (
                <div className="db-empty-sets">
                  <Layers size={36} />
                  <p>Bạn chưa tạo học phần nào.</p>
                  <button 
                    className="db-action-btn db-action-btn--secondary"
                    onClick={() => navigate('/flashcards/sets/create')}
                  >
                    Tạo học phần đầu tiên
                  </button>
                </div>
              ) : (
                <div className="db-sets-list">
                  {recentSets.map((set) => (
                    <div 
                      key={set._id} 
                      className="db-set-row"
                      onClick={() => navigate(`/study-sets/${set._id}`)}
                    >
                      <div className="db-set-row-icon">
                        <Layers size={18} />
                      </div>
                      <div className="db-set-row-info">
                        <h3>{set.title}</h3>
                        <p>{set.description || 'Không có mô tả'}</p>
                      </div>
                      <div className="db-set-row-meta">
                        <span className="db-set-card-count">
                          {set.cardCount || set.cards?.length || 0} thẻ
                        </span>
                        <ChevronRight size={16} className="db-chevron" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* ── SIDEBAR COLUMN (30%) ───────────────────────────────── */}
          <aside className="dashboard-sidebar">
            {/* Quick Stats Panel */}
            <div className="db-sidebar-card">
              <h3 className="db-sidebar-title">
                <TrendingUp size={16} />
                Thống kê học tập
              </h3>
              <div className="db-sidebar-stats">
                {stats.map((s) => (
                  <div key={s.label} className="db-sidebar-stat-item">
                    <div className="db-stat-item-left">
                      <div className="db-stat-icon" style={{ background: `${s.color}12`, color: s.color }}>
                        <s.icon size={16} />
                      </div>
                      <span className="db-stat-label">{s.label}</span>
                    </div>
                    <span className="db-stat-value">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="db-sidebar-card">
              <h3 className="db-sidebar-title">
                <Layers size={16} />
                Lối tắt nhanh
              </h3>
              <div className="db-shortcuts">
                <Link to="/quizlet" className="db-shortcut-link">
                  <div className="db-shortcut-icon qz">
                    <CreditCard size={18} />
                  </div>
                  <div className="db-shortcut-details">
                    <h4>Flashcards Quizlet</h4>
                    <p>Học từ vựng qua thẻ ghi nhớ</p>
                  </div>
                  <ChevronRight size={16} />
                </Link>
                <Link to="/duolingo" className="db-shortcut-link">
                  <div className="db-shortcut-icon dl">
                    <BookOpen size={18} />
                  </div>
                  <div className="db-shortcut-details">
                    <h4>Duolingo Games</h4>
                    <p>Luyện tập trắc nghiệm thú vị</p>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </Container>
    </div>
  );
}
