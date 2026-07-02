import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { duolingoService } from '../../services/duolingoService';
import { PageSkeleton } from '../../components/common/LoadingSkeleton';
import { ChevronLeft, Flame, Heart, Zap, ArrowRight, Play, Lock } from 'lucide-react';
import './LearnPage.css';

// Helper to map lesson titles to beautiful contextual emojis
const getLessonIcon = (title) => {
  const t = title.toLowerCase();
  if (t.includes('greet') || t.includes('chào') || t.includes('hỏi')) return '💬';
  if (t.includes('number') || t.includes('số') || t.includes('đếm')) return '🔢';
  if (t.includes('color') || t.includes('màu')) return '🎨';
  if (t.includes('food') || t.includes('ăn') || t.includes('táo')) return '🍏';
  if (t.includes('drink') || t.includes('uống') || t.includes('nước')) return '🥤';
  if (t.includes('travel') || t.includes('lịch') || t.includes('đi') || t.includes('bay')) return '✈️';
  if (t.includes('work') || t.includes('việc') || t.includes('làm')) return '💼';
  if (t.includes('business') || t.includes('doanh') || t.includes('sở')) return '📈';
  if (t.includes('culture') || t.includes('văn') || t.includes('tục')) return '🎭';
  if (t.includes('idiom') || t.includes('ngữ') || t.includes('kế')) return '🦊';
  return '📖'; // Default
};

