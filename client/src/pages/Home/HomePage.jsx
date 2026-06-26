import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';
import { 
  FiArrowRight, 
  FiBookOpen, 
  FiMessageSquare, 
  FiZap,
  FiCheckCircle,
  FiActivity,
  FiGrid,
  FiSettings,
  FiUser,
  FiPlay,
  FiAward,
  FiUploadCloud,
  FiTarget,
  FiFolder,
  FiSearch,
  FiSliders,
  FiFileText,
  FiSend
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './HomePage.css';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDay, setSelectedDay] = useState(3);

  // Motion variants configured to respect reduced motion
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 20 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  // Timeline data details
  const timelineIntervals = [
    { day: 1, retention: "80%", desc: "Từ mới nạp vào. Nếu không ôn lại ngay, 50% lượng kiến thức sẽ biến mất hoàn toàn vào ngày tiếp theo.", action: "Học & nạp âm thanh" },
    { day: 3, retention: "90%", desc: "Chu kỳ kích hoạt lại. Hệ thống gợi ý từ đúng thời điểm lãng quên để nâng độ bền ghi nhớ lên gấp đôi.", action: "Ôn tập lần 1" },
    { day: 7, retention: "95%", desc: "Khắc sâu vào trí nhớ trung hạn. Từ vựng được liên kết với hình ảnh và bài tập game hóa sinh động.", action: "Ôn tập lần 2" },
    { day: 14, retention: "98%", desc: "Chuyển giao trí nhớ dài hạn. AI Coach gọi lại từ trong ngữ cảnh hội thoại giao tiếp tự nhiên.", action: "Giao tiếp AI" },
    { day: 30, retention: "99%", desc: "Ghi nhớ vĩnh viễn. Từ vựng đã trở thành phản xạ tự nhiên của bạn khi đọc, viết hoặc giao tiếp.", action: "Làm chủ từ" }
  ];

  return (
    <div className="home-page">
      {/* Structural layout grid lines & dots */}
      <div className="grid-axis-lines" aria-hidden="true">
        <div className="vertical-line l-1"></div>
        <div className="vertical-line l-2"></div>
        <div className="vertical-line l-3"></div>
        <div className="horizontal-line h-1"></div>
        <div className="horizontal-line h-2"></div>
        <span className="grid-crosshair c-1">+</span>
        <span className="grid-crosshair c-2">+</span>
        <span className="grid-crosshair c-3">+</span>
        <span className="grid-crosshair c-4">+</span>
      </div>

      {/* Subtle background glow bubbles */}
      <div className="glow-background" aria-hidden="true">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>

      <Container className="home-container">
        {/* HERO SECTION WITH FLEXIBLE GRID */}
        <motion.section 
          className="hero-grid-section"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="hero-text-column">
            <motion.div className="hero-badge-container" variants={itemVariants}>
              <span className="hero-v2-badge">
                <span className="badge-pulse-dot"></span> Memoris v2.0 // Khoa học từ vựng
              </span>
            </motion.div>

            <motion.h1 className="hero-v2-title" variants={itemVariants}>
              Làm chủ tiếng Anh <br />
              bằng <span className="highlight-text">khoa học ghi nhớ</span>.
            </motion.h1>

            <motion.p className="hero-v2-subtitle" variants={itemVariants}>
              Hệ thống học tập thông minh ứng dụng thuật toán lặp lại ngắt quãng (SRS), phòng luyện giao tiếp AI phản xạ và game hóa giúp ghi nhớ từ vựng sâu hơn gấp 4 lần.
            </motion.p>

            <motion.div className="hero-v2-actions" variants={itemVariants}>
              {isAuthenticated ? (
                user?.role === 'teacher' ? (
                  <>
                    <Button as={Link} to="/teacher/studio" className="btn-v2-primary btn-shimmer">
                      Studio Soạn Bài <FiArrowRight className="btn-icon-arrow" />
                    </Button>
                    <Button as={Link} to="/dashboard" className="btn-v2-secondary">
                      Bảng điều khiển
                    </Button>
                  </>
                ) : user?.role === 'admin' ? (
                  <>
                    <Button as={Link} to="/admin" className="btn-v2-primary btn-shimmer">
                      Trang Quản Trị <FiArrowRight className="btn-icon-arrow" />
                    </Button>
                    <Button as={Link} to="/dashboard" className="btn-v2-secondary">
                      Bảng điều khiển
                    </Button>
                  </>
                ) : (
                  <Button as={Link} to="/dashboard" className="btn-v2-primary btn-shimmer">
                    Bảng điều khiển học tập <FiArrowRight className="btn-icon-arrow" />
                  </Button>
                )
              ) : (
                <>
                  <Button as={Link} to="/register" className="btn-v2-primary btn-shimmer">
                    Học miễn phí ngay <FiArrowRight className="btn-icon-arrow" />
                  </Button>
                  <Button as={Link} to="/login" className="btn-v2-secondary">
                    Đăng nhập
                  </Button>
                </>
              )}
            </motion.div>
          </div>

          {/* HIGH-FIDELITY INTERACTIVE DASHBOARD MOCKUP */}
          <motion.div className="hero-mockup-column" variants={itemVariants}>
            <div className="mockup-wrapper">
              <div className="window-mockup">
                {/* Window controls header */}
                <div className="window-header">
                  <div className="window-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <div className="window-address">memoris.app/dashboard</div>
                  <div className="window-action-placeholder"></div>
                </div>

                {/* Mockup layout */}
                <div className="mockup-content-grid">
                  {/* Left Mini Sidebar */}
                  <div className="mockup-sidebar">
                    <div className="sidebar-logo">M</div>
                    <div className="sidebar-menu">
                      <div className="sidebar-item active"><FiGrid /></div>
                      <div className="sidebar-item"><FiBookOpen /></div>
                      <div className="sidebar-item"><FiMessageSquare /></div>
                      <div className="sidebar-item"><FiActivity /></div>
                    </div>
                    <div className="sidebar-settings">
                      <FiSettings />
                    </div>
                  </div>

                  {/* Main panel */}
                  <div className="mockup-main">
                    <div className="mockup-main-header">
                      <div className="mockup-search-bar">Tìm học phần...</div>
                      <div className="mockup-user">
                        <span className="user-dot online"></span>
                        <FiUser />
                      </div>
                    </div>

                    <div className="mockup-cards-grid">
                      {/* Interactive 3D Card */}
                      <div className="mockup-card-col">
                        <div 
                          className={`mini-3d-card ${isFlipped ? 'flipped' : ''}`}
                          onClick={() => setIsFlipped(!isFlipped)}
                        >
                          <div className="mini-card-inner">
                            <div className="mini-card-front">
                              <div className="mini-card-badge">THÀNH PHẦN // SRS</div>
                              <div className="mini-card-content">
                                <h3 className="term">resilient</h3>
                                <p className="ipa">/rɪˈzɪl.jənt/</p>
                              </div>
                              <div className="mini-card-footer">Nhấp để lật nghĩa ➔</div>
                            </div>
                            <div className="mini-card-back">
                              <div className="mini-card-badge">ĐỊNH NGHĨA</div>
                              <div className="mini-card-content">
                                <h4 className="definition">Kiên cường, phục hồi nhanh</h4>
                                <p className="example">"She is resilient."</p>
                              </div>
                              <div className="mini-card-footer">Quay lại từ gốc ➔</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Coach Card Mockup */}
                      <div className="mockup-card-col flex-column gap-3">
                        <div className="mini-ai-coach-card">
                          <div className="coach-header">
                            <div className="coach-avatar">AI</div>
                            <div className="coach-status-text">
                              <span className="name">AI Coach</span>
                              <span className="status"><span className="status-dot"></span> Trực tuyến</span>
                            </div>
                          </div>
                          <div className="coach-chat-bubble">
                            <p className="coach-msg">"Đặt một câu với từ <strong>resilient</strong> để kiểm tra ngữ pháp nhé!"</p>
                          </div>
                          <div className="coach-chat-input-row">
                            <div className="mock-input">She is resilient...</div>
                            <button className="btn-mock-send" aria-label="Gửi"><FiArrowRight /></button>
                          </div>
                        </div>

                        {/* Small Streak Widget */}
                        <div className="mini-streak-card">
                          <div className="streak-title-row">
                            <FiZap className="streak-orange-icon" />
                            <span>DAILY CHALLENGE</span>
                          </div>
                          <div className="streak-main-row">
                            <span className="streak-count">🔥 5 NGÀY LIÊN TIẾP</span>
                            <span className="streak-xp">+25 XP</span>
                          </div>
                          <div className="streak-progress">
                            <div className="streak-progress-bar" style={{ width: '75%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Widget 1: Daily streak notification (Leaderboard Mockup) */}
              <div className="floating-widget widget-notification">
                <div className="widget-icon-box gold"><FiAward /></div>
                <div className="widget-content">
                  <span className="title">Bảng xếp hạng tuần</span>
                  <div className="leaderboard-mini-list">
                    <div className="leaderboard-mini-item">
                      <span className="avatar color-blue">A</span>
                      <span className="name">Alex</span>
                      <span className="xp text-accent">850 XP</span>
                    </div>
                    <div className="leaderboard-mini-item active">
                      <span className="avatar color-orange">U</span>
                      <span className="name">Bạn (Hạng 2)</span>
                      <span className="xp text-accent">720 XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Widget 2: Action Reminder */}
              <div className="floating-widget widget-ranking">
                <div className="widget-icon-box"><FiZap /></div>
                <div className="widget-content">
                  <span className="title">Hôm nay</span>
                  <span className="desc text-orange font-mono font-weight-bold">12 TỪ CẦN ÔN TẬP</span>
                  <div className="mini-card-preview-bar">
                    <span>perspective</span>
                    <span>persevere</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Section Divider */}
        <div className="section-divider-lines" aria-hidden="true">
          <div className="divider-h-line"></div>
          <span className="divider-tag">[ HỆ THỐNG TÍNH NĂNG ]</span>
        </div>

        {/* BENTO GRID CORE FEATURES SECTION */}
        <motion.section 
          className="bento-features-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <div className="bento-grid-v2">
            {/* Bento Card 1 (Large): Spaced Repetition Forgetting Curve */}
            <motion.div className="bento-cell cell-2-col" variants={itemVariants}>
              <div className="cell-top-index">01 // THUẬT TOÁN SRS GHI NHỚ</div>
              <div className="cell-body">
                <h3 className="cell-title">Học tập lặp lại ngắt quãng</h3>
                <p className="cell-text">
                  Thuật toán khoa học tự động tính toán thời gian sắp lãng quên để gợi ý ôn tập, đưa thông tin vào bộ nhớ dài hạn nhanh gấp 4 lần.
                </p>
                <div className="curve-graph-container">
                  <svg className="forgetting-curve-svg" viewBox="0 0 400 160">
                    <defs>
                      <linearGradient id="gradient-accent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(44, 94, 245, 0.2)" />
                        <stop offset="100%" stopColor="rgba(44, 94, 245, 0)" />
                      </linearGradient>
                      <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5" opacity="0.3"/>
                      </pattern>
                    </defs>
                    
                    {/* Grid Pattern Background */}
                    <rect width="400" height="150" fill="url(#grid-pattern)" x="40" />

                    {/* Threshold Target Line */}
                    <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" strokeDasharray="4,4" />
                    <text x="375" y="65" fontSize="7" fill="#f59e0b" textAnchor="end" opacity="0.8">Ngưỡng lãng quên</text>
                    
                    {/* Axes */}
                    <line x1="40" y1="10" x2="40" y2="130" stroke="var(--text-muted)" strokeWidth="1" opacity="0.3" />
                    <line x1="40" y1="130" x2="390" y2="130" stroke="var(--text-muted)" strokeWidth="1" opacity="0.3" />
                    
                    {/* Forgetting Curve without review (Dashed Red-ish/Muted) */}
                    <path d="M 40 20 Q 90 120 180 126 T 380 128" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
                    <text x="190" y="115" fontSize="8" fill="var(--text-muted)" opacity="0.8">Đường quên tự nhiên</text>

                    {/* Forgetting Curve with SRS (Blue Solid) */}
                    <path d="M 40 20 Q 80 50 100 20 Q 140 50 160 20 Q 220 50 240 20 T 380 20" fill="none" stroke="var(--gl-tertiary)" strokeWidth="2.5" />
                    <path d="M 40 20 Q 80 50 100 20 Q 140 50 160 20 Q 220 50 240 20 T 380 20 L 380 130 L 40 130 Z" fill="url(#gradient-accent)" opacity="0.4" />
                    
                    {/* Interactive points */}
                    <circle cx="100" cy="20" r="3.5" fill="var(--gl-tertiary)" />
                    <circle cx="160" cy="20" r="3.5" fill="var(--gl-tertiary)" />
                    <circle cx="240" cy="20" r="3.5" fill="var(--gl-tertiary)" />
                    
                    {/* Annotations */}
                    <text x="100" y="12" fontSize="7" fontWeight="bold" fill="var(--gl-tertiary)" textAnchor="middle">Ôn lần 1</text>
                    <text x="160" y="12" fontSize="7" fontWeight="bold" fill="var(--gl-tertiary)" textAnchor="middle">Ôn lần 2</text>
                    <text x="240" y="12" fontSize="7" fontWeight="bold" fill="var(--gl-tertiary)" textAnchor="middle">Ôn lần 3</text>
                    
                    {/* Axis Labels */}
                    <text x="35" y="24" fontSize="8" fill="var(--text-muted)" textAnchor="end">100%</text>
                    <text x="35" y="130" fontSize="8" fill="var(--text-muted)" textAnchor="end">0%</text>
                    <text x="390" y="142" fontSize="8" fill="var(--text-muted)" textAnchor="end">Thời gian</text>
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 2 (Medium): Personal Library & Decks */}
            <motion.div className="bento-cell library-cell" variants={itemVariants}>
              <div className="cell-top-index">02 // PERSONAL STUDY LIBRARY</div>
              <div className="cell-body d-flex flex-column justify-between h-100">
                <div className="library-top-group">
                  <div>
                    <h3 className="cell-title">Quản lý từ vựng cá nhân</h3>
                    <p className="cell-text">
                      Tự do soạn thảo học phần (Decks) theo chủ đề, phân nhóm thư mục thông minh và nhập liệu nhanh từ Excel/CSV.
                    </p>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="library-search-filter">
                    <div className="search-box-mini">
                      <FiSearch className="search-icon" />
                      <input type="text" placeholder="Tìm kiếm học phần..." disabled />
                    </div>
                    <button className="btn-sort-mini"><FiSliders /> Lọc</button>
                  </div>

                  {/* Smart Folder Tabs bar */}
                  <div className="library-folders-tabs">
                    <span className="folder-tab active">
                      <FiFolder className="folder-icon" /> IELTS Prep
                    </span>
                    <span className="folder-tab">
                      <FiFolder className="folder-icon" /> Giao tiếp
                    </span>
                    <span className="folder-tab">
                      <FiFolder className="folder-icon" /> Công việc
                    </span>
                    <span className="folder-tab-add">+ Thư mục</span>
                  </div>
                </div>

                <div className="deck-stack-importer-container">
                  {/* Top: Decks Stack */}
                  <div className="decks-stack-3d">
                    {/* Layer 3 (Back) */}
                    <div className="deck-card deck-layer-3"></div>
                    {/* Layer 2 (Middle) */}
                    <div className="deck-card deck-layer-2">
                      <span className="deck-avatar color-green">B</span>
                      <div className="deck-info">
                        <span className="name">Business English</span>
                        <span className="sub">150 từ</span>
                      </div>
                    </div>
                    {/* Layer 1 (Front - Active) */}
                    <div className="deck-card deck-layer-1">
                      <div className="deck-card-header">
                        <div className="deck-avatar-title">
                          <span className="deck-avatar color-blue">A</span>
                          <span className="name">IELTS Academic</span>
                        </div>
                        <div className="deck-circular-progress">
                          <svg viewBox="0 0 36 36" className="circular-chart blue">
                            <path className="circle-bg"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="circle"
                              strokeDasharray="75, 100"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="circle-percentage">75%</span>
                        </div>
                      </div>
                      <div className="deck-card-body-meta">
                        <span className="word-count"><strong>340</strong> từ</span>
                        <span className="status-badge-inline">Đang học</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Drag-and-Drop CSV Importer */}
                  <div className="csv-importer-zone">
                    <div className="importer-content-split">
                      <div className="importer-prompt">
                        <FiUploadCloud className="importer-icon" />
                        <div className="importer-text">
                          <span className="primary-text">Nhập Excel/CSV</span>
                          <span className="secondary-text">Kéo thả tệp tin tại đây</span>
                        </div>
                      </div>
                      <div className="importer-uploaded-badge">
                        <FiFileText className="file-icon" />
                        <div className="file-meta">
                          <span className="file-name">vocab_list.csv</span>
                          <span className="file-status">✓ Đã nạp (2.4 KB)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 3 (Medium): AI Dialog Partner */}
            <motion.div className="bento-cell dialog-cell" variants={itemVariants}>
              <div className="cell-top-index">03 // AI DIALOG PARTNER</div>
              <div className="cell-body d-flex flex-column justify-between h-100">
                <div className="dialog-top-group">
                  <h3 className="cell-title">Đàm thoại cùng AI Coach</h3>
                  <p className="cell-text">
                    Luyện nói tự nhiên, không e ngại. AI tự động sửa lỗi ngữ pháp và chấm điểm giọng phát âm tức thì.
                  </p>
                </div>
                <div className="cell-interactive-dialog flex-grow-1">
                  <div className="dialog-history-list">
                    <div className="dialog-item bot">
                      <span className="dialog-dot"></span>
                      <span>AI: Do you like learning English?</span>
                    </div>
                    <div className="dialog-item user">
                      <span>Me: Yes, I like it very much...</span>
                    </div>
                    <div className="dialog-grammar-suggestion">
                      <span className="suggestion-label">Gợi ý tự nhiên hơn:</span>
                      <p className="suggestion-text">"Yes, I really enjoy learning English." (Độ tự nhiên: 98%)</p>
                    </div>
                  </div>
                  
                  {/* Mock Chat Input Bar */}
                  <div className="dialog-input-mock">
                    <span className="input-placeholder">Trả lời AI Coach...</span>
                    <button className="btn-send-mock"><FiSend /></button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 4 (Medium): Gamified Streak Tracker */}
            <motion.div className="bento-cell quests-cell" variants={itemVariants}>
              <div className="cell-top-index">04 // GAME CHALLENGE</div>
              <div className="cell-body d-flex flex-column justify-between h-100">
                <div className="quests-top-group">
                  <h3 className="cell-title">Bài học game hóa</h3>
                  <p className="cell-text">
                    Duy trì động lực mỗi ngày nhờ bảng xếp hạng thi đua và chuỗi học tập Streak rực lửa.
                  </p>
                </div>
                <div className="cell-interactive-quests flex-grow-1">
                  {/* Quests checklist */}
                  <div className="quests-checklist">
                    <div className="quest-mini-item completed">
                      <FiCheckCircle className="quest-check-icon text-green" />
                      <div className="quest-info">
                        <span className="name">Học 5 từ mới hôm nay</span>
                        <span className="progress">5 / 5 từ</span>
                      </div>
                    </div>
                    <div className="quest-mini-item">
                      <FiTarget className="quest-check-icon text-orange" />
                      <div className="quest-info">
                        <span className="name">Luyện hội thoại AI</span>
                        <span className="progress">1 / 3 phút</span>
                      </div>
                    </div>
                  </div>

                  {/* Streak Flame bar */}
                  <div className="streak-bar-preview">
                    <FiZap className="streak-flame" />
                    <span className="streak-txt">5 ngày liên tiếp (+25 XP)</span>
                  </div>

                  {/* Leaderboard Mini widget */}
                  <div className="leaderboard-widget-mini">
                    <span className="leaderboard-title">BẢNG XẾP HẠNG THI ĐUA</span>
                    <div className="leaderboard-rows">
                      <div className="leaderboard-row-item">
                        <span className="rank-badge gold">1</span>
                        <span className="name">Nguyễn Minh</span>
                        <span className="xp-count">1,450 XP</span>
                      </div>
                      <div className="leaderboard-row-item active">
                        <span className="rank-badge active">2</span>
                        <span className="name">Bạn (You)</span>
                        <span className="xp-count">1,210 XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 5 (Medium): Analytics & Mistake Tracker */}
            <motion.div className="bento-cell" variants={itemVariants}>
              <div className="cell-top-index">05 // ANALYTICS & ERROR LOGGER</div>
              <div className="cell-body d-flex flex-column justify-between h-100">
                <div>
                  <h3 className="cell-title">Thống kê & Nhật ký lỗi sai</h3>
                  <p className="cell-text">
                    Theo dõi sự tăng trưởng từ vựng theo thời gian. Hệ thống phân loại từ vựng yếu để xây dựng lộ trình ôn tập cá nhân hóa.
                  </p>
                </div>
                
                <div className="analytics-cockpit-grid">
                  {/* Weekly Chart Cockpit */}
                  <div className="chart-cockpit-box">
                    <div className="cockpit-header">
                      <span className="cockpit-title">TIẾN TRÌNH TUẦN</span>
                      <span className="cockpit-total">+120 từ</span>
                    </div>
                    <div className="cockpit-bars">
                      {[
                        { day: 'T2', val: '40%', num: '+12' },
                        { day: 'T3', val: '65%', num: '+22' },
                        { day: 'T4', val: '50%', num: '+18' },
                        { day: 'T5', val: '85%', num: '+32' },
                        { day: 'T6', val: '60%', num: '+20' },
                        { day: 'CN', val: '95%', num: '+38', active: true },
                      ].map((item, idx) => (
                        <div key={idx} className="cockpit-bar-wrapper">
                          <span className="tooltip-val">{item.num}</span>
                          <div className="bar-track">
                            <div className={`bar-fill-v3 ${item.active ? 'active' : ''}`} style={{ height: item.val }}></div>
                          </div>
                          <span className="bar-label">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mistakes Registry List */}
                  <div className="mistakes-registry-box">
                    <div className="registry-header">
                      <span className="registry-title">NHẬT KÝ LỖI SAI</span>
                      <span className="registry-badge">3 từ yếu</span>
                    </div>
                    <div className="registry-list">
                      <div className="registry-item critical">
                        <div className="word-meta">
                          <span className="word-name font-semibold">unprecedented</span>
                          <span className="word-translation">chưa từng có</span>
                        </div>
                        <div className="registry-item-action-wrapper">
                          <span className="error-tag critical">Sai 3 lần (85%)</span>
                          <span className="btn-retry-mini">Ôn lại <FiArrowRight /></span>
                        </div>
                      </div>
                      <div className="registry-item warning">
                        <div className="word-meta">
                          <span className="word-name font-semibold">exaggerate</span>
                          <span className="word-translation">phóng đại</span>
                        </div>
                        <div className="registry-item-action-wrapper">
                          <span className="error-tag warning">Sai 2 lần (60%)</span>
                          <span className="btn-retry-mini">Ôn lại <FiArrowRight /></span>
                        </div>
                      </div>
                      <div className="registry-item warning">
                        <div className="word-meta">
                          <span className="word-name font-semibold">reluctant</span>
                          <span className="word-translation">miễn cưỡng</span>
                        </div>
                        <div className="registry-item-action-wrapper">
                          <span className="error-tag warning">Sai 2 lần (60%)</span>
                          <span className="btn-retry-mini">Ôn lại <FiArrowRight /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Section Divider */}
        <div className="section-divider-lines" aria-hidden="true">
          <div className="divider-h-line"></div>
          <span className="divider-tag">[ QUY TRÌNH KHOA HỌC ]</span>
        </div>

        {/* SPACED REPETITION TIMELINE SECTION */}
        <motion.section 
          className="srs-interactive-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <motion.div className="section-header-v2" variants={itemVariants}>
            <span className="header-v2-tag">KHOA HỌC NÃO BỘ</span>
            <h2 className="header-v2-title">Dòng thời gian lưu giữ ký ức</h2>
            <p className="header-v2-subtitle">Thuật toán lựa chọn chu kỳ ôn tập để kích hoạt trí nhớ dài hạn vào đúng điểm lãng quên</p>
          </motion.div>

          {/* Interactive Timeline Tabs */}
          <motion.div className="timeline-tabs" variants={itemVariants}>
            {timelineIntervals.map((item) => (
              <button 
                key={item.day}
                className={`timeline-tab-btn ${selectedDay === item.day ? 'active' : ''}`}
                onClick={() => setSelectedDay(item.day)}
              >
                <span className="tab-day">NGÀY {item.day}</span>
                <span className="tab-retention">{item.retention}</span>
              </button>
            ))}
          </motion.div>

          {/* Display Card for Selected day */}
          <motion.div 
            className="timeline-display-card" 
            variants={itemVariants}
            key={selectedDay} // Re-mounts to trigger animation
          >
            <div className="card-top-bar">
              <span className="badge-timeline-step">CHU KỲ {timelineIntervals.findIndex(i => i.day === selectedDay) + 1}</span>
              <div className="timeline-action-pill">
                <FiPlay className="pill-icon" /> {timelineIntervals.find(i => i.day === selectedDay)?.action}
              </div>
            </div>
            <div className="card-main-content">
              <div className="col-desc">
                <h4>Độ bền ghi nhớ đạt {timelineIntervals.find(i => i.day === selectedDay)?.retention}</h4>
                <p>{timelineIntervals.find(i => i.day === selectedDay)?.desc}</p>
              </div>
              <div className="col-stat">
                <div className="radial-progress-mock">
                  <svg className="radial-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke="var(--gl-tertiary)" 
                      strokeWidth="8" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * parseInt(timelineIntervals.find(i => i.day === selectedDay)?.retention || "50")) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="radial-value">{timelineIntervals.find(i => i.day === selectedDay)?.retention}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Section Divider */}
        <div className="section-divider-lines" aria-hidden="true">
          <div className="divider-h-line"></div>
        </div>

        {/* BOTTOM CTA SECTION */}
        <motion.section 
          className="bottom-cta-v2-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          <motion.div className="bottom-cta-v2-card" variants={itemVariants}>
            <div className="glass-grid-overlay" aria-hidden="true"></div>
            <h3 className="cta-title">Sẵn sàng học tiếng Anh vượt trội?</h3>
            <p className="cta-desc">
              Tham gia cùng hàng nghìn học viên đang áp dụng khoa học ghi nhớ để làm chủ tiếng Anh mỗi ngày hoàn toàn miễn phí.
            </p>
            <div className="cta-buttons">
              {isAuthenticated ? (
                <Button as={Link} to="/dashboard" className="btn-v2-primary btn-shimmer">
                  Vào học ngay <FiArrowRight className="btn-icon-arrow" />
                </Button>
              ) : (
                <>
                  <Button as={Link} to="/register" className="btn-v2-primary btn-shimmer">
                    Đăng ký tài khoản <FiArrowRight className="btn-icon-arrow" />
                  </Button>
                  <Button as={Link} to="/login" className="btn-v2-secondary">
                    Đăng nhập
                  </Button>
                </>
              )}
            </div>
            
            {/* Trust Badging */}
            <div className="cta-trust-badge">
              <FiAward className="trust-icon" /> Tích hợp thuật toán lặp lại ngắt quãng & AI Coach chuẩn học thuật
            </div>
          </motion.div>
        </motion.section>
      </Container>
    </div>
  );
}
