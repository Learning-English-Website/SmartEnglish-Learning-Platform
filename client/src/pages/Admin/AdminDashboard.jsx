import { useState, useEffect } from 'react';
import { BookOpen, Layers, FileText, Target, BookMarked, FolderOpen, Users, Settings } from 'lucide-react';
import { adminService } from '../../services/adminService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [duoStats, setDuoStats] = useState(null);
  const [quizletStats, setQuizletStats] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getFlashcardSets({ limit: 1 }),
      adminService.getAllFolders({ limit: 1 }),
      adminService.getUsers({ limit: 1 }),
    ]).then(([duo, flashcards, folders, users]) => {
      setDuoStats(duo.data || {});
      setQuizletStats({
        sets: flashcards.data?.total || 0,
        folders: folders.data?.total || 0,
      });
      setUserCount(users.data?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Khóa học', value: duoStats?.courses, icon: <BookOpen size={22} />, color: '#3b82f6', bg: '#eff6ff', key: 'courses' },
    { label: 'Units', value: duoStats?.units, icon: <Layers size={22} />, color: '#22c55e', bg: '#f0fdf4', key: 'units' },
    { label: 'Lessons', value: duoStats?.lessons, icon: <FileText size={22} />, color: '#f97316', bg: '#fff7ed', key: 'lessons' },
    { label: 'Challenges', value: duoStats?.challenges, icon: <Target size={22} />, color: '#a855f7', bg: '#fdf4ff', key: 'challenges' },
    { label: 'Flashcard Sets', value: quizletStats?.sets, icon: <BookMarked size={22} />, color: '#0ea5e9', bg: '#f0f9ff', key: 'sets' },
    { label: 'Folders', value: quizletStats?.folders, icon: <FolderOpen size={22} />, color: '#f59e0b', bg: '#fffbeb', key: 'folders' },
    { label: 'Users', value: userCount, icon: <Users size={22} />, color: '#64748b', bg: '#f8fafc', key: 'users' },
  ];

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-welcome">
        <h2>Chào mừng đến Admin Panel</h2>
        <p>Quản lý nội dung học tập và giám sát hoạt động nền tảng SmartEnglish.</p>
      </div>

      <div className="admin-stats-grid">
        {cards.map(card => (
          <div key={card.key} className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="admin-stat-info">
              <span className="admin-stat-value">
                {loading ? '—' : (card.value ?? 0)}
              </span>
              <span className="admin-stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-quick">
        <h3>Thao tác nhanh</h3>
        <div className="admin-quick-actions">
          <a href="/admin/courses" className="admin-quick-action">
            <div className="admin-quick-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><BookOpen size={20} /></div>
            <div className="admin-quick-text">
              <span className="admin-quick-title">Khóa học</span>
              <span className="admin-quick-desc">Quản lý danh sách khóa học</span>
            </div>
          </a>
          <a href="/admin/flashcards" className="admin-quick-action">
            <div className="admin-quick-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}><BookMarked size={20} /></div>
            <div className="admin-quick-text">
              <span className="admin-quick-title">Flashcard Sets</span>
              <span className="admin-quick-desc">Quản lý bộ thẻ học</span>
            </div>
          </a>
          <a href="/admin/folders" className="admin-quick-action">
            <div className="admin-quick-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><FolderOpen size={20} /></div>
            <div className="admin-quick-text">
              <span className="admin-quick-title">Folders</span>
              <span className="admin-quick-desc">Tổ chức thư mục bộ thẻ</span>
            </div>
          </a>
          <a href="/admin/users" className="admin-quick-action">
            <div className="admin-quick-icon" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}><Users size={20} /></div>
            <div className="admin-quick-text">
              <span className="admin-quick-title">Người dùng</span>
              <span className="admin-quick-desc">Quản lý tài khoản người dùng</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
