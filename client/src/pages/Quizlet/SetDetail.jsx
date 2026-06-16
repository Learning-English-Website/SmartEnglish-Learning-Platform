import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiPlus,
  FiGlobe, FiLock, FiPlay, FiRefreshCw,
  FiTag, FiShare2, FiBookmark, FiMoreHorizontal,
  FiHeart, FiVolume2, FiMaximize, FiShuffle,
  FiChevronLeft, FiChevronRight, FiList,
  FiClock, FiUser, FiBookOpen, FiZap,
  FiGrid, FiLayers, FiTarget, FiCopy, FiUsers,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';

// DnD-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import { noteService } from '../../api/noteService';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { progressService } from '../../services/progressService';
import CardEditor from '../../components/flashcard/CardEditor/CardEditor';
import BulkAddModal from '../../components/flashcard/BulkAddModal/BulkAddModal';
import ImportModal from '../../components/flashcard/ImportModal/ImportModal';
import SortableCardRow from '../../components/flashcard/SortableCardRow/SortableCardRow';
import NoteCard from '../../components/common/NoteCard/NoteCard';
import { LoadingSpinner } from '../../components/common';
import { ConfirmModal } from '../../components/common/Modal/Modal';
import ShareModal from '../../components/common/ShareModal/ShareModal';
import Leaderboard from '../../components/gamification/Leaderboard/Leaderboard';
import PremiumLimitModal from '../../components/common/PremiumLimitModal/PremiumLimitModal';
import './SetDetail.css';

const LAYOUT = { LIST: 'list', GRID: 'grid' };

