import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Globe, Lock, Plus, Upload,
  Shuffle, Search, Keyboard, Trash2, Wand2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import './StudySetCreate.css';

let cardIdCounter = Date.now();

function makeCard() {
  return { id: cardIdCounter++, front: '', back: '' };
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
  const updateCard = useCallback((id, field, value) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
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
        await cardService.bulkCreate(newId, validCards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })));
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Tạo học phần thành công! 🎉');

      if (goToStudy && newId) navigate(`/study-sets/${newId}/learn`);
      else if (newId) navigate(`/study-sets/${newId}`);
      else navigate('/study-sets');
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
            <div key={card.id} className="ssc-card" ref={idx === cards.length - 1 ? lastCardRef : null}>
              <div className="ssc-card-header">
                <span className="ssc-card-num">{idx + 1}</span>
                <div className="ssc-card-header-actions">
                  <button className="ssc-card-drag-handle" title="Kéo để sắp xếp"><span style={{ fontSize: '1rem', opacity: 0.4, letterSpacing: '-2px' }}>≡</span></button>
                  <button className="ssc-card-icon-btn ssc-card-icon-btn--delete" onClick={() => deleteCard(card.id)} title="Xóa thẻ"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="ssc-card-fields">
                <div className="ssc-card-field">
                  <span className="ssc-card-field-label">Thuật ngữ</span>
                  <textarea className="ssc-card-textarea" placeholder="Nhập thuật ngữ..." value={card.front} onChange={(e) => updateCard(card.id, 'front', e.target.value)} />
                </div>
                <div className="ssc-card-field">
                  <span className="ssc-card-field-label">Định nghĩa</span>
                  <textarea className="ssc-card-textarea" placeholder="Nhập định nghĩa..." value={card.back} onChange={(e) => updateCard(card.id, 'back', e.target.value)} />
                </div>
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
