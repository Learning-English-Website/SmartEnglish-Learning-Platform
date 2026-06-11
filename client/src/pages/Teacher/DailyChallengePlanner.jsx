import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Plus, Edit2, Trash2, X, Search, Check, Sparkles, Loader } from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import './DailyChallengePlanner.css';

export default function DailyChallengePlanner() {
  const [days, setDays] = useState([]);
  const [challenges, setChallenges] = useState({});
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [xpReward, setXpReward] = useState(50);
  const [bonusMultiplier, setBonusMultiplier] = useState(2);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getNext10Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  };

  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDayName = (date) => {
    const todayKey = formatDateKey(new Date());
    const dateKey = formatDateKey(date);
    if (todayKey === dateKey) return 'Hôm nay';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);
    if (tomorrowKey === dateKey) return 'Ngày mai';

    const options = { weekday: 'long' };
    let name = date.toLocaleDateString('vi-VN', options);
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dayList = getNext10Days();
      setDays(dayList);
      
      const startDate = formatDateKey(dayList[0]);
      const endDate = formatDateKey(dayList[dayList.length - 1]);
      
      const [challengesRes, lessonsRes] = await Promise.all([
        teacherService.getDailyChallenges({ startDate, endDate }),
        teacherService.getLessons({ paginate: 'false' }) // Fetch all lessons
      ]);
      
      const challengeMap = {};
      if (challengesRes.success && challengesRes.data) {
        challengesRes.data.forEach((ch) => {
          challengeMap[ch.date] = ch;
        });
      }
      setChallenges(challengeMap);
      
      if (lessonsRes.success && lessonsRes.data) {
        setLessons(lessonsRes.data);
      } else {
        toast.error('Không thể nạp danh sách bài học');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu lịch trình');
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (dateKey) => {
    setEditingDate(dateKey);
    const existing = challenges[dateKey];
    if (existing) {
      setSelectedLessonId(existing.lesson?._id || '');
      setXpReward(existing.xpReward || 50);
      setBonusMultiplier(existing.bonusMultiplier || 2);
    } else {
      setSelectedLessonId('');
      setXpReward(50);
      setBonusMultiplier(2);
    }
    setSearchTerm('');
    setIsModalOpen(true);
  };

  const handleSaveChallenge = async () => {
    if (!selectedLessonId) {
      toast.error('Vui lòng chọn bài học');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: editingDate,
        lessonId: selectedLessonId,
        xpReward,
        bonusMultiplier,
      };
      const res = await teacherService.saveDailyChallenge(payload);
      if (res.success && res.data) {
        setChallenges((prev) => ({
          ...prev,
          [editingDate]: res.data,
        }));
        toast.success(`Đã lưu thử thách cho ngày ${formatDisplayDate(new Date(editingDate + 'T00:00:00'))}`);
        setIsModalOpen(false);
      } else {
        toast.error('Không thể lưu thử thách');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra khi lưu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChallenge = async (dateKey) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy chỉ định bài học cho ngày ${formatDisplayDate(new Date(dateKey))}?\nThử thách ngày này sẽ quay về cơ chế tự động chọn ngẫu nhiên.`)) {
      return;
    }
    try {
      const res = await teacherService.deleteDailyChallenge(dateKey);
      if (res.success) {
        setChallenges((prev) => {
          const updated = { ...prev };
          delete updated[dateKey];
          return updated;
        });
        toast.success(`Đã hủy chỉ định ngày ${formatDisplayDate(new Date(dateKey + 'T00:00:00'))}`);
      } else {
        toast.error('Không thể hủy thử thách');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Filter lessons based on search query
  const filteredLessons = lessons.filter((l) => {
    const q = searchTerm.toLowerCase();
    const titleMatch = l.title?.toLowerCase()?.includes(q);
    const unitMatch = l.unit?.title?.toLowerCase()?.includes(q);
    const courseMatch = l.unit?.course?.title?.toLowerCase()?.includes(q);
    return titleMatch || unitMatch || courseMatch;
  });

  return (
    <div className="planner-container">
      <div className="planner-header">
        <div className="planner-header-title">
          <div className="planner-sparkle-icon-wrapper">
            <Sparkles className="planner-sparkle-icon" size={20} />
          </div>
          <h2>Lên lịch Thử thách Hàng ngày (Daily Challenge)</h2>
        </div>

      </div>

      {loading ? (
        <div className="planner-loading">
          <Loader className="planner-spinner" size={40} />
          <span>Đang tải lịch trình thử thách...</span>
        </div>
      ) : (
        <div className="planner-timeline">
          {days.map((date) => {
            const dateKey = formatDateKey(date);
            const challenge = challenges[dateKey];
            
            return (
              <div 
                key={dateKey} 
                className={`planner-card ${challenge ? 'is-assigned' : 'is-random'}`}
              >
                <div className="planner-card-date">
                  <span className="date-weekday">{getDayName(date)}</span>
                  <span className="date-full">{formatDisplayDate(date)}</span>
                </div>
                
                <div className="planner-card-content">
                  {challenge ? (
                    <div className="assigned-info">
                      <div className="assigned-status-badge">🧑‍🏫 Giáo viên chỉ định</div>
                      <h4 className="assigned-lesson-title">{challenge.lesson?.title}</h4>
                      <div className="assigned-lesson-meta">
                        <span className="course-name-meta">
                          Khóa: <strong>{challenge.lesson?.unit?.course?.title || 'Chưa rõ'}</strong>
                        </span>
                        <span className="unit-name-meta">
                          Unit: <strong>{challenge.lesson?.unit?.title || 'Chưa rõ'}</strong>
                        </span>
                      </div>
                      <div className="assigned-rewards">
                        <span className="reward-tag xp">🏆 {challenge.xpReward} XP</span>
                        <span className="reward-tag multiplier">⚡ Nhân x{challenge.bonusMultiplier}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="random-info">
                      <div className="random-status-badge">🎲 Hệ thống tự chọn</div>
                      <p className="random-desc">Hệ thống sẽ tự động chọn ngẫu nhiên 1 bài học bất kỳ khi bắt đầu ngày mới.</p>
                      <div className="assigned-rewards">
                        <span className="reward-tag xp">🏆 50 XP</span>
                        <span className="reward-tag multiplier">⚡ Nhân x2</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="planner-card-actions">
                  {challenge ? (
                    <div className="action-buttons-group">
                      <button 
                        className="action-btn edit" 
                        onClick={() => openConfigModal(dateKey)}
                        title="Chỉnh sửa thử thách"
                      >
                        <Edit2 size={16} />
                        <span>Sửa</span>
                      </button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => handleDeleteChallenge(dateKey)}
                        title="Hủy chỉ định (quay về ngẫu nhiên)"
                      >
                        <Trash2 size={16} />
                        <span>Hủy chỉ định</span>
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="action-btn create" 
                      onClick={() => openConfigModal(dateKey)}
                    >
                      <Plus size={16} />
                      <span>Chỉ định bài học</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cấu hình */}
      {isModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cấu hình thử thách ngày {formatDisplayDate(new Date(editingDate + 'T00:00:00'))}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Rewards settings */}
              <div className="reward-settings-grid">
                <div className="form-group">
                  <label className="form-label">Điểm thưởng XP</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={xpReward} 
                    onChange={(e) => setXpReward(Math.max(1, Number(e.target.value)))} 
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hệ số nhân điểm</label>
                  <input 
                    type="number" 
                    className="form-input"
                    value={bonusMultiplier} 
                    onChange={(e) => setBonusMultiplier(Math.max(1, Number(e.target.value)))} 
                    min="1"
                  />
                </div>
              </div>
              
              {/* Lesson selection */}
              <div className="lesson-selection-section">
                <label className="form-label">Chọn bài học chỉ định</label>
                <div className="lesson-search-box">
                  <Search className="search-icon" size={16} />
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder="Tìm kiếm bài học, Unit, hoặc Khóa học..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="lesson-items-list">
                  {filteredLessons.length > 0 ? (
                    filteredLessons.map((l) => {
                      const isSelected = selectedLessonId === l._id;
                      return (
                        <div 
                          key={l._id} 
                          className={`lesson-select-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedLessonId(l._id)}
                        >
                          <div className="lesson-select-item-text">
                            <span className="lesson-select-title">{l.title}</span>
                            <span className="lesson-select-path">
                              {l.unit?.course?.title || 'Khóa học'} &raquo; {l.unit?.title || 'Unit'}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="lesson-select-check">
                              <Check size={16} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-search-state">Không tìm thấy bài học nào phù hợp</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="modal-btn cancel" 
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="modal-btn save" 
                onClick={handleSaveChallenge}
                disabled={submitting || !selectedLessonId}
              >
                {submitting ? 'Đang lưu...' : 'Lưu Thử thách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
