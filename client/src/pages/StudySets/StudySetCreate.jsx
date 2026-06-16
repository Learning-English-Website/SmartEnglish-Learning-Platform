import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Globe, Lock, Plus, Upload,
  Shuffle, Search, Keyboard, Trash2, Wand2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import CardEditor from '../../components/flashcard/CardEditor/CardEditor';
import './StudySetCreate.css';

let cardIdCounter = Date.now();

function makeCard() {
  return {
    id:            cardIdCounter++,
    front:         '',
    back:          '',
    pronunciation: '',
    example:       '',
    note:          '',
    collocation:   '',
    relatedWords:  '',
    imageUrl:      '',
  };
}

const DRAFT_KEY = 'study-sets-draft';

export default function StudySetCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState([makeCard(), makeCard()]);
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const autoSaveTimer = useRef(null);
  const lastCardRef = useRef(null);

  /* ── Auto-save (debounce 1.5s) ──────────────────────────────────────── */
  const saveDraft = useCallback(() => {
    const data = { title, description, isPublic, cards };
    const isEmpty = !title.trim() && cards.every((c) => !c.front && !c.back);
    if (isEmpty) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    setSavedAt(new Date());
  }, [title, description, isPublic, cards]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(saveDraft, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [saveDraft]);

  /* ── Restore draft ────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title || (draft.cards && draft.cards.some((c) => c.front || c.back))) {
          setTitle(draft.title ?? '');
          setDescription(draft.description ?? '');
          setIsPublic(draft.isPublic ?? false);
          if (draft.cards?.length) {
            cardIdCounter = Math.max(...draft.cards.map((c) => c.id)) + 1;
            setCards(draft.cards);
          }
          setSavedAt(new Date(draft._savedAt) || new Date());
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Card mutations ──────────────────────────────────────────────────── */
  /* ── Card mutations ──────────────────────────────────────────────────── */
  const updateCardData = useCallback((id, data) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const addCard = useCallback(() => {
    setCards((prev) => [...prev, makeCard()]);
    setTimeout(() => {
      lastCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  }, []);

  const deleteCard = useCallback((id) => {
    if (cards.length <= 1) { toast.error('Cần ít nhất 1 thẻ.'); return; }
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, [cards.length]);

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleCreate = async (goToStudy = false) => {
    if (!title.trim()) {
      setTitleError('Vui lòng nhập tiêu đề cho học phần.');
      document.getElementById('ssc-title')?.focus();
      return;
    }
    if (title.trim().length < 2) { setTitleError('Tiêu đề phải có ít nhất 2 ký tự.'); return; }
    setTitleError('');

    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    setSubmitting(true);
    try {
      const res = await setService.create({ title: title.trim(), description: description.trim(), isPublic });
      const created = res?.data ?? res;
      const newId = created?._id ?? created?.id;

      if (validCards.length > 0 && newId) {
        await cardService.bulkCreate(
          newId,
          validCards.map((c) => ({
            front:         c.front.trim(),
            back:          c.back.trim(),
            pronunciation: c.pronunciation?.trim() || null,
            example:       c.example?.trim()       || null,
            note:          c.note?.trim()           || null,
            collocation:   c.collocation?.trim()    || null,
            relatedWords:  c.relatedWords?.trim()   || null,
            imageUrl:      c.imageUrl              || null,
          })),
        );
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Tạo học phần thành công! 🎉');

      if (goToStudy && newId) navigate(`/flashcards/sets/${newId}/learn`);
      else if (newId) navigate(`/flashcards/sets/${newId}`);
      else navigate('/flashcards');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tạo thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ssc-page">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="ssc-header">
        <div className="ssc-header-top">
          <div className="ssc-header-left">
            <button className="ssc-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <ChevronLeft size={18} />
            </button>
            <h1 className="ssc-title">Tạo một học phần mới</h1>
          </div>
          <div className="ssc-header-right">
            <div className={`ssc-saved-indicator ${savedAt ? 'saved' : ''}`}>
              {savedAt
                ? <>✓ Đã lưu {savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
                : 'Tự động lưu'}
            </div>
            <button className={`ssc-visibility ${isPublic ? 'public' : ''}`} onClick={() => setIsPublic((v) => !v)} type="button">
              {isPublic ? <Globe size={13} /> : <Lock size={13} />}
              {isPublic ? 'Công khai' : 'Riêng tư'}
            </button>
            <button className="ssc-btn ssc-btn--outline" onClick={() => handleCreate(false)} disabled={submitting}>Tạo</button>
            <button className="ssc-btn ssc-btn--primary" onClick={() => handleCreate(true)} disabled={submitting}>Tạo &amp; ôn luyện</button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <main className="ssc-body">
        {titleError && <p style={{ color: '#ef4444', fontSize: '0.825rem', fontWeight: 600, marginBottom: 8 }}>{titleError}</p>}

        <div className="ssc-set-info">
          <input id="ssc-title" className="ssc-set-title-input" type="text"
            placeholder="Tiêu đề học phần..." value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }} autoFocus />
          <textarea className="ssc-set-desc-input" placeholder="Thêm mô tả..."
            value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="ssc-toolbar">
          <div className="ssc-toolbar-left">
            <button className="ssc-toolbar-btn" type="button"><Upload size={13} />Nhập</button>
            <button className="ssc-toolbar-btn" type="button"><Wand2 size={13} />Thêm sơ đồ</button>
          </div>
          <div className="ssc-toolbar-right">
            <button className="ssc-toolbar-icon-btn" onClick={() => setShowHint((v) => !v)} title="Gợi ý" style={{ color: showHint ? 'var(--gl-tertiary)' : undefined }}><Wand2 size={15} /></button>
            <button className="ssc-toolbar-icon-btn" title="Tìm kiếm"><Search size={15} /></button>
            <button className="ssc-toolbar-icon-btn" title="Xáo trộn"><Shuffle size={15} /></button>
            <div className="ssc-toolbar-divider" />
            <button className="ssc-toolbar-icon-btn" title="Phím tắt"><Keyboard size={15} /></button>
          </div>
        </div>

        <div className="ssc-cards-list">
          {cards.map((card, idx) => (
            <div key={card.id} className="ssc-card" ref={idx === cards.length - 1 ? lastCardRef : null} style={{ padding: '0 0 16px 0', border: '1.5px solid var(--border-subtle, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
              <div className="ssc-card-header" style={{ padding: '12px 20px', background: 'var(--bg-card-header, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="ssc-card-num" style={{ fontWeight: 'bold' }}>{idx + 1}</span>
                <div className="ssc-card-header-actions">
                  <button className="ssc-card-icon-btn ssc-card-icon-btn--delete" onClick={() => deleteCard(card.id)} title="Xóa thẻ" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <CardEditor
                  card={card}
                  onSave={(data) => updateCardData(card.id, data)}
                  onCancel={() => {}}
                  inlineMode
                />
              </div>
            </div>
          ))}
        </div>

        <div className="ssc-add-card-wrap">
          <button className="ssc-add-card-btn" onClick={addCard} type="button">
            <span className="ssc-plus-icon">+</span>Thêm thẻ
          </button>
          <button className="ssc-import-btn" type="button"><Upload size={13} />Nhập từ file</button>
        </div>

        <div className="ssc-bottom-actions">
          <button className="ssc-btn ssc-btn--outline ssc-btn--lg" onClick={() => handleCreate(false)} disabled={submitting}>Tạo</button>
          <button className="ssc-btn ssc-btn--primary ssc-btn--lg" onClick={() => handleCreate(true)} disabled={submitting}>Tạo &amp; ôn luyện</button>
        </div>
      </main>
    </div>
  );
}
