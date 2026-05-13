import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiPlus,
  FiGlobe, FiLock, FiLayers, FiPlay,
  FiGrid, FiList, FiRefreshCw, FiBookOpen, FiCommand,
  FiTag,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

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


import { setService }       from '../../api/setService';
import { cardService }      from '../../api/cardService';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CardEditor       from '../../components/flashcard/CardEditor/CardEditor';
import BulkAddModal     from '../../components/flashcard/BulkAddModal/BulkAddModal';
import ImportModal      from '../../components/flashcard/ImportModal/ImportModal';
import FlashcardViewer  from '../../components/flashcard/FlashcardViewer/FlashcardViewer';
import SortableCardRow  from '../../components/flashcard/SortableCardRow/SortableCardRow';
import { LoadingSpinner } from '../../components/common';
import { ConfirmModal }   from '../../components/common/Modal/Modal';
import './SetDetail.css';

const VIEW   = { CARDS: 'cards', STUDY: 'study' };
const LAYOUT = { LIST: 'list', GRID: 'grid' };

export default function SetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [set, setSet]         = useState(null);
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [view, setView]       = useState(VIEW.CARDS);
  const [layout, setLayout]   = useState(LAYOUT.LIST);

  // Add card inline
  const [showAddCard, setShowAddCard] = useState(false);
  const [addingCard, setAddingCard]   = useState(false);

  // Edit card inline
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit]   = useState(false);

  // Bulk add
  const [showBulk, setShowBulk]     = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Delete set
  const [showDeleteSet, setShowDeleteSet] = useState(false);
  const [deletingSet, setDeletingSet]     = useState(false);

  // Delete card
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deletingCard, setDeletingCard] = useState(false);

  // Reorder save debounce
  const reorderTimerRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const fetchSet = useCallback(() => {
    setLoading(true);
    setService.getById(id)
      .then((res) => {
        const fetchedSet = res?.data ?? res;
        setSet(fetchedSet);
        // Default to study view if not owner
        const currentUserId = currentUser?._id || currentUser?.id;
        const setUserId = fetchedSet?.user?._id || fetchedSet?.user?.id || fetchedSet?.user;
        if (currentUserId && setUserId && currentUserId !== setUserId) {
          setView(VIEW.STUDY);
        }
      })
      .catch(() => setError('Could not load set.'))
      .finally(() => setLoading(false));
  }, [id, currentUser]);

  const fetchCards = useCallback(() => {
    setCardsLoading(true);
    cardService.getBySetId(id)
      .then((res) => {
        const data = res?.data ?? res;
        setCards(Array.isArray(data) ? data : []);
      })
      .catch(() => setCards([]))
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

  /* ── Tag click → Browse with filter ────────────────────────────────── */
  const handleTagClick = (tagName) => {
    navigate(`/flashcards/browse?tag=${encodeURIComponent(tagName)}`);
  };

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
  const shortcuts = useMemo(() => ({
    'ctrl+n': (e) => {
      if (view !== VIEW.CARDS || !isOwner) return;
      e.preventDefault();
      setShowAddCard(true);
      setEditingCard(null);
    },
    'escape': () => {
      setShowAddCard(false);
      setEditingCard(null);
    },
    'ctrl+enter': (e) => {
      // Handled inside CardEditor forms — no global action needed
    },
  }), [view]);

  useKeyboardShortcuts(shortcuts);

  /* ── Drag & Drop ─────────────────────────────────────────────────────── */
  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;

    setCards((prev) => {
      const oldIndex = prev.findIndex((c) => c._id === active.id);
      const newIndex = prev.findIndex((c) => c._id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      // Debounce reorder API call
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(async () => {
        try {
          await cardService.reorder(id, reordered.map((c) => c._id));
          toast.success('Order saved', { duration: 1500, icon: '↕️' });
        } catch {
          // Silently fail — order is already shown correctly in UI
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
    } catch {
      toast.error('Failed to add card.');
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
      toast.success('Card deleted.');
      setDeleteCardId(null);
    } catch {
      toast.error('Failed to delete card.');
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
      toast.success(`${createdArr.length} cards added!`);
      setShowBulk(false);
    } catch {
      toast.error('Bulk create failed.');
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
      toast.success(`${createdArr.length} cards imported!`);
    } catch {
      toast.error('Import failed. Please try again.');
    }
  };

  /* ── Delete Set ──────────────────────────────────────────────────────── */
  const handleDeleteSet = async () => {
    setDeletingSet(true);
    try {
      await setService.delete(id);
      toast.success('Set deleted.');
      navigate('/flashcards');
    } catch {
      toast.error('Failed to delete set.');
    } finally {
      setDeletingSet(false);
    }
  };

  /* ── Card IDs for DnD ────────────────────────────────────────────────── */
  const cardIds = useMemo(() => cards.map((c) => c._id), [cards]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="page-shell sd-loading-wrap">
      <LoadingSpinner text="Loading set..." />
    </div>
  );

  if (error || !set) return (
    <div className="page-shell sd-error-wrap">
      <p>{error ?? 'Set not found.'}</p>
      <button className="btn-glassline-primary" onClick={() => navigate('/flashcards')}>
        <FiArrowLeft size={14} /> Back
      </button>
    </div>
  );

  return (
    <div className="page-shell sd-page">
      <Container>

        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <button className="sd-back" onClick={() => navigate('/flashcards')}>
          <FiArrowLeft size={16} /> My Flashcard Sets
        </button>

        {/* ── Keyboard shortcut hints ───────────────────────────────── */}
        <div className="sd-shortcut-bar">
          {isOwner && <span className="sd-shortcut-item"><kbd>Ctrl</kbd>+<kbd>N</kbd> Add card</span>}
          <span className="sd-shortcut-item"><kbd>Esc</kbd> Cancel</span>
          {isOwner && (
            <span className="sd-shortcut-item sd-shortcut-item--drag">
              <FiCommand size={11} /> Drag rows to reorder
            </span>
          )}
        </div>

        {/* ── Set Header ──────────────────────────────────────────────── */}
        <div className="sd-header surface-card">
          <div className="sd-header-main">
            <div className="sd-header-info">
              <div className="sd-header-title-row">
                <h1 className="sd-title">{set.title}</h1>
                <span className={`sd-visibility ${set.isPublic ? 'public' : 'private'}`}>
                  {set.isPublic ? <FiGlobe size={12} /> : <FiLock size={12} />}
                  {set.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              {set.description && <p className="sd-desc">{set.description}</p>}
              {set.tagObjects?.length > 0 && (
                <div className="sd-tags">
                  {set.tagObjects.map((tag) => (
                    <button
                      key={tag._id}
                      className="sd-tag sd-tag--clickable"
                      onClick={() => handleTagClick(tag.name)}
                      title={`Browse sets with tag "${tag.name}"`}
                    >
                      <FiTag size={11} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="sd-meta">
                <span className="sd-meta-item">
                  <FiLayers size={14} />
                  <strong>{set.cardCount ?? cards.length}</strong> cards
                </span>
                {set.language && (
                  <span className="sd-meta-item sd-meta-lang">{set.language}</span>
                )}
              </div>
            </div>

            <div className="sd-header-actions">
              <button
                className={`sd-btn ${view === VIEW.STUDY ? 'sd-btn--primary' : 'sd-btn--outline'}`}
                onClick={() => setView(view === VIEW.STUDY ? VIEW.CARDS : VIEW.STUDY)}
                id="sd-study-btn"
                disabled={cards.length === 0}
              >
                <FiPlay size={15} />
                {view === VIEW.STUDY ? 'Back to Cards' : 'Study'}
              </button>
              {isOwner && (
                <>
                  <button
                    className="sd-btn sd-btn--outline"
                    onClick={() => navigate(`/flashcards/sets/${id}/edit`)}
                    id="sd-edit-btn"
                  >
                    <FiEdit2 size={15} /> Edit Set
                  </button>
                  <button
                    className="sd-btn sd-btn--danger-icon"
                    onClick={() => setShowDeleteSet(true)}
                    id="sd-delete-btn"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Study Mode ──────────────────────────────────────────────── */}
        {view === VIEW.STUDY && (
          <div className="sd-study-section">
            <FlashcardViewer cards={cards} />
          </div>
        )}

        {/* ── Cards Section ───────────────────────────────────────────── */}
        {view === VIEW.CARDS && (
          <div className="sd-cards-section">
            <div className="sd-cards-header">
              <h2>
                <FiBookOpen size={17} />
                Cards
                <span className="sd-cards-count">{cards.length}</span>
              </h2>
              <div className="sd-cards-header-right">
                <div className="sd-layout-toggle">
                  <button
                    className={`sd-layout-btn ${layout === LAYOUT.LIST ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.LIST)}
                    title="List view"
                  >
                    <FiList size={15} />
                  </button>
                  <button
                    className={`sd-layout-btn ${layout === LAYOUT.GRID ? 'active' : ''}`}
                    onClick={() => setLayout(LAYOUT.GRID)}
                    title="Grid view"
                  >
                    <FiGrid size={15} />
                  </button>
                </div>
                {isOwner && (
                  <>
                    <button
                      className="sd-btn sd-btn--bulk"
                      onClick={() => setShowBulk(true)}
                      id="sd-bulk-add-btn"
                    >
                      <FiRefreshCw size={14} /> Bulk Add
                    </button>
                    <button
                      className="sd-btn sd-btn--outline"
                      onClick={() => setShowImport(true)}
                      id="sd-import-btn"
                    >
                      <FiCommand size={14} /> Import CSV
                    </button>
                    <button
                      className="sd-btn sd-btn--primary"
                      onClick={() => { setShowAddCard(true); setEditingCard(null); }}
                      id="sd-add-card-btn"
                      title="Add card (Ctrl+N)"
                    >
                      <FiPlus size={14} /> Add Card
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Inline Add Card form */}
            {isOwner && showAddCard && (
              <div className="sd-add-card-form">
                <CardEditor
                  onSave={handleAddCard}
                  onCancel={() => setShowAddCard(false)}
                  loading={addingCard}
                />
              </div>
            )}

            {/* Loading / Empty */}
            {cardsLoading ? (
              <div className="sd-cards-loading">
                <LoadingSpinner text="Loading cards..." />
              </div>
            ) : cards.length === 0 ? (
              <div className="sd-cards-empty">
                <div className="sd-cards-empty-icon">🃏</div>
                {isOwner ? (
                  <>
                    <p>No cards yet. Press <kbd>Ctrl+N</kbd> or click Add Card.</p>
                    <button
                      className="btn-glassline-primary"
                      onClick={() => setShowAddCard(true)}
                    >
                      <FiPlus size={14} /> Add Card
                    </button>
                  </>
                ) : (
                  <p>This set has no cards yet.</p>
                )}
              </div>
            ) : layout === LAYOUT.LIST ? (

              /* ── LIST VIEW with Drag & Drop ── */
              isOwner ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    <div className="sd-cards-list">
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
                              onEdit={() => { setEditingCard(card); setShowAddCard(false); }}
                              onDelete={() => setDeleteCardId(card._id)}
                              readonly={!isOwner}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="sd-cards-list">
                  {cards.map((card, idx) => (
                    <div key={card._id}>
                      <SortableCardRow
                        card={card}
                        index={idx + 1}
                        readonly={true}
                      />
                    </div>
                  ))}
                </div>
              )

            ) : (

              /* ── GRID VIEW ── */
              <div className="sd-cards-grid">
                {cards.map((card, idx) => (
                  <div key={card._id} className="sd-grid-card surface-card">
                    <div className="sd-grid-card-front">
                      <span className="sd-card-field-label">TERM</span>
                      <p className="sd-grid-word">{card.front}</p>
                      {card.pronunciation && (
                        <span className="sd-card-pronunciation">{card.pronunciation}</span>
                      )}
                    </div>
                    <div className="sd-grid-card-divider" />
                    <div className="sd-grid-card-back">
                      <span className="sd-card-field-label">DEFINITION</span>
                      <p className="sd-grid-def">{card.back}</p>
                    </div>
                    <div className="sd-grid-card-footer">
                      <span className="sd-grid-num">{idx + 1}</span>
                      {isOwner && (
                        <div className="sd-card-actions sd-card-actions--always">
                          <button
                            className="sd-card-btn sd-card-btn--edit"
                            onClick={() => { setEditingCard(card); setLayout(LAYOUT.LIST); setShowAddCard(false); }}
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            className="sd-card-btn sd-card-btn--delete"
                            onClick={() => setDeleteCardId(card._id)}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
        title="Delete Set"
        message="Delete this set? All cards will be removed. This cannot be undone."
        confirmText="Delete Forever"
        confirmVariant="danger"
        loading={deletingSet}
      />
      <ConfirmModal
        show={!!deleteCardId}
        onHide={() => setDeleteCardId(null)}
        onConfirm={handleDeleteCard}
        title="Delete Card"
        message="Delete this card?"
        confirmText="Delete"
        confirmVariant="danger"
        loading={deletingCard}
      />
    </div>
  );
}