export default function SetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [layout, setLayout] = useState(LAYOUT.LIST);

  // Add card inline
  const [showAddCard, setShowAddCard] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  // Edit card inline
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk add
  const [showBulk, setShowBulk] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Delete set
  const [showDeleteSet, setShowDeleteSet] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);

  // Delete card
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deletingCard, setDeletingCard] = useState(false);

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumReason, setPremiumReason] = useState('');

  // Notes tab
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');

  // Reorder save debounce
  const reorderTimerRef = useRef(null);

  // DnD kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* ── Auth check ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/flashcards/sets/${id}`, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, id]);

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const fetchSet = useCallback(() => {
    setLoading(true);
    setService.getById(id)
      .then((res) => {
        const fetchedSet = res?.data ?? res;
        setSet(fetchedSet);
      })
      .catch(() => setError('Could not load set.'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchCards = useCallback(() => {
    setCardsLoading(true);
    Promise.all([
      cardService.getBySetId(id),
      progressService.getCardSchedules(id).catch(() => ({ data: [] }))
    ])
      .then(([cardsRes, schedRes]) => {
        const cardsData = cardsRes?.data ?? cardsRes;
        const schedData = schedRes?.data ?? schedRes;
        setCards(Array.isArray(cardsData) ? cardsData : []);
        setSchedules(Array.isArray(schedData) ? schedData : []);
      })
      .catch(() => {
        setCards([]);
        setSchedules([]);
      })
      .finally(() => setCardsLoading(false));
  }, [id]);

  useEffect(() => { fetchSet(); fetchCards(); }, [fetchSet, fetchCards]);

  /* ── Ownership Check ─────────────────────────────────────────────────── */
  const isOwner = useMemo(() => {
    if (!set || !currentUser) return false;
    const setUserId = set.user?._id || set.user?.id || set.user;
    const currentUserId = currentUser?._id || currentUser?.id;
    return String(setUserId) === String(currentUserId);
  }, [set, currentUser]);

  /* ── Tag click ─────────────────────────────────────────────────────── */
  const handleTagClick = (tagName) => {
    navigate(`/flashcards/browse?tag=${encodeURIComponent(tagName)}`);
  };

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
  const shortcuts = useMemo(() => ({
    'ctrl+n': (e) => {
      if (!isOwner) return;
      e.preventDefault();
      setShowAddCard(true);
      setEditingCard(null);
    },
    'escape': () => {
      setShowAddCard(false);
      setEditingCard(null);
    },
  }), [isOwner]);

  useKeyboardShortcuts(shortcuts);

  /* ── Drag & Drop ─────────────────────────────────────────────────────── */
  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;

    setCards((prev) => {
      const oldIndex = prev.findIndex((c) => c._id === active.id);
      const newIndex = prev.findIndex((c) => c._id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(async () => {
        try {
          await cardService.reorder(id, reordered.map((c) => c._id));
          toast.success('Order saved', { duration: 1500, icon: '↕️' });
        } catch {
          // Silently fail
        }
      }, 800);

      return reordered;
    });
  }, [id]);

  /* ── Add Card ────────────────────────────────────────────────────────── */
  const handleAddCard = async (data) => {
    setAddingCard(true);
    try {
      const res = await cardService.create(id, data);
      const newCard = res?.data ?? res;
      setCards((prev) => [...prev, newCard]);
      setSet((prev) => prev ? { ...prev, cardCount: (prev.cardCount ?? 0) + 1 } : prev);
      toast.success('Card added!');
      setShowAddCard(false);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to add card.';
      if (msg.includes('Premium') || msg.includes('miễn phí')) {
        setPremiumReason(msg);
        setShowPremiumModal(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setAddingCard(false);
    }
  };

  /* ── Edit Card ───────────────────────────────────────────────────────── */
  const handleSaveEdit = async (data) => {
    setSavingEdit(true);
    try {
      const res = await cardService.update(editingCard._id, data);
      const updated = res?.data ?? res;
      setCards((prev) => prev.map((c) => c._id === updated._id ? updated : c));
      toast.success('Card updated!');
      setEditingCard(null);
    } catch {
      toast.error('Failed to update card.');
    } finally {
      setSavingEdit(false);
    }
  };

  /* ── Delete Card ─────────────────────────────────────────────────────── */
  const handleDeleteCard = async () => {
    setDeletingCard(true);
    try {
      await cardService.delete(deleteCardId);
      setCards((prev) => prev.filter((c) => c._id !== deleteCardId));
      setSet((prev) => prev ? { ...prev, cardCount: Math.max(0, (prev.cardCount ?? 1) - 1) } : prev);
      toast.success('Đã xóa thẻ thành công.');
      setDeleteCardId(null);
    } catch {
      toast.error('Xóa thẻ thất bại.');
    } finally {
      setDeletingCard(false);
    }
  };

  /* ── Bulk Add ────────────────────────────────────────────────────────── */
  const handleBulkAdd = async (newCards) => {
    setBulkLoading(true);
    try {
      const res = await cardService.bulkCreate(id, newCards);
      const created = res?.data ?? res;
      const createdArr = Array.isArray(created) ? created : [];
      setCards((prev) => [...prev, ...createdArr]);
      setSet((prev) => prev ? { ...prev, cardCount: (prev.cardCount ?? 0) + createdArr.length } : prev);
      toast.success(`Đã thêm ${createdArr.length} thẻ thành công!`);
      setShowBulk(false);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Bulk create failed.';
      if (msg.includes('Premium') || msg.includes('miễn phí')) {
        setPremiumReason(msg);
        setShowPremiumModal(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── Import Cards ───────────────────────────────────────────────────── */
  const handleImport = async (cardsToImport) => {
    try {
      const res = await cardService.bulkCreate(id, cardsToImport);
      const created = res?.data ?? res;
      const createdArr = Array.isArray(created) ? created : [];
      setCards((prev) => [...prev, ...createdArr]);
      setSet((prev) => prev ? { ...prev, cardCount: (prev.cardCount ?? 0) + createdArr.length } : prev);
      toast.success(`Đã nhập ${createdArr.length} thẻ thành công!`);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Import failed. Please try again.';
      if (msg.includes('Premium') || msg.includes('miễn phí')) {
        setPremiumReason(msg);
        setShowPremiumModal(true);
      } else {
        toast.error(msg);
      }
    }
  };

  /* ── Delete Set ──────────────────────────────────────────────────────── */
  const handleDeleteSet = async () => {
    setDeletingSet(true);
    try {
      await setService.delete(id);
      toast.success('Xóa học phần thành công.');
      navigate('/flashcards');
    } catch {
      toast.error('Xóa học phần thất bại.');
    } finally {
      setDeletingSet(false);
    }
  };

  /* ── Notes ──────────────────────────────────────────────────────────── */
  const fetchNotes = useCallback(async (cardId) => {
    setNotesLoading(true);
    try {
      const res = await noteService.getByCardId(cardId);
      setNotes(res?.data ?? res);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  const handleSelectCardForNotes = useCallback((cardId) => {
    setSelectedCardId(cardId);
    fetchNotes(cardId);
  }, [fetchNotes]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedCardId) return;
    setAddingNote(true);
    try {
      const res = await noteService.create(selectedCardId, newNoteContent.trim());
      const newNote = res?.data ?? res;
      setNotes((prev) => [newNote, ...prev]);
      setNewNoteContent('');
      toast.success('Note added!');
    } catch {
      toast.error('Failed to add note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateNote = async (noteId, data) => {
    try {
      const res = await noteService.update(noteId, data);
      const updated = res?.data ?? res;
      setNotes((prev) => prev.map((n) => n._id === updated._id ? updated : n));
      toast.success('Note updated!');
    } catch {
      toast.error('Failed to update note.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await noteService.delete(noteId);
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
      toast.success('Đã xóa ghi chú thành công.');
    } catch {
      toast.error('Xóa ghi chú thất bại.');
    }
  };

  /* ── Card IDs for DnD ────────────────────────────────────────────────── */
  const cardIds = useMemo(() => cards.map((c) => c._id), [cards]);

  /* ── Learning Groups ─────────────────────────────────────────────────── */
  const learningGroups = useMemo(() => {
    const learning = [];
    const mastered = [];
    for (const card of cards) {
      const prog = schedules.find(s => String(s.cardId || s.card) === String(card._id));
      if (prog && prog.correctReviews > 0) {
        mastered.push(card);
      } else {
        learning.push(card);
      }
    }
    return { learning, mastered };
  }, [cards, schedules]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (authLoading || loading) return (
    <div className="sd-modern-loading">
      <LoadingSpinner text="Loading set..." />
    </div>
  );

  if (error || !set) return (
    <div className="sd-modern-loading">
      <p>{error ?? 'Set not found.'}</p>
      <button className="sd-btn-back" onClick={() => navigate('/flashcards')}>
        <FiArrowLeft size={16} /> Back
      </button>
    </div>
  );

  return (
    <div className="sd-modern-page">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="sd-modern-header">
        <Container>
          <div className="sd-header-content">
            <div className="sd-header-left">
              <button className="sd-back-btn" onClick={() => navigate('/flashcards')}>
                <FiArrowLeft size={18} />
              </button>
              <div className="sd-title-section">
                <h1 className="sd-set-title">{set.title}</h1>
                <div className="sd-set-meta">
                  <span className="sd-meta-item">
                    <FiLayers size={14} />
                    {cards.length} thuật ngữ
                  </span>
                  {set.language && (
                    <span className="sd-meta-item sd-meta-lang">{set.language}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="sd-header-actions">
              <button className="sd-action-btn sd-action-btn--ghost" onClick={() => setShowShare(true)}>
                <FiShare2 size={16} />
                Chia sẻ
              </button>
              <button className="sd-action-btn sd-action-btn--ghost">
                <FiBookmark size={16} />
                Lưu
              </button>
              {isOwner && (
                <>
                  <button className="sd-action-btn sd-action-btn--ghost" onClick={() => navigate(`/flashcards/sets/${id}/edit`)}>
                    <FiEdit2 size={16} />
                    Chỉnh sửa
                  </button>
                  <button className="sd-action-btn sd-action-btn--icon" onClick={() => setShowDeleteSet(true)}>
                    <FiTrash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <Container>
        <div className="sd-modern-content">
          
          {/* ── Mode Cards Grid ───────────────────────────────────────── */}
          <div className="sd-modes-section">
            <div className="sd-modes-grid">
              <button className="sd-mode-card" onClick={() => navigate(`/flashcards/sets/${id}/flashcards`, { state: { returnTo: location.pathname } })}>
                <div className="sd-mode-icon sd-mode-icon--blue">
                  <FiBookOpen size={24} />
                </div>
                <span className="sd-mode-label">Thẻ ghi nhớ</span>
              </button>
              <button className="sd-mode-card" onClick={() => navigate(`/flashcards/sets/${id}/learn`, { state: { returnTo: location.pathname } })}>
                <div className="sd-mode-icon sd-mode-icon--purple">
                  <FiZap size={24} />
                </div>
                <span className="sd-mode-label">Học</span>
              </button>
              <button className="sd-mode-card" onClick={() => navigate(`/flashcards/sets/${id}/test`, { state: { returnTo: location.pathname } })}>
                <div className="sd-mode-icon sd-mode-icon--green">
                  <FiTarget size={24} />
                </div>
                <span className="sd-mode-label">Kiểm tra</span>
              </button>
              <button className="sd-mode-card" onClick={() => navigate(`/flashcards/sets/${id}/match`, { state: { returnTo: location.pathname } })}>
                <div className="sd-mode-icon sd-mode-icon--orange">
                  <FiGrid size={24} />
                </div>
                <span className="sd-mode-label">Khớp thẻ</span>
              </button>
            </div>
          </div>

          {/* ── Match Leaderboard ──────────────────────────────────────────── */}
          <div className="sd-leaderboard-section">
            <Leaderboard setId={id} />
          </div>

          {/* ── Author Section ─────────────────────────────────────────── */}
          <div className="sd-author-section">
            <div className="sd-author-card">
              <div className="sd-author-avatar">
                {set.user?.avatar ? (
                  <img src={set.user.avatar} alt={set.user?.username} className="sd-author-img" />
                ) : (
                  <span>{set.user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="sd-author-info">
                <span className="sd-author-name">{set.user?.username || 'Unknown'}</span>
                <span className="sd-author-time">
                  <FiClock size={12} />
                  {set.createdAt ? new Date(set.createdAt).toLocaleDateString('vi-VN', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  }) : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ── Terms Section ──────────────────────────────────────────── */}
          <div className="sd-terms-section">
            <div className="sd-terms-header">
              <h2 className="sd-terms-title">
                Thuật ngữ trong học phần này ({cards.length})
              </h2>
              <div className="sd-terms-actions">
                {isOwner && (
                  <>
                    <button className="sd-term-action-btn" onClick={() => setShowBulk(true)}>
                      <FiPlus size={14} />
                      Thêm
                    </button>
                    <button className="sd-term-action-btn" onClick={() => setShowImport(true)}>
                      <FiRefreshCw size={14} />
                      Nhập
                    </button>
                  </>
                )}
                <div className="sd-view-toggle">
                  <button 
                    className={`sd-view-btn ${layout === LAYOUT.LIST ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.LIST)}
                  >
                    <FiList size={16} />
                  </button>
                  <button 
                    className={`sd-view-btn ${layout === LAYOUT.GRID ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.GRID)}
                  >
                    <FiGrid size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Learning Groups */}
            {cards.length > 0 && (
              <div className="sd-learning-groups">
                <div className="sd-learning-group">
                  <div className="sd-group-header">
                    <span className="sd-group-dot sd-group-dot--orange"></span>
                    <span className="sd-group-title">Đang học</span>
                    <span className="sd-group-count">{learningGroups.learning.length}</span>
                  </div>
                </div>
                <div className="sd-learning-group">
                  <div className="sd-group-header">
                    <span className="sd-group-dot sd-group-dot--green"></span>
                    <span className="sd-group-title">Thành thạo</span>
                    <span className="sd-group-count">{learningGroups.mastered.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Add Card Form */}
            {isOwner && showAddCard && (
              <div className="sd-add-card-form">
                <CardEditor
                  onSave={handleAddCard}
                  onCancel={() => setShowAddCard(false)}
                  loading={addingCard}
                />
              </div>
            )}

            {/* Cards List */}
            {cardsLoading ? (
              <div className="sd-cards-loading">
                <LoadingSpinner text="Loading cards..." />
              </div>
            ) : cards.length === 0 ? (
              <div className="sd-cards-empty">
                <div className="sd-empty-icon">📚</div>
                <p>Chưa có thuật ngữ nào</p>
                {isOwner && (
                  <button className="sd-add-term-btn" onClick={() => setShowAddCard(true)}>
                    <FiPlus size={16} />
                    Thêm thuật ngữ đầu tiên
                  </button>
                )}
              </div>
            ) : layout === LAYOUT.LIST ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={cards.map((c) => c._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="sd-cards-list-modern">
                    {cards.map((card, idx) => (
                      <div key={card._id}>
                        {editingCard?._id === card._id ? (
                          <div className="sd-inline-edit">
                            <CardEditor
                              card={card}
                              onSave={handleSaveEdit}
                              onCancel={() => setEditingCard(null)}
                              loading={savingEdit}
                            />
                          </div>
                        ) : (
                          <SortableCardRow
                            card={card}
                            index={idx + 1}
                            readonly={!isOwner}
                            onEdit={() => { setEditingCard(card); setShowAddCard(false); }}
                            onDelete={() => setDeleteCardId(card._id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="sd-cards-grid-modern">
                {cards.map((card) => (
                  <div key={card._id} className="sd-grid-card-modern">
                    <div className="sd-grid-card-front">
                      <p className="sd-grid-word">{card.front}</p>
                      {card.pronunciation && (
                        <span className="sd-grid-pronunciation">{card.pronunciation}</span>
                      )}
                    </div>
                    <div className="sd-grid-card-divider"></div>
                    <div className="sd-grid-card-back">
                      <p className="sd-grid-def">{card.back}</p>
                    </div>
                    {isOwner && (
                      <div className="sd-grid-card-actions">
                        <button 
                          className="sd-term-btn"
                          onClick={() => { setEditingCard(card); setLayout(LAYOUT.LIST); }}
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button 
                          className="sd-term-btn"
                          onClick={() => setDeleteCardId(card._id)}
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Terms Button */}
            {isOwner && !showAddCard && (
              <button className="sd-add-terms-pill" onClick={() => setShowAddCard(true)}>
                <FiPlus size={16} />
                Thêm hoặc xóa thuật ngữ
              </button>
            )}
          </div>
        </div>
      </Container>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <BulkAddModal
        show={showBulk}
        onHide={() => setShowBulk(false)}
        onConfirm={handleBulkAdd}
        loading={bulkLoading}
      />
      <ImportModal
        show={showImport}
        onHide={() => setShowImport(false)}
        onImport={handleImport}
      />
      <ConfirmModal
        show={showDeleteSet}
        onHide={() => setShowDeleteSet(false)}
        onConfirm={handleDeleteSet}
        title="Xóa học phần"
        message={`Bạn có chắc muốn xóa "${set?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deletingSet}
      />
      <ConfirmModal
        show={!!deleteCardId}
        onHide={() => setDeleteCardId(null)}
        onConfirm={handleDeleteCard}
        title="Xóa thẻ"
        message="Bạn có chắc muốn xóa thẻ này?"
        confirmText="Xóa"
        confirmVariant="danger"
        loading={deletingCard}
      />
      <ShareModal
        show={showShare}
        setId={id}
        setTitle={set?.title}
        isPublic={set?.isPublic}
        onHide={() => setShowShare(false)}
        onPublicChanged={() => {}}
      />

      {/* Premium Limit Modal */}
      <PremiumLimitModal
        show={showPremiumModal}
        onHide={() => setShowPremiumModal(false)}
        reason={premiumReason}
      />
    </div>
  );
}
