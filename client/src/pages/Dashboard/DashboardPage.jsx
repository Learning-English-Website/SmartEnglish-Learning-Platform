import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import {
  Flame, Zap, CreditCard, BookOpen, Layers,
  Target, TrendingUp, ChevronRight, Plus, Trophy, Clock,
  Brain, X, ArrowLeft
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
  const [showDueCardModal, setShowDueCardModal] = useState(false);
  const [modalView, setModalView] = useState('main'); // 'main' | 'deep-options'

  const closeDueCardModal = () => {
    setShowDueCardModal(false);
    setModalView('main');
  };

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
    { label: 'Đã vào ôn tập', value: statsData?.masteredCards ?? '0', icon: CreditCard, color: '#22c55e' },
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

            {/* Spaced Repetition Dashboard */}
            <div className="dashboard-section db-spaced-repetition-section-v2">
              <div className="db-sr-header-v2">
                <h2 className="section-title">
                  <BookOpen size={20} />
                  Ôn tập thông minh
                </h2>
                <p className="db-sr-description-v2">
                  Hệ thống tự sắp xếp lịch ôn dựa trên mức độ ghi nhớ của bạn.
                </p>
              </div>

              <div className="db-sr-grid-v2">
                <div 
                  className="db-sr-card-v2 due-v2"
                  onClick={() => {
                    if ((statsData?.dueToday ?? 0) > 0) {
                      setShowDueCardModal(true);
                    }
                  }}
                >
                  <div className="db-sr-card-left-v2">
                    <div className="db-sr-icon-v2 due-v2">
                      <BookOpen size={24} />
                    </div>
                    <div className="db-sr-card-left-content-v2">
                      <span className="db-sr-label-v2">Cần ôn hôm nay</span>
                      <div className="db-sr-card-body-v2">
                        <span className="db-sr-count-v2">{statsData?.dueToday ?? 0}</span>
                        <span className="db-sr-unit-v2">thẻ</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="db-sr-cta-btn-v2"
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((statsData?.dueToday ?? 0) > 0) {
                        setShowDueCardModal(true);
                      }
                    }}
                  >
                    Bắt đầu ôn tập
                  </button>
                </div>

                <div 
                  className="db-sr-card-v2 new-v2"
                  onClick={() => {
                    if ((statsData?.newCards ?? 0) > 0) {
                      navigate('/flashcards/review', {
                        state: {
                          reviewMode: 'new-card-preview',
                          returnTo: '/dashboard'
                        }
                      });
                    }
                  }}
                >
                  <div className="db-sr-card-header-v2">
                    <div className="db-sr-icon-v2 new-v2">
                      <Plus size={24} />
                    </div>
                    <span className="db-sr-label-v2">Từ mới</span>
                  </div>
                  <div className="db-sr-card-body-v2">
                    <span className="db-sr-count-v2">{statsData?.newCards ?? 0}</span>
                    <span className="db-sr-unit-v2">thẻ</span>
                  </div>
                  <span className="db-sr-action-link-v2">Học ngay →</span>
                </div>

                <div className="db-sr-card-v2 learning-v2">
                  <div className="db-sr-card-header-v2">
                    <div className="db-sr-icon-v2 learning-v2">
                      <Layers size={24} />
                    </div>
                    <span className="db-sr-label-v2">Đang học</span>
                  </div>
                  <div className="db-sr-card-body-v2">
                    <span className="db-sr-count-v2">{statsData?.learningCards ?? 0}</span>
                    <span className="db-sr-unit-v2">thẻ</span>
                  </div>
                </div>

                <div className="db-sr-card-v2 review-v2">
                  <div className="db-sr-card-header-v2">
                    <div className="db-sr-icon-v2 review-v2">
                      <Target size={24} />
                    </div>
                    <span className="db-sr-label-v2">Ôn tập</span>
                  </div>
                  <div className="db-sr-card-body-v2">
                    <span className="db-sr-count-v2">{statsData?.masteredCards ?? 0}</span>
                    <span className="db-sr-unit-v2">thẻ</span>
                  </div>
                </div>
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
                    <h4>Học Flashcard</h4>
                    <p>Học từ vựng qua thẻ ghi nhớ</p>
                  </div>
                  <ChevronRight size={16} />
                </Link>
                <Link to="/duolingo" className="db-shortcut-link">
                  <div className="db-shortcut-icon dl">
                    <BookOpen size={18} />
                  </div>
                  <div className="db-shortcut-details">
                    <h4>Trò chơi luyện tập</h4>
                    <p>Luyện tập trắc nghiệm thú vị</p>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </Container>

      {/* Selector Modal for Due Cards */}
      {showDueCardModal && (
        <div className="db-modal-overlay" onClick={closeDueCardModal}>
          <div className="db-modal-content" onClick={(e) => e.stopPropagation()}>
            {modalView === 'deep-options' && (
              <button 
                className="db-modal-back-btn" 
                onClick={() => setModalView('main')}
                title="Quay lại"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <button className="db-modal-close-btn-top" onClick={closeDueCardModal}>
              <X size={20} />
            </button>

            {modalView === 'main' ? (
              <>
                <h3 className="db-modal-title">Bạn muốn ôn tập từ vựng theo cách nào?</h3>
                <div className="db-modal-options">
                  {/* Option 1: Ôn tập nhanh */}
                  <div 
                    className="db-modal-option-card primary"
                    onClick={() => {
                      closeDueCardModal();
                      navigate('/flashcards/review', { 
                        state: { 
                          returnTo: '/dashboard' 
                        } 
                      });
                    }}
                  >
                    <div className="db-modal-option-icon flash">
                      <Layers size={22} />
                    </div>
                    <div className="db-modal-option-text">
                      <span className="db-modal-option-title">Ôn tập nhanh (Khuyên dùng)</span>
                      <span className="db-modal-option-desc">Lật nhanh thẻ ghi nhớ để tự đánh giá mức độ nhớ của mình.</span>
                    </div>
                  </div>

                  {/* Option 2: Luyện tập sâu */}
                  <div 
                    className="db-modal-option-card secondary"
                    onClick={() => setModalView('deep-options')}
                  >
                    <div className="db-modal-option-icon mc">
                      <Brain size={22} />
                    </div>
                    <div className="db-modal-option-text">
                      <span className="db-modal-option-title">Luyện tập sâu</span>
                      <span className="db-modal-option-desc">Trắc nghiệm để kiểm tra và ôn tập kỹ lưỡng hơn.</span>
                    </div>
                  </div>
                </div>
                <button className="db-modal-close-btn" onClick={closeDueCardModal}>
                  Hủy
                </button>
              </>
            ) : (
              <>
                <h3 className="db-modal-title">Chọn hình thức luyện tập sâu</h3>
                <div className="db-modal-options">
                  {/* Sub-option 1: Chỉ trắc nghiệm */}
                  <div 
                    className="db-modal-option-card primary"
                    onClick={() => {
                      closeDueCardModal();
                      navigate('/flashcards/learn-new', { 
                        state: { 
                          reviewMode: 'due-card-practice', 
                          includeWritten: false, 
                          returnTo: '/dashboard' 
                        } 
                      });
                    }}
                  >
                    <div className="db-modal-option-icon mc">
                      <Brain size={22} />
                    </div>
                    <div className="db-modal-option-text">
                      <span className="db-modal-option-title">Trắc nghiệm (Khuyên dùng)</span>
                      <span className="db-modal-option-desc">Chỉ ôn tập qua các câu hỏi trắc nghiệm khách quan để tối ưu tốc độ.</span>
                    </div>
                  </div>

                  {/* Sub-option 2: Trắc nghiệm & Tự luận */}
                  <div 
                    className="db-modal-option-card secondary-purple"
                    onClick={() => {
                      closeDueCardModal();
                      navigate('/flashcards/learn-new', { 
                        state: { 
                          reviewMode: 'due-card-practice', 
                          includeWritten: true, 
                          returnTo: '/dashboard' 
                        } 
                      });
                    }}
                  >
                    <div className="db-modal-option-icon mc-written">
                      <Brain size={22} />
                    </div>
                    <div className="db-modal-option-text">
                      <span className="db-modal-option-title">Trắc nghiệm & Tự luận</span>
                      <span className="db-modal-option-desc">Kết hợp trắc nghiệm và viết câu trả lời để ghi nhớ sâu sắc nhất (mất nhiều thời gian hơn).</span>
                    </div>
                  </div>
                </div>
                
                <div className="db-modal-footer-actions">
                  <button className="db-modal-back-link" onClick={() => setModalView('main')}>
                    ← Quay lại
                  </button>
                  <button className="db-modal-close-btn-inline" onClick={closeDueCardModal}>
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
