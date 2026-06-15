import { useState, useEffect } from 'react';
import { 
  Users, CreditCard, DollarSign, BookOpen, Layers, 
  FileText, Target, BookMarked, FolderOpen, Calendar, 
  ChevronUp, Settings, X, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [duoStats, setDuoStats] = useState(null);
  const [quizletStats, setQuizletStats] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [premiumUserCount, setPremiumUserCount] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [challengeTypes, setChallengeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);

  // Widget panel collapse state (for collapse button simulation)
  const [collapsedPanels, setCollapsedPanels] = useState({
    versions: false,
    devices: false,
    quick: false
  });

  // Fetch static numbers once
  useEffect(() => {
    Promise.all([
      adminService.getFlashcardSets({ limit: 1 }),
      adminService.getAllFolders({ limit: 1 }),
      adminService.getUsers({ limit: 1 }),
      adminService.getOrders({ limit: 1 }),
    ]).then(([flashcards, folders, users, orders]) => {
      setQuizletStats({
        sets: flashcards.data?.total || 0,
        folders: folders.data?.total || 0,
      });
      setUserCount(users.data?.total || 0);
      setPremiumUserCount(users.data?.premiumUsers || 0);
      setOrderCount(orders.data?.total || 0);
      setRevenue(orders.data?.totalRevenue || 0);
    }).catch((err) => {
      console.error('Failed to load static dashboard statistics:', err);
    });
  }, []);

  // Fetch range-dependent statistics
  useEffect(() => {
    setLoading(true);
    adminService.getStats({ range })
      .then((res) => {
        const duoData = res.data || {};
        setDuoStats(duoData);
        setActivityData(duoData.activity7Days || []);
        setRolesData(duoData.roles || []);
        setChallengeTypes(duoData.challengesByType || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard statistics for range:', range, err);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const togglePanel = (panelName) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  };

  // --- Dynamic calculations for SVG Line Chart (Network Activities) ---
  const maxRegs = Math.max(...activityData.map(d => d.registrations), 1);
  const maxRevenue = Math.max(...activityData.map(d => d.revenue), 5000);

  const stepX = activityData.length > 1 ? 800 / (activityData.length - 1) : 800;

  const pointsRegs = activityData.map((d, i) => {
    const x = i * stepX;
    const y = 220 - (d.registrations / maxRegs) * 160;
    return { x, y, val: d.registrations, date: d.dateLabel };
  });

  const pointsRev = activityData.map((d, i) => {
    const x = i * stepX;
    const y = 220 - (d.revenue / maxRevenue) * 160;
    return { x, y, val: d.revenue, date: d.dateLabel };
  });

  // Construct SVG path strings for registrations (Wave 2)
  const pathRegsLine = pointsRegs.length > 0
    ? `M ${pointsRegs[0].x},${pointsRegs[0].y} ` + pointsRegs.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
    : '';
  const pathRegsFill = pointsRegs.length > 0
    ? `M 0,280 L ${pointsRegs[0].x},${pointsRegs[0].y} ` + pointsRegs.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + ` L 800,280 Z`
    : '';

  // Construct SVG path strings for sales revenue (Wave 1)
  const pathRevLine = pointsRev.length > 0
    ? `M ${pointsRev[0].x},${pointsRev[0].y} ` + pointsRev.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
    : '';
  const pathRevFill = pointsRev.length > 0
    ? `M 0,280 L ${pointsRev[0].x},${pointsRev[0].y} ` + pointsRev.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') + ` L 800,280 Z`
    : '';

  // Date range label
  const dateRange = activityData.length > 0
    ? `${activityData[0].dateLabel} - ${activityData[activityData.length - 1].dateLabel}`
    : 'Last 7 Days';

  // Label rendering interval to avoid overlapping
  const labelInterval = Math.max(Math.floor(activityData.length / 7), 1);

  // --- Dynamic calculations for Top Content progress ---
  const coursesProgress = duoStats ? Math.min(Math.round((duoStats.courses / 10) * 100), 100) : 0;
  const unitsProgress = duoStats ? Math.min(Math.round((duoStats.units / 30) * 100), 100) : 0;
  const lessonsProgress = duoStats ? Math.min(Math.round((duoStats.lessons / 100) * 100), 100) : 0;
  const challengesProgress = duoStats ? Math.min(Math.round((duoStats.challenges / 500) * 100), 100) : 0;

  // --- Dynamic calculations for Challenge Types ---
  const sortedTypes = [...challengeTypes]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const totalChallengesByType = challengeTypes.reduce((sum, item) => sum + item.count, 0) || 1;

  // --- Dynamic calculations for User Role Donut Chart ---
  const totalUsersInRoles = rolesData.reduce((sum, item) => sum + item.count, 0) || 1;
  const sortedRoles = ['student', 'teacher', 'cskh', 'admin']
    .map(roleName => {
      const found = rolesData.find(r => r._id === roleName);
      let displayName = roleName;
      if (roleName === 'student') displayName = 'Học viên';
      else if (roleName === 'teacher') displayName = 'Giáo viên';
      else if (roleName === 'cskh') displayName = 'CSKH';
      else if (roleName === 'admin') displayName = 'Quản trị viên';
      return {
        name: displayName,
        count: found ? found.count : 0,
        percentage: found ? Math.round((found.count / totalUsersInRoles) * 100) : 0
      };
    });

  const C = 188.5; // Circumference for r=30
  let accumulatedPercent = 0;
  const donutSegments = sortedRoles.map((role, idx) => {
    const percent = role.percentage;
    const length = (percent / 100) * C;
    const offset = -accumulatedPercent;
    accumulatedPercent += length;
    
    const colors = ['#26B99A', '#34495E', '#9B59B6', '#E74C3C'];
    const legendColors = ['color-green', 'color-blue', 'color-purple', 'color-red'];
    return {
      ...role,
      length,
      offset,
      color: colors[idx % colors.length],
      legendColor: legendColors[idx % legendColors.length]
    };
  });

  // --- Premium Conversion rate ---
  const premiumRate = userCount > 0 ? Math.round((premiumUserCount / userCount) * 100) : 0;
  const gaugeOffset = -110 * (1 - premiumRate / 100);

  return (
    <div className="admin-dashboard-page">
      {/* ── Gentelella Metrics Grid ── */}
      <div className="gentelella-stats-tile">
        {/* Metric 1: Total Users */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><Users size={12} className="tile-label-icon" /> TỔNG NGƯỜI DÙNG</span>
          <div className="stat-tile-value text-slate">{loading ? '—' : (userCount ?? 0)}</div>
          <span className="stat-tile-subtext text-green">
            <ArrowUpRight size={10} /> 4% so với tuần trước
          </span>
        </div>

        {/* Metric 2: Average Study Time */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><Calendar size={12} className="tile-label-icon" /> THỜI GIAN HỌC TB</span>
          <div className="stat-tile-value text-slate">123.50</div>
          <span className="stat-tile-subtext text-green">
            <ArrowUpRight size={10} /> 3% so với tuần trước
          </span>
        </div>

        {/* Metric 3: Premium Users */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><Users size={12} className="tile-label-icon" /> THÀNH VIÊN PREMIUM</span>
          <div className="stat-tile-value text-green">{loading ? '—' : (premiumUserCount ?? 0)}</div>
          <span className="stat-tile-subtext text-green">
            <ArrowUpRight size={10} /> 34% so với tuần trước
          </span>
        </div>

        {/* Metric 4: Total Orders */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><CreditCard size={12} className="tile-label-icon" /> TỔNG ĐƠN HÀNG</span>
          <div className="stat-tile-value text-red">{loading ? '—' : (orderCount ?? 0)}</div>
          <span className="stat-tile-subtext text-red">
            <ArrowDownRight size={10} /> 12% so với tuần trước
          </span>
        </div>

        {/* Metric 5: Flashcard Sets */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><BookMarked size={12} className="tile-label-icon" /> BỘ THẺ HỌC</span>
          <div className="stat-tile-value text-slate">{loading ? '—' : (quizletStats?.sets ?? 0)}</div>
          <span className="stat-tile-subtext text-green">
            <ArrowUpRight size={10} /> 34% so với tuần trước
          </span>
        </div>

        {/* Metric 6: Total Revenue */}
        <div className="stat-tile-col">
          <span className="stat-tile-label"><DollarSign size={12} className="tile-label-icon" /> DOANH THU</span>
          <div className="stat-tile-value text-slate font-small">
            {loading ? '—' : formatPrice(revenue || 0)}
          </div>
          <span className="stat-tile-subtext text-green">
            <ArrowUpRight size={10} /> 34% so với tuần trước
          </span>
        </div>
      </div>

      {/* ── Network Activities (Main Chart & Campaign) ── */}
      <div className="dashboard-x-panel network-panel">
        <div className="x-panel-title">
          <div className="panel-title-text">
            <h3>Hoạt động hệ thống <span className="sub-title">Đăng ký mới & Doanh thu</span></h3>
          </div>
          <div className="panel-title-filter">
            <div className="date-picker-button-wrapper">
              <div className="date-picker-button" onClick={() => setRangeDropdownOpen(!rangeDropdownOpen)}>
                <Calendar size={13} className="calendar-icon" />
                <span>{dateRange}</span>
                <span className="arrow-down-triangle">▼</span>
              </div>
              {rangeDropdownOpen && (
                <div className="range-dropdown-menu">
                  <div className={`range-dropdown-item ${range === 7 ? 'active' : ''}`} onClick={() => { setRange(7); setRangeDropdownOpen(false); }}>
                    7 ngày qua (Last 7 Days)
                  </div>
                  <div className={`range-dropdown-item ${range === 30 ? 'active' : ''}`} onClick={() => { setRange(30); setRangeDropdownOpen(false); }}>
                    30 ngày qua (Last 30 Days)
                  </div>
                  <div className={`range-dropdown-item ${range === 90 ? 'active' : ''}`} onClick={() => { setRange(90); setRangeDropdownOpen(false); }}>
                    90 ngày qua (Last 90 Days)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="x-panel-body network-body">
          {/* Main Area Chart (SVG Dynamic Wave) */}
          <div className="network-chart-container">
            {activityData.length > 0 ? (
              <svg viewBox="0 0 800 280" className="network-svg-chart" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wave1-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26B99A" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#26B99A" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="wave2-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34495E" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#34495E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="40" x2="800" y2="40" stroke="#F5F5F5" strokeWidth="1" />
                <line x1="0" y1="100" x2="800" y2="100" stroke="#F5F5F5" strokeWidth="1" />
                <line x1="0" y1="160" x2="800" y2="160" stroke="#F5F5F5" strokeWidth="1" />
                <line x1="0" y1="220" x2="800" y2="220" stroke="#F5F5F5" strokeWidth="1" />

                {/* Wave 2 (Registrations - Dark blue wave) */}
                <path d={pathRegsFill} fill="url(#wave2-grad)" />
                <path d={pathRegsLine} fill="none" stroke="#34495E" strokeWidth="2.5" />

                {/* Wave 1 (Revenue - Emerald Green wave) */}
                <path d={pathRevFill} fill="url(#wave1-grad)" />
                <path d={pathRevLine} fill="none" stroke="#26B99A" strokeWidth="3.5" />

                {/* Dot Indicators */}
                {pointsRev.map((p, i) => (
                  <circle key={`rev-dot-${i}`} cx={p.x} cy={p.y} r="4.5" fill="#26B99A" stroke="#FFF" strokeWidth="2" />
                ))}
                {pointsRegs.map((p, i) => (
                  <circle key={`reg-dot-${i}`} cx={p.x} cy={p.y} r="4.5" fill="#34495E" stroke="#FFF" strokeWidth="2" />
                ))}

                {/* X Axis Labels */}
                {activityData.map((d, i) => {
                  if (i % labelInterval !== 0 && i !== activityData.length - 1) return null;
                  return (
                    <text key={`x-lbl-${i}`} x={i * stepX} y="265" fill="#A0A0A0" fontSize="10" textAnchor="middle">
                      {d.dateLabel}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="admin-spinner"></div>
            )}
          </div>

          {/* Top Content Performance */}
          <div className="campaign-performance-panel">
            <h4>Thống kê Học liệu Hệ thống</h4>
            <div className="campaign-list">
              {/* Courses */}
              <div className="campaign-item">
                <div className="campaign-meta">
                  <span className="campaign-name">Khóa học (Mục tiêu: 10)</span>
                  <span className="campaign-value">{duoStats?.courses || 0} ({coursesProgress}%)</span>
                </div>
                <div className="campaign-progress-bar">
                  <div className="progress-fill fill-green" style={{ width: `${coursesProgress}%` }}></div>
                </div>
              </div>

              {/* Units */}
              <div className="campaign-item">
                <div className="campaign-meta">
                  <span className="campaign-name">Chương học (Mục tiêu: 30)</span>
                  <span className="campaign-value">{duoStats?.units || 0} ({unitsProgress}%)</span>
                </div>
                <div className="campaign-progress-bar">
                  <div className="progress-fill fill-green" style={{ width: `${unitsProgress}%` }}></div>
                </div>
              </div>

              {/* Lessons */}
              <div className="campaign-item">
                <div className="campaign-meta">
                  <span className="campaign-name">Bài học (Mục tiêu: 100)</span>
                  <span className="campaign-value">{duoStats?.lessons || 0} ({lessonsProgress}%)</span>
                </div>
                <div className="campaign-progress-bar">
                  <div className="progress-fill fill-green" style={{ width: `${lessonsProgress}%` }}></div>
                </div>
              </div>

              {/* Challenges */}
              <div className="campaign-item">
                <div className="campaign-meta">
                  <span className="campaign-name">Thử thách (Mục tiêu: 500)</span>
                  <span className="campaign-value">{duoStats?.challenges || 0} ({challengesProgress}%)</span>
                </div>
                <div className="campaign-progress-bar">
                  <div className="progress-fill fill-green" style={{ width: `${challengesProgress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Widgets Row ── */}
      <div className="dashboard-widgets-grid">
        {/* Widget 1: App Content (Challenge Types) */}
        <div className={`dashboard-x-panel widget-panel ${collapsedPanels.versions ? 'collapsed' : ''}`}>
          <div className="x-panel-title">
            <h3>Các loại Thử thách</h3>
            <div className="panel-actions">
              <button className="panel-action-btn" onClick={() => togglePanel('versions')}><ChevronUp size={11} className={collapsedPanels.versions ? 'rotate-180' : ''} /></button>
              <button className="panel-action-btn"><Settings size={11} /></button>
              <button className="panel-action-btn"><X size={11} /></button>
            </div>
          </div>
          <div className="x-panel-body">
            <h4 className="widget-section-title">Phân tích thử thách trong CSDL</h4>
            <div className="app-version-list">
              {sortedTypes.map((item, idx) => {
                const percent = Math.round((item.count / totalChallengesByType) * 100);
                return (
                  <div key={`ch-type-${idx}`} className="version-item">
                    <span className="version-code">{item._id}</span>
                    <div className="version-bar-wrap">
                      <div className="progress-fill fill-green" style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="version-count">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Widget 2: User Role Distribution */}
        <div className={`dashboard-x-panel widget-panel ${collapsedPanels.devices ? 'collapsed' : ''}`}>
          <div className="x-panel-title">
            <h3>Phân bổ vai trò người dùng</h3>
            <div className="panel-actions">
              <button className="panel-action-btn" onClick={() => togglePanel('devices')}><ChevronUp size={11} className={collapsedPanels.devices ? 'rotate-180' : ''} /></button>
              <button className="panel-action-btn"><Settings size={11} /></button>
              <button className="panel-action-btn"><X size={11} /></button>
            </div>
          </div>
          <div className="x-panel-body device-body">
            <div className="device-chart-wrap">
              {/* Donut Chart SVG (Radius 30, Perimeter 188.5) */}
              <svg viewBox="0 0 100 100" className="donut-chart-svg">
                {donutSegments.map((seg, idx) => (
                  <circle 
                    key={`donut-seg-${idx}`}
                    cx="50" 
                    cy="50" 
                    r="30" 
                    fill="none" 
                    stroke={seg.color} 
                    strokeWidth="12" 
                    strokeDasharray={`${seg.length} 188.5`} 
                    strokeDashoffset={seg.offset} 
                  />
                ))}
              </svg>
              <div className="donut-inner-label">
                <span className="donut-title">Vai trò</span>
                <span className="donut-sub">Thành viên</span>
              </div>
            </div>

            <div className="device-legend-wrap">
              <table className="device-legend-table">
                <thead>
                  <tr>
                    <th>Vai trò</th>
                    <th style={{ textAlign: 'right' }}>Tỷ lệ % (Số lượng)</th>
                  </tr>
                </thead>
                <tbody>
                  {donutSegments.map((seg, idx) => (
                    <tr key={`legend-row-${idx}`}>
                      <td><span className={`legend-dot ${seg.legendColor}`} /> {seg.name}</td>
                      <td align="right">{seg.percentage}% ({seg.count})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Widget 3: Premium Users Info */}
        <div className={`dashboard-x-panel widget-panel ${collapsedPanels.quick ? 'collapsed' : ''}`}>
          <div className="x-panel-title">
            <h3>Thiết lập nhanh</h3>
            <div className="panel-actions">
              <button className="panel-action-btn" onClick={() => togglePanel('quick')}><ChevronUp size={11} className={collapsedPanels.quick ? 'rotate-180' : ''} /></button>
              <button className="panel-action-btn"><Settings size={11} /></button>
              <button className="panel-action-btn"><X size={11} /></button>
            </div>
          </div>
          <div className="x-panel-body quick-settings-body">
            <div className="quick-links-list">
              <a href="/admin/users" className="quick-setting-link">⚙ Quản lý người dùng</a>
              <a href="/admin/orders" className="quick-setting-link">💳 Lịch sử giao dịch</a>
              <a href="/admin/courses" className="quick-setting-link">🔁 Chương trình học</a>
              <a href="/admin/feedback" className="quick-setting-link">🏆 Hộp thư hỗ trợ</a>
              <a href="/" className="quick-setting-link">🚪 Quay lại ứng dụng</a>
            </div>

            <div className="profile-completion-wrap">
              <h4 className="completion-title">Tỷ lệ chuyển đổi Premium</h4>
              <div className="completion-gauge">
                {/* Semi-circle Gauge SVG */}
                <svg viewBox="0 0 100 100" className="gauge-svg">
                  {/* Gray background track */}
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#E6E9ED" strokeWidth="8" strokeDasharray="110 220" strokeDashoffset="0" transform="rotate(-180 50 50)" strokeLinecap="round" />
                  {/* Emerald Green active progress */}
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#26B99A" strokeWidth="8" strokeDasharray="110 220" strokeDashoffset={gaugeOffset} transform="rotate(-180 50 50)" strokeLinecap="round" />
                </svg>
                <div className="gauge-label-value">{premiumRate}%</div>
              </div>
              <div className="completion-bottom-meta">
                <span className="meta-text">{premiumUserCount} Premium</span>
                <span className="meta-text">{userCount} Tổng số</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

