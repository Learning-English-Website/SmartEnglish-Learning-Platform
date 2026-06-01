import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, ChevronLeft, Users, Trophy, BookOpenCheck, CheckCircle2, Heart, Zap, Flame } from 'lucide-react';
import { duolingoService } from '../../services/duolingoService';
import { CourseCardSkeleton } from '../../components/common/LoadingSkeleton';
import './CoursesPage.css';

const DIFFICULTY_COLORS = {
  beginner: '#10b981',     // Emerald green
  intermediate: '#f59e0b', // Amber gold
  advanced: '#ef4444',     // Crimson red
};

const COURSE_ICON_MAP = {
  basics: '🚀',
  'food-drink': '🍔',
  travel: '✈️',
  'work-business': '💼',
  'culture-idioms': '🎭',
};

// Rich realistic gamified stats for each course
const COURSE_STATS_MAP = {
  basics: { lessons: 15, xp: 300, learners: '12.4K', color: '#3b82f6' },
  'food-drink': { lessons: 12, xp: 240, learners: '8.2K', color: '#f97316' },
  travel: { lessons: 18, xp: 360, learners: '15.1K', color: '#06b6d4' },
  'work-business': { lessons: 20, xp: 400, learners: '9.5K', color: '#8b5cf6' },
  'culture-idioms': { lessons: 10, xp: 200, learners: '5.3K', color: '#ec4899' },
};

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [userStats, setUserStats] = useState({ hearts: 5, points: 0, streak: 0, isPro: false });
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [coursesResponse, statsResponse] = await Promise.all([
        duolingoService.getCourses(),
        duolingoService.getHearts(),
      ]);
      const safeCourses = Array.isArray(coursesResponse)
        ? coursesResponse
        : (coursesResponse?.data && Array.isArray(coursesResponse.data) ? coursesResponse.data : []);
      setCourses(safeCourses);
      const safeStats = statsResponse?.data ?? statsResponse;
      if (safeStats) {
        setUserStats({
          hearts: safeStats.hearts ?? 5,
          points: safeStats.points ?? 0,
          streak: safeStats.streak ?? 0,
          isPro: safeStats.isPro || false,
        });
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Không thể tải danh sách khóa học. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectCourse = async (course) => {
    try {
      await duolingoService.selectCourse(course._id);
      navigate('/duolingo/learn');
    } catch (err) {
      console.error('Failed to select course:', err);
      setError('Không thể chọn khóa học. Vui lòng thử lại.');
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (selectedFilter === 'all') return true;
    return course.level?.toLowerCase() === selectedFilter.toLowerCase();
  });

  const activeCourse = courses.find((c) => c.isActive);

  // Animations configuration
  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 90, damping: 14 }
    }
  };

  if (loading) {
    return (
      <div className="courses-page">
        <Container className="courses-container">
          <div className="courses-header-section-loading text-start">
            <h1 className="courses-title">Chọn Khóa học</h1>
            <p className="courses-subtitle">Đang tải danh sách bài học thú vị...</p>
          </div>
          <Row className="courses-grid g-4 mt-4">
            {[1, 2, 3].map((i) => (
              <Col key={i} xs={12} className="mb-3">
                <div style={{ height: '140px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px' }}></div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courses-page">
        <Container className="courses-error-container">
          <div className="error-message-card">
            <div className="error-icon">⚠️</div>
            <h3>Đã xảy ra lỗi</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={loadCourses}>
              Thử lại ngay
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="courses-page">
      {/* Background decorations - Seamless and full-screen */}
      <div className="bg-glow-courses bg-glow-courses-1"></div>
      <div className="bg-glow-courses bg-glow-courses-2"></div>
      <div className="bg-glow-courses bg-glow-courses-3"></div>

      <Container className="courses-container-fluid">
        <Row className="g-5">
          {/* LEFT PANEL: Sticky Header & User Console (40% width on large screens) */}
          <Col lg={5} xl={4} className="position-relative">
            <div className="sticky-left-panel">
              {/* Seamless Navigation Top Bar */}
              <div className="seamless-nav-bar">
                <button className="btn-back-home-minimal" onClick={() => navigate('/duolingo')}>
                  <ChevronLeft size={16} />
                  <span>Quay lại</span>
                </button>
                
                <div className="tech-breadcrumbs">
                  <span>MEMORIS</span>
                  <span className="breadcrumb-separator">/</span>
                  <span className="active-breadcrumb">PATHWAY</span>
                </div>
              </div>

              {/* Seamless Futuristic Title Section */}
              <div className="seamless-header-section">
                <div className="courses-badge-header">
                  <BookOpen size={12} className="badge-icon-spin" />
                  <span>Memoris English Path</span>
                </div>
                <h1 className="seamless-courses-title">
                  Lộ trình <br />
                  <span className="text-gradient">Chinh phục</span>
                </h1>
                <p className="seamless-courses-subtitle">
                  Chọn một điểm đến và bắt đầu hành trình tích lũy XP, rèn phản xạ tự nhiên cùng Memoris.
                </p>
              </div>

              {/* Gamified User Stats Console Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="memoris-stats-console"
              >
                <div className="console-header">
                  <span className="console-title">BẢNG CHỈ SỐ PLAYER</span>
                  <span className="console-pulse">● LIVE</span>
                </div>
                
                <div className="console-grid">
                  <div className="console-stat-box">
                    <Flame className="stat-icon-console fire-glow" size={20} />
                    <div className="stat-text">
                      <span className="stat-val">{userStats.streak} Ngày</span>
                      <span className="stat-lbl">Streak Lửa</span>
                    </div>
                  </div>

                  <div className="console-stat-box">
                    <Heart className="stat-icon-console heart-glow" size={20} />
                    <div className="stat-text">
                      <span className="stat-val">
                        {userStats.isPro ? '∞' : `${userStats.hearts} / 5`}
                      </span>
                      <span className="stat-lbl">Tim Bền Bỉ</span>
                    </div>
                  </div>

                  <div className="console-stat-box">
                    <Zap className="stat-icon-console xp-glow" size={20} />
                    <div className="stat-text">
                      <span className="stat-val">{userStats.points}</span>
                      <span className="stat-lbl">Tổng tích lũy</span>
                    </div>
                  </div>
                </div>

                {activeCourse && (
                  <div className="active-course-pill-console">
                    <span className="pill-dot-live"></span>
                    <div className="pill-info">
                      <span className="pill-lbl">ĐANG HỌC</span>
                      <span className="pill-val">{activeCourse.title}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Dynamic Filters Tab Bar - Vertical/Stacked inside Left Panel */}
              <div className="filters-tab-container-stacked">
                <span className="filter-title-label">PHÂN LOẠI CẤP ĐỘ KHÓ</span>
                <div className="filters-stacked-pills">
                  {['all', 'beginner', 'intermediate', 'advanced'].map((filterTab) => (
                    <button
                      key={filterTab}
                      className={`filter-stacked-btn ${selectedFilter === filterTab ? 'active-stacked-tab' : ''}`}
                      onClick={() => setSelectedFilter(filterTab)}
                    >
                      <span className="stacked-dot" style={{ backgroundColor: filterTab === 'all' ? 'var(--gl-tertiary)' : DIFFICULTY_COLORS[filterTab] }}></span>
                      <span className="stacked-txt">
                        {filterTab === 'all' && 'Tất cả lộ trình'}
                        {filterTab === 'beginner' && 'Cơ bản (Beginner)'}
                        {filterTab === 'intermediate' && 'Trung cấp (Intermediate)'}
                        {filterTab === 'advanced' && 'Nâng cao (Advanced)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Col>

          {/* RIGHT PANEL: Roadmap Timeline & Horizontal Cards (60% width) */}
          <Col lg={7} xl={8}>
            <div className="roadmap-journey-container">
              
              {/* Vertical Laser Timeline line */}
              <div className="timeline-laser-line">
                <div className="laser-beam"></div>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="no-courses-card-roadmap">
                  <p>Không tìm thấy lộ trình học tập nào phù hợp với bộ lọc này.</p>
                </div>
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="roadmap-stations-list"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredCourses.map((course, index) => {
                      const difficultyColor = DIFFICULTY_COLORS[course.level] || DIFFICULTY_COLORS.beginner;
                      const courseIcon = COURSE_ICON_MAP[course.slug] || '🇬🇧';
                      const stats = COURSE_STATS_MAP[course.slug] || { lessons: 10, xp: 200, learners: '1.2K', color: '#2c5ef5' };

                      return (
                        <motion.div
                          key={course._id}
                          variants={itemVariants}
                          layout
                          exit={{ opacity: 0, scale: 0.95, x: -30 }}
                          className="roadmap-station-wrapper"
                        >
                          {/* Absolute timeline glowing node dot linking to the timeline laser */}
                          <div 
                            className={`timeline-station-node ${course.isActive ? 'active-node' : ''}`}
                            style={{ 
                              '--node-color': stats.color,
                              '--difficulty-border': difficultyColor
                            }}
                          >
                            <div className="node-core"></div>
                            <div className="node-ring"></div>
                          </div>

                          <div
                            className={`horizontal-station-card ${course.isActive ? 'active-station-card' : ''}`}
                            style={{ '--accent-glow': stats.color }}
                            onClick={() => handleSelectCourse(course)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectCourse(course)}
                          >
                            {/* Icon column */}
                            <div className="station-icon-column">
                              <div className="station-icon-glow-ring" style={{ '--icon-accent': stats.color }}>
                                <div className="pulse-ring-effect"></div>
                                <span className="station-emoji">{courseIcon}</span>
                              </div>
                            </div>

                            {/* Main Info Column */}
                            <div className="station-info-column">
                              <div className="station-meta-row">
                                <span
                                  className="station-difficulty-badge"
                                  style={{ 
                                    color: difficultyColor,
                                    backgroundColor: `${difficultyColor}12`,
                                    borderColor: `${difficultyColor}30`
                                  }}
                                >
                                  {course.level === 'beginner' && 'Cơ bản'}
                                  {course.level === 'intermediate' && 'Trung cấp'}
                                  {course.level === 'advanced' && 'Nâng cao'}
                                </span>
                                <span className="station-learners">
                                  <Users size={12} />
                                  <span>{stats.learners} đang học</span>
                                </span>
                              </div>

                              <h3 className="station-title">{course.title}</h3>
                              {course.description && (
                                <p className="station-desc">{course.description}</p>
                              )}
                            </div>

                            {/* Gamified Stats Column */}
                            <div className="station-stats-column">
                              <div className="stat-sub-box">
                                <BookOpenCheck size={14} className="stat-sub-icon" />
                                <span className="stat-sub-val">{stats.lessons} Bài học</span>
                              </div>
                              <div className="stat-sub-box">
                                <Trophy size={14} className="stat-sub-icon" />
                                <span className="stat-sub-val">+{stats.xp} XP Thưởng</span>
                              </div>
                            </div>

                            {/* Futuristic Action column */}
                            <div className="station-action-column">
                              <div className="btn-station-select">
                                <span>{course.isActive ? 'Tiếp tục' : 'Bắt đầu'}</span>
                                <div className="btn-icon-wrapper">
                                  <ArrowRight size={14} />
                                </div>
                              </div>
                            </div>

                            {/* Active decorative badge */}
                            {course.isActive && (
                              <div className="station-active-ribbon">
                                <CheckCircle2 size={12} />
                                <span>ĐANG HỌC</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
