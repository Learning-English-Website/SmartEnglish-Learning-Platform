import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiSave, FiArrowLeft,
  FiGlobe, FiLock, FiInfo, FiTrash2,
  FiUpload, FiFolder,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { folderService } from '../../api/folderService';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CardEditor from '../../components/flashcard/CardEditor/CardEditor';
import TagPicker from '../../components/common/TagPicker/TagPicker';
import ImportModal from '../../components/flashcard/ImportModal/ImportModal';
import PremiumLimitModal from '../../components/common/PremiumLimitModal/PremiumLimitModal';
import './CreateSet.css';

const DRAFT_KEY = 'create-set-draft';

let cardIdCounter = 1;

function makeCard() {
  return {
    id:            cardIdCounter++,
    front:         '',
    back:          '',
    pronunciation: '',
    example:       '',
    note:          '',
    imageUrl:      '',
  };
}

export default function CreateSet() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic]     = useState(false);
  const [tags, setTags]             = useState([]);
  const [cards, setCards]           = useState([makeCard(), makeCard(), makeCard()]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [folders, setFolders] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumReason, setPremiumReason] = useState('');

  const lastCardRef = useRef(null);

  // Fetch folders for folder selector
  useEffect(() => {
    folderService.getAll()
      .then((res) => {
        const foldersData = Array.isArray(res) ? res : (res?.data ?? []);
        setFolders(foldersData);

        // Pre-fill from query params
        const preFolderId = searchParams.get('folderId');
        if (preFolderId) setSelectedFolder(preFolderId);

        const preTagId = searchParams.get('tagId');
        if (preTagId) setTags([preTagId]);
      })
      .catch(() => setFolders([]));
  }, [searchParams]);

  // Handle import
  const handleImport = (importedCards) => {
    const newCards = importedCards.map((c) => ({
      id: cardIdCounter++,
      front: c.front || '',
      back: c.back || '',
      pronunciation: c.pronunciation || '',
      example: c.example || '',
      note: c.note || '',
      imageUrl: '',
    }));
    setCards((prev) => [...prev, ...newCards]);
    setShowImport(false);
    toast.success(`Added ${importedCards.length} cards from file!`);
  };

  /* ── Auto-save ─────────────────────────────────────────────────────── */
  const draftData = useMemo(() => ({ title, description, isPublic, cards }), [
    title, description, isPublic, cards,
  ]);

  const isEmpty = useCallback(
    (d) => !d.title.trim() && d.cards.every((c) => !c.front && !c.back),
    [],
  );

  const { clearDraft, getDraft } = useAutoSave(DRAFT_KEY, draftData, 1500, isEmpty);

  // Show saved indicator
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.key === DRAFT_KEY) setSavedAt(new Date());
    };
    window.addEventListener('autosave', handler);
    return () => window.removeEventListener('autosave', handler);
  }, []);

  // On mount: check for draft
  useEffect(() => {
    const draft = getDraft();
    if (draft && (draft.title.trim() || draft.cards.some((c) => c.front || c.back))) {
      setShowDraftBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreDraft = () => {
    const draft = getDraft();
    if (!draft) return;
    setTitle(draft.title ?? '');
    setDescription(draft.description ?? '');
    setIsPublic(draft.isPublic ?? false);
    setCards(draft.cards?.length ? draft.cards : [makeCard(), makeCard(), makeCard()]);
    setShowDraftBanner(false);
    toast.success('Draft restored!');
  };

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  const shortcuts = useMemo(() => ({
    'ctrl+n':     (e) => { e.preventDefault(); addCard(); },
    'ctrl+enter': (e) => { e.preventDefault(); handleCreate(); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useKeyboardShortcuts(shortcuts);

  /* ── Card mutations ─────────────────────────────────────────────────── */
  const addCard = useCallback(() => {
    const newCard = makeCard();
    setCards((prev) => [...prev, newCard]);
    setTimeout(() => {
      lastCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, []);

  /**
   * Called by CardEditor when user hits "Add Card" / "Save Changes".
   * For create flow we just update the local array.
   */
  const handleCardSave = useCallback((cardId, data) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, ...data } : c)),
    );
  }, []);

  const deleteCard = (id) => {
    if (cards.length <= 1) {
      toast.error('Cần ít nhất 1 thẻ.');
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!title.trim()) {
      setTitleError('Vui lòng nhập tiêu đề cho set.');
      document.getElementById('cs-title-input')?.focus();
      return;
    }
    if (title.trim().length < 3) {
      setTitleError('Tiêu đề phải có ít nhất 3 ký tự.');
      return;
    }
    setTitleError('');

    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        isPublic,
        tags,
      };
      const res     = await setService.create(payload);
      const created = res?.data ?? res;
      const newId   = created?._id ?? created?.id;

      // Add set to selected folder
      if (selectedFolder && newId) {
        try {
          await folderService.addSet(selectedFolder, newId);
        } catch {
          console.error('Failed to add set to folder');
        }
      }

      if (validCards.length > 0 && newId) {
        try {
          const { cardService } = await import('../../api/cardService');
          await cardService.bulkCreate(
            newId,
            validCards.map((c) => ({
              front:         c.front.trim(),
              back:          c.back.trim(),
              pronunciation: c.pronunciation?.trim() || null,
              example:       c.example?.trim()       || null,
              note:          c.note?.trim()           || null,
              imageUrl:      c.imageUrl              || null,
            })),
          );
        } catch {
          toast.error('Set đã tạo nhưng có lỗi khi thêm cards. Bạn có thể thêm thủ công.');
        }
      }

      toast.success('Tạo set thành công! 🎉');
      clearDraft();
      navigate(newId ? `/flashcards/sets/${newId}` : '/flashcards');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Tạo bộ thẻ thất bại. Vui lòng thử lại.';
      if (msg.includes('Premium') || msg.includes('miễn phí')) {
        setPremiumReason(msg);
        setShowPremiumModal(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="cs-page">
        {/* Draft restore banner */}
        {showDraftBanner && (
          <div className="cs-draft-banner">
            <FiInfo size={14} />
            <span>You have an unsaved draft.</span>
            <button className="cs-draft-btn" onClick={restoreDraft}>Restore</button>
            <button className="cs-draft-dismiss" onClick={() => { setShowDraftBanner(false); clearDraft(); }}>✕</button>
          </div>
        )}

        {/* Top Bar */}
        <div className="cs-topbar">
          <div className="cs-topbar-left">
            <button className="cs-back-btn" onClick={() => navigate('/flashcards')}>
              <FiArrowLeft size={18} />
            </button>
            <h1 className="cs-topbar-title">Create a new flashcard set</h1>
            <div className="cs-shortcut-hints">
              <span><kbd>Ctrl+N</kbd> Add card</span>
              <span><kbd>Ctrl+Enter</kbd> Create</span>
            </div>
          </div>
          <div className="cs-topbar-right">
            <button
              className="cs-btn cs-btn--outline"
              onClick={handleCreate}
              disabled={submitting}
              id="cs-create-btn"
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Create'}
            </button>
            <button
              className="cs-btn cs-btn--primary"
              onClick={handleCreate}
              disabled={submitting}
              id="cs-create-practice-btn"
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Create and practice'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cs-body">

          {titleError && <p className="cs-title-error">{titleError}</p>}

          {/* Visibility + saved indicator */}
          <div className="cs-meta-row">
            <button
              className={`cs-visibility-btn ${isPublic ? 'public' : 'private'}`}
              onClick={() => setIsPublic((v) => !v)}
              type="button"
            >
              {isPublic ? <FiGlobe size={13} /> : <FiLock size={13} />}
              {isPublic ? 'Public' : 'Private'}
            </button>
            {savedAt ? (
              <span className="cs-saved-label cs-saved-label--active">
                ✓ Draft saved {savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="cs-saved-label">Auto-save enabled</span>
            )}
          </div>

          {/* Title input */}
          <input
            id="cs-title-input"
            className={`cs-title-input ${titleError ? 'cs-title-input--error' : ''}`}
            type="text"
            placeholder="Please enter a title to create your set."
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
            autoFocus
          />

          {/* Description input */}
          <input
            className="cs-desc-input"
            type="text"
            placeholder="Add a description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Options row */}
          <div className="cs-options-row">
            <div className="cs-options-left">
              <select
                className="cs-folder-select"
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value || null)}
                aria-label="Folder"
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="cs-options-right">
              <label className="cs-tags-label">Tags</label>
              <TagPicker
                selectedTags={tags}
                onChange={setTags}
                placeholder="Add tags..."
                folderId={searchParams.get('folderId')}
              />
            </div>
          </div>

          {/* ── Card List using CardEditor ──────────────────────────────── */}
          <div className="cs-cards-list">
            {cards.map((card, idx) => {
              const isLast = idx === cards.length - 1;
              return (
                <div
                  key={card.id}
                  className="cs-card-editor-wrap"
                  ref={isLast ? lastCardRef : null}
                >
                  {/* Card index + delete */}
                  <div className="cs-card-editor-header">
                    <span className="cs-card-index">{idx + 1}</span>
                    <button
                      className="cs-card-icon-btn cs-card-icon-btn--delete"
                      onClick={() => deleteCard(card.id)}
                      title="Delete card"
                      aria-label="Delete card"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>

                  {/* Reuse CardEditor with inline-mode: no cancel, save = update local state */}
                  <CardEditor
                    card={card}
                    onSave={(data) => handleCardSave(card.id, data)}
                    onCancel={() => {}}
                    loading={false}
                    inlineMode
                  />
                </div>
              );
            })}
          </div>

          {/* Add card buttons row */}
          <div className="cs-add-card-row">
            <button className="cs-add-card-btn" onClick={addCard} id="cs-add-card-btn">
              <span className="cs-add-card-plus"><FiPlus size={20} /></span>
              <span>ADD CARD</span>
            </button>
            <button className="cs-add-card-btn cs-import-btn" onClick={() => setShowImport(true)} id="cs-import-btn">
              <span className="cs-add-card-plus"><FiUpload size={20} /></span>
              <span>IMPORT FROM FILE</span>
            </button>
          </div>

          {/* Footer create button */}
          <div className="cs-footer">
            <button
              className="cs-btn cs-btn--primary cs-btn--lg"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <><FiSave size={16} /> Create Set</>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        show={showImport}
        onHide={() => setShowImport(false)}
        onImport={handleImport}
      />

      {/* Premium Limit Modal */}
      <PremiumLimitModal
        show={showPremiumModal}
        onHide={() => setShowPremiumModal(false)}
        reason={premiumReason}
      />
    </>
  );
}
