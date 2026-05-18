import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import {
  ChevronLeft, Globe, Lock, Share2, Edit2,
  BookOpen, Brain, ClipboardCheck, Box, Zap, Link2,
  Plus, Star, Volume2, MoreHorizontal, X, Save
} from 'lucide-react';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { toast } from 'react-hot-toast';
import './StudySetDetail.css';

const LEARNING_MODES = [
  { id: 'flashcards', icon: BookOpen, name: 'Thẻ ghi nhớ', desc: 'Xem & lật thẻ', path: 'flashcards' },
  { id: 'learn', icon: Brain, name: 'Học', desc: 'Ôn luyện thông minh', path: 'learn' },
  { id: 'test', icon: ClipboardCheck, name: 'Kiểm tra', desc: 'Trắc nghiệm', path: 'test' },
  { id: 'match', icon: Box, name: 'Khớp thẻ', desc: 'Ghép cặp thẻ', path: 'match' },
];

export default function StudySetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Modal state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  // Edit card state
  const [editingCard, setEditingCard] = useState(null);
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [updatingCard, setUpdatingCard] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [setRes, cardsRes] = await Promise.all([
          setService.getById(id),
          cardService.getBySetId(id),
        ]);
        setStudySet(setRes?.data ?? setRes);
        setCards(Array.isArray(cardsRes?.data) ? cardsRes.data : (cardsRes ?? []));
      } catch { toast.error('Không thể tải học phần.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const nextCard = () => { setFlipped(false); setCurrentIndex((i) => Math.min(i + 1, cards.length - 1)); };
  const prevCard = () => { setFlipped(false); setCurrentIndex((i) => Math.max(i - 1, 0)); };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextCard(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevCard(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const authorName = studySet?.user?.username || user?.username || 'Người dùng';
  const authorInitial = authorName[0]?.toUpperCase() || 'U';

  // Handle add card
  const handleAddCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim()) {
      toast.error('Vui lòng nhập đủ thông tin thuật ngữ');
      return;
    }
    setAddingCard(true);
    try {
      const res = await cardService.create(id, { front: newCardFront.trim(), back: newCardBack.trim() });
      const newCard = res?.data ?? res;
      setCards(prev => [...prev, newCard]);
      setNewCardFront('');
      setNewCardBack('');
      setShowAddCardModal(false);
      toast.success('Đã thêm thuật ngữ');
    } catch {
      toast.error('Không thể thêm thuật ngữ');
    } finally {
      setAddingCard(false);
    }
  };

  // Handle edit card
  const handleEditCard = (card) => {
    setEditingCard(card._id);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
  };

  const handleUpdateCard = async () => {
    if (!editCardFront.trim() || !editCardBack.trim()) {
      toast.error('Vui lòng nhập đủ thông tin thuật ngữ');
      return;
    }
    setUpdatingCard(true);
    try {
      await cardService.update(editingCard, { front: editCardFront.trim(), back: editCardBack.trim() });
      setCards(prev => prev.map(c => c._id === editingCard ? { ...c, front: editCardFront.trim(), back: editCardBack.trim() } : c));
      setEditingCard(null);
      toast.success('Đã cập nhật thuật ngữ');
    } catch {
      toast.error('Không thể cập nhật thuật ngữ');
    } finally {
      setUpdatingCard(false);
    }
  };

  // Handle delete card
  const handleDeleteCard = async (cardId) => {
    if (!confirm('Bạn có chắc muốn xóa thuật ngữ này?')) return;
    try {
      await cardService.delete(cardId);
      setCards(prev => prev.filter(c => c._id !== cardId));
      toast.success('Đã xóa thuật ngữ');
    } catch {
      toast.error('Không thể xóa thuật ngữ');
    }
  };

  if (loading) return (
    <div className="sd2-page">
      <div className="sd2-loading"><div className="spinner-border text-primary" /><span>Đang tải học phần...</span></div>
    </div>
  );

  if (!studySet) return (
    <div className="sd2-page">
      <div className="sd2-loading">
        <p>Không tìm thấy học phần.</p>
        <button className="sd2-action-btn sd2-action-btn--outline" onClick={() => navigate(-1)}><ChevronLeft size={14} />Quay lại</button>
      </div>
    </div>
  );

  return (
    <div className="sd2-page">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="sd2-page-header">
        <button className="sd2-breadcrumb" onClick={() => navigate(-1)}><ChevronLeft size={14} />Quay lại</button>

        <div className="sd2-set-header">
          <div className="sd2-set-header-left">
            <div className="sd2-set-title-row">
              <h1 className="sd2-set-title">{studySet.title}</h1>
              <span className={`sd2-set-visibility ${studySet.isPublic ? 'public' : 'private'}`}>
                {studySet.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                {studySet.isPublic ? 'Công khai' : 'Riêng tư'}
              </span>
            </div>
            {studySet.description && <p className="sd2-set-desc">{studySet.description}</p>}
            <div className="sd2-set-meta">
              <span className="sd2-set-meta-item"><BookOpen size={14} /><strong>{cards.length}</strong> thuật ngữ</span>
              {studySet.createdAt && <span className="sd2-set-meta-item">Tạo {formatDate(studySet.createdAt)}</span>}
            </div>
            <div className="sd2-author-card">
              <div className="sd2-author-avatar">
                {studySet?.user?.avatar ? (
                  <img src={studySet.user.avatar} alt={authorName} />
                ) : (
                  authorInitial
                )}
              </div>
              <div className="sd2-author-info">
                <span className="sd2-author-name">{authorName}</span>
                {studySet.createdAt && <span className="sd2-author-time">Tạo {formatDate(studySet.createdAt)}</span>}
              </div>
            </div>
          </div>
          <div className="sd2-set-header-actions">
            <button className="sd2-action-btn sd2-action-btn--primary" onClick={() => navigate(`/study-sets/${id}/learn`)}><Brain size={14} />Học</button>
            <button className="sd2-action-btn sd2-action-btn--outline"><Edit2 size={14} />Sửa</button>
            <button className="sd2-action-btn sd2-action-btn--outline"><Share2 size={14} />Chia sẻ</button>
            <button className="sd2-action-btn sd2-action-btn--icon"><MoreHorizontal size={15} /></button>
          </div>
        </div>
      </div>

      {/* ── Learning Modes ─────────────────────────────────────────────── */}
      <div className="sd2-modes-section">
        <div className="sd2-section-title">Chế độ học tập</div>
        <div className="sd2-modes-grid">
          {LEARNING_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button key={mode.id} className="sd2-mode-card" onClick={() => navigate(`/study-sets/${id}/${mode.path}`)}>
                <div className="sd2-mode-icon"><Icon size={24} /></div>
                <div><div className="sd2-mode-name">{mode.name}</div><div className="sd2-mode-desc">{mode.desc}</div></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Flashcard Viewer ──────────────────────────────────────────── */}
      {cards.length > 0 && (
        <div className="sd2-viewer-section">
          <div className="sd2-viewer-wrapper">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentIndex + 1} / {cards.length}</span>
              <div style={{ flex: 1, height: '4px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((currentIndex + 1) / cards.length) * 100}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setFlipped((f) => !f)} style={{ background: flipped ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--bg-page)', border: '1.5px solid var(--border-subtle)', color: flipped ? '#fff' : 'var(--text-muted)', borderRadius: '7px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>Lật</button>
              </div>
            </div>

            <div onClick={() => setFlipped((f) => !f)} style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', cursor: 'pointer' }}>
              <div className={`sd2-card-inner ${flipped ? 'flipped' : ''}`}>
                <div className="sd2-card-front">
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Thuật ngữ
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>
                    {cards[currentIndex]?.front || ''}
                  </div>
                </div>
                <div className="sd2-card-back">
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Định nghĩa
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>
                    {cards[currentIndex]?.back || ''}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={prevCard} disabled={currentIndex === 0} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-page)', color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-body)', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {cards.map((_, i) => (
                  <button key={i} onClick={() => { setCurrentIndex(i); setFlipped(false); }} style={{ width: i === currentIndex ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', background: i === currentIndex ? 'linear-gradient(90deg, #4f46e5, #7c3aed)' : 'var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0 }} />
                ))}
              </div>
              <button onClick={nextCard} disabled={currentIndex === cards.length - 1} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-page)', color: currentIndex === cards.length - 1 ? 'var(--text-muted)' : 'var(--text-body)', cursor: currentIndex === cards.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === cards.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Term List ─────────────────────────────────────────────────── */}
      <div className="sd2-terms-section">
        <div className="sd2-terms-header">
          <div className="sd2-terms-title">Thuật ngữ trong học phần<span className="sd2-terms-count"> ({cards.length})</span></div>
          <button className="sd2-action-btn sd2-action-btn--outline" onClick={() => setShowAddCardModal(true)}><Plus size={13} />Thêm thuật ngữ</button>
        </div>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}><p>Chưa có thuật ngữ nào. Bắt đầu thêm thẻ!</p></div>
        ) : (
          <div className="sd2-term-list">
            {cards.map((card, idx) => (
              <div key={card._id || idx} className="sd2-term-row">
                <span className="sd2-term-num">{idx + 1}</span>
                <span className="sd2-term-front">{card.front}</span>
                <span className="sd2-term-back">{card.back}</span>
                <div className="sd2-term-actions">
                  <button className="sd2-term-btn" title="Yêu thích"><Star size={14} /></button>
                  <button className="sd2-term-btn" title="Phát âm"><Volume2 size={14} /></button>
                  <button className="sd2-term-btn" title="Sửa" onClick={() => handleEditCard(card)}><Edit2 size={13} /></button>
                  <button className="sd2-term-btn sd2-term-btn--delete" title="Xóa" onClick={() => handleDeleteCard(card._id)}><MoreHorizontal size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="modal-overlay" onClick={() => setShowAddCardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm thuật ngữ mới</h3>
              <button className="modal-close" onClick={() => setShowAddCardModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Thuật ngữ (tiếng Anh)</label>
                <input
                  type="text"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  placeholder="Nhập thuật ngữ..."
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Định nghĩa (tiếng Việt)</label>
                <input
                  type="text"
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  placeholder="Nhập định nghĩa..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn--cancel" onClick={() => setShowAddCardModal(false)}>
                Hủy
              </button>
              <button className="modal-btn modal-btn--primary" onClick={handleAddCard} disabled={addingCard}>
                <Plus size={14} />
                {addingCard ? 'Đang thêm...' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="modal-overlay" onClick={() => setEditingCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sửa thuật ngữ</h3>
              <button className="modal-close" onClick={() => setEditingCard(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Thuật ngữ (tiếng Anh)</label>
                <input
                  type="text"
                  value={editCardFront}
                  onChange={(e) => setEditCardFront(e.target.value)}
                  placeholder="Nhập thuật ngữ..."
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Định nghĩa (tiếng Việt)</label>
                <input
                  type="text"
                  value={editCardBack}
                  onChange={(e) => setEditCardBack(e.target.value)}
                  placeholder="Nhập định nghĩa..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn--cancel" onClick={() => setEditingCard(null)}>
                Hủy
              </button>
              <button className="modal-btn modal-btn--primary" onClick={handleUpdateCard} disabled={updatingCard}>
                <Save size={14} />
                {updatingCard ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