export default function LearnPage() {
  const [units, setUnits] = useState([]);
  const [hearts, setHearts] = useState(5);
  const [userStats, setUserStats] = useState({
    hearts: 5,
    points: 0,
    streak: 0,
    isPro: false,
    currentLessonTarget: null,
  });
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredLesson, setHoveredLesson] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && units.length > 0) {
      const timer = setTimeout(() => {
        const activeNode = document.querySelector('.quest-node-button.is-active-pulse');
        if (activeNode) {
          activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const completedNodes = document.querySelectorAll('.quest-node-button.is-completed');
          if (completedNodes.length > 0) {
            completedNodes[completedNodes.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [loading, units]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [unitsRes, statsRes] = await Promise.all([
        duolingoService.getUnits(),
        duolingoService.getHearts(),
      ]);

      const safeUnits = Array.isArray(unitsRes)
        ? unitsRes
        : (unitsRes?.data && Array.isArray(unitsRes.data) ? unitsRes.data : []);
      setUnits(safeUnits);
      const safeStats = statsRes?.data ?? statsRes;
      if (safeStats) {
        setHearts(safeStats.hearts ?? 5);
        setUserStats({
          hearts: safeStats.hearts ?? 5,
          points: safeStats.points ?? 0,
          streak: safeStats.streak ?? 0,
          isPro: safeStats.isPro || false,
          currentLessonTarget: safeStats.currentLessonTarget || null,
        });
        setActiveCourse(safeStats.activeCourse || null);
      }
    } catch (err) {
      console.error('Failed to load units:', err);
      setError('Không thể tải lộ trình học. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    const totalLessons = units.reduce((sum, unit) => sum + (unit.lessons?.length || 0), 0);
    const completedLessons = units.reduce(
      (sum, unit) => sum + (unit.lessons?.filter((l) => l.completed)?.length || 0),
      0
    );
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { totalLessons, completedLessons, progress };
  }, [units]);

  const activeLessonId = useMemo(() => {
    const targetId = userStats.currentLessonTarget?._id || userStats.currentLessonTarget;
    if (targetId) {
      const targetLesson = units
        .flatMap((unit) => unit.lessons || [])
        .find((lesson) => lesson._id === targetId && !lesson.completed && !lesson.isLocked);
      if (targetLesson) {
        return targetLesson._id;
      }
    }

    for (const unit of units) {
      const firstIncomplete = unit.lessons?.find((l) => !l.completed && !l.isLocked);
      if (firstIncomplete) {
        return firstIncomplete._id;
      }
    }
    return null;
  }, [units, userStats.currentLessonTarget]);
  
  const handleLessonClick = (lesson) => {
    if ((lesson.challengesCount ?? 0) <= 0) {
      window.alert('Bài học này chưa có câu hỏi. Giáo viên cần thêm hoặc tạo lại nội dung AI trước khi học viên bắt đầu.');
      return;
    }
    const isCompleted = lesson.completed;
    if (isCompleted) {
      navigate(`/duolingo/lesson/${lesson._id}?practice=true`);
    } else {
      navigate(`/duolingo/lesson/${lesson._id}`);
    }
  };

  const findStartLessonInUnit = (unit) => {
    const lessons = unit.lessons || [];
    const targetId = userStats.currentLessonTarget?._id || userStats.currentLessonTarget;

    if (targetId) {
      const targetInUnit = lessons.find(
        (lesson) => lesson._id === targetId && !lesson.completed && !lesson.isLocked
      );
      if (targetInUnit) return targetInUnit;
    }

    return (
      lessons.find((lesson) => !lesson.completed && !lesson.isLocked) ||
      lessons.find((lesson) => !lesson.isLocked) ||
      lessons[0] ||
      null
    );
  };

  const handleStartUnit = (unit) => {
    const totalUnitLessons = unit.lessons?.length || 0;
    const completedUnitLessons = unit.lessons?.filter(l => l.completed)?.length || 0;
    const isUnitCompleted = completedUnitLessons === totalUnitLessons && totalUnitLessons > 0;

    if (isUnitCompleted) {
      if (unit.lessons?.length > 0) {
        handleLessonClick(unit.lessons[0]);
      }
    } else {
      const activeLesson = findStartLessonInUnit(unit);
      if (activeLesson) {
        handleLessonClick(activeLesson);
      }
    }
  };

  if (loading) {
    return (
      <div className="learn-page">
        <PageSkeleton type="learn" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="learn-page">
        <Container className="learn-error-container">
          <div className="error-message-card">
            <div className="error-icon">⚠️</div>
            <h3>Đã xảy ra sự cố</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={loadData}>
              Thử lại ngay
            </button>
          </div>
        </Container>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="learn-page">
        <Container className="learn-empty-container">
          <div className="learn-empty-card">
            <span className="empty-icon">📚</span>
            <h2>Chưa có Lộ trình Kích hoạt</h2>
            <p>Vui lòng lựa chọn một khóa học tiếng Anh để bắt đầu lộ trình phản xạ của bạn.</p>
            <button className="btn-primary-glow-learn" onClick={() => navigate('/duolingo/courses')}>
              Khám phá Lộ trình
              <ArrowRight size={16} />
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="learn-page">
      {/* Background neon glowing lights */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <Container className="learn-container">
        {/* Compact Header Bar at the top */}
        <div className="learn-compact-header-bar">
          <button className="btn-back-home-minimal-learn" onClick={() => navigate('/duolingo/courses')}>
            <ChevronLeft size={16} />
            <span>Lộ trình học</span>
          </button>

          {activeCourse && (
            <div className="learn-header-course-info">
              <span className="course-label">ĐANG HỌC:</span>
              <span className="course-title">{activeCourse.title}</span>
            </div>
          )}

          {/* Simple compact progress panel */}
          <div className="learn-header-progress-compact">
            <div className="progress-details-compact">
              <span className="progress-percent">{stats.progress}% Hoàn thành</span>
              <span className="progress-fraction">{stats.completedLessons}/{stats.totalLessons} Bài học</span>
            </div>
            <div className="progress-bar-compact-wrapper">
              <div className="progress-bar-compact-fill" style={{ width: `${stats.progress}%` }}></div>
            </div>
          </div>

          {/* Compact Player Stats Pills */}
          <div className="learn-header-stats-compact">
            <div className="compact-stat-pill" title="Streak Ngày">
              <Flame size={14} className="fire-glow" />
              <span>{userStats.streak} Ngày</span>
            </div>
            <div className="compact-stat-pill" title="Tim Bền Bỉ">
              <Heart size={14} className="heart-glow" />
              <span>{userStats.isPro ? '∞' : userStats.hearts}</span>
            </div>
            <div className="compact-stat-pill" title="Tổng XP">
              <Zap size={14} className="xp-glow" />
              <span>{userStats.points} XP</span>
            </div>
          </div>
        </div>

        {/* Roadmap Winding Snake Path - Centered beautifully at the bottom */}
        <div className="roadmap-journey-snake-container-centered">
          {units.map((unit, unitIndex) => {
            const totalUnitLessons = unit.lessons?.length || 0;
            const completedUnitLessons = unit.lessons?.filter(l => l.completed)?.length || 0;
            const isUnitCompleted = completedUnitLessons === totalUnitLessons && totalUnitLessons > 0;

            return (
              <motion.div
                key={unit._id}
                className="quest-zone-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: unitIndex * 0.1 }}
              >
                {/* Zone Technical Header */}
                <div className="quest-zone-banner">
                  <div className="banner-glow-effect"></div>
                  <div className="banner-main-content">
                    <div className="banner-left-info">
                      <span className="zone-number-label">ZONE 0{unitIndex + 1}</span>
                      <h2 className="zone-title">{unit.title}</h2>
                      <p className="zone-desc">{unit.description}</p>
                    </div>
                    
                    <div className="banner-right-action">
                      <div className="zone-completion-badge">
                        <span className="badge-lbl">TIẾN ĐỘ ZONE</span>
                        <span className="badge-val">{completedUnitLessons}/{totalUnitLessons} Bài</span>
                      </div>
                      
                      <button 
                        className="btn-start-zone-quest"
                        onClick={() => handleStartUnit(unit)}
                      >
                        <Play size={12} fill="currentColor" />
                        <span>{isUnitCompleted ? 'Ôn tập Zone' : 'Chinh phục'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Winding Snake Quest Nodes Path */}
                <div className="quest-nodes-snake-path">
                  <div className="nodes-zig-zag-container">
                    {unit.lessons?.map((lesson, lessonIndex) => {
                      const isCompleted = lesson.completed;
                      const isLocked = lesson.isLocked && !isCompleted;
                      const isActive = lesson._id === activeLessonId;
                      
                      // Winding zig-zag offsets: [center, right, center, left]
                      const windingPosition = lessonIndex % 4;
                      const windingClass = `node-pos-${windingPosition}`;
                      const emojiIcon = getLessonIcon(lesson.title);

                      const offsets = [0, 120, 0, -120];
                      const currentOffset = offsets[lessonIndex % 4];
                      const nextOffset = lessonIndex < unit.lessons.length - 1 ? offsets[(lessonIndex + 1) % 4] : 0;

                      return (
                        <div 
                          key={lesson._id}
                          className={`quest-node-row-wrapper ${windingClass}`}
                          onMouseEnter={() => !isLocked && setHoveredLesson(lesson._id)}
                          onMouseLeave={() => setHoveredLesson(null)}
                          style={{
                            '--node-accent-glow': isCompleted ? '#38bdf8' : isActive ? '#10b981' : '#9ca3af'
                          }}
                        >
                          {lessonIndex < unit.lessons.length - 1 && (() => {
                            const dX = nextOffset - currentOffset;
                            const absDX = Math.abs(dX);
                            
                            let svgStyle = {};
                            let pathD = '';
                            let viewBox = '';

                            if (dX > 0) {
                              svgStyle = { position: 'absolute', top: '38px', left: '50%', width: `${absDX}px`, height: 'calc(100% + 4.5rem)' };
                              viewBox = `0 0 ${absDX} 100`;
                              pathD = `M 0 0 C 0 50, ${absDX} 50, ${absDX} 100`;
                            } else if (dX < 0) {
                              svgStyle = { position: 'absolute', top: '38px', right: '50%', width: `${absDX}px`, height: 'calc(100% + 4.5rem)' };
                              viewBox = `0 0 ${absDX} 100`;
                              pathD = `M ${absDX} 0 C ${absDX} 50, 0 50, 0 100`;
                            } else {
                              svgStyle = { position: 'absolute', top: '38px', left: '50%', width: '2px', height: 'calc(100% + 4.5rem)' };
                              viewBox = '0 0 2 100';
                              pathD = 'M 1 0 L 1 100';
                            }

                            return (
                              <svg 
                                className="node-connector-svg" 
                                viewBox={viewBox}
                                preserveAspectRatio="none"
                                style={{ 
                                  ...svgStyle,
                                  pointerEvents: 'none', 
                                  zIndex: 0, 
                                  overflow: 'visible' 
                                }}
                              >
                                <defs>
                                  <linearGradient id={`laser-glow-${lesson._id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor={isCompleted ? '#38bdf8' : '#9ca3af'} stopOpacity="0.8" />
                                    <stop offset="100%" stopColor={(lessonIndex + 1 < unit.lessons.length && unit.lessons[lessonIndex + 1].completed) ? '#38bdf8' : (lessonIndex + 1 < unit.lessons.length && unit.lessons[lessonIndex + 1]._id === activeLessonId) ? '#10b981' : '#9ca3af'} stopOpacity="0.8" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke={`url(#laser-glow-${lesson._id})`}
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                  style={{
                                    filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.45))'
                                  }}
                                />
                              </svg>
                            );
                          })()}
                          <div className="node-anchor-point" style={{ position: 'relative', zIndex: 2 }}>
                            {/* Minimalist Active Pill Badge (Vercel style) */}
                            {isActive && (
                              <div className="minimal-active-badge">
                                <span className="pulse-dot"></span>
                                <span>ĐANG HỌC</span>
                              </div>
                            )}

                            {/* Quest Circle holographic node button */}
                            <motion.button
                              whileHover={!isLocked ? { scale: 1.12 } : {}}
                              whileTap={!isLocked ? { scale: 0.95 } : {}}
                              className={`quest-node-button ${isCompleted ? 'is-completed' : ''} ${isLocked ? 'is-locked' : ''} ${isActive ? 'is-active-pulse' : ''}`}
                              onClick={() => !isLocked && handleLessonClick(lesson)}
                              aria-label={`Lesson: ${lesson.title}`}
                            >
                              {/* Active breathing circle rings */}
                              {isActive && (
                                <>
                                  <div className="active-ring ring-1"></div>
                                  <div className="active-ring ring-2"></div>
                                </>
                              )}

                              <div className="inner-node-circle">
                                <span className="quest-emoji">{isCompleted ? '✓' : isLocked ? <Lock size={16} /> : emojiIcon}</span>
                              </div>
                            </motion.button>

                            {/* Mini Info Label under the button */}
                            <span className={`quest-node-label-small ${isActive ? 'active-text-glow' : ''}`}>
                              {lesson.title}
                            </span>

                            {/* Hover Quest Preview Tooltip Dialog */}
                            <AnimatePresence>
                              {hoveredLesson === lesson._id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: 15 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8, y: 15 }}
                                  className="quest-preview-tooltip"
                                >
                                  <div className="tooltip-indicator-arrow"></div>
                                  <div className="tooltip-header">
                                    <span className="quest-tag">NHIỆM VỤ CẦN LÀM</span>
                                    <span className="xp-tag">+10 XP</span>
                                  </div>
                                  <h4 className="tooltip-title">{lesson.title}</h4>
                                  <p className="tooltip-desc">
                                    {isCompleted ? 'Chúc mừng! Bạn đã hoàn thành xuất sắc bài học này. Nhấp để ôn tập nâng cao.' : 'Thử thách phản xạ từ vựng, rèn phát âm thông minh và tim bền bỉ.'}
                                  </p>
                                  <button 
                                    className="btn-tooltip-action"
                                    onClick={() => !isLocked && handleLessonClick(lesson)}
                                  >
                                    <span>{isCompleted ? 'Luyện tập lại' : 'Bắt đầu ngay'}</span>
                                    <ArrowRight size={12} />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
