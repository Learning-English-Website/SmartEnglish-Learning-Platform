import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const CHALLENGE_TYPES = ['SELECT', 'ASSIST', 'TYPE', 'TRANSLATE', 'COMPLETE', 'ORDER', 'MATCH', 'FILL', 'LISTEN'];

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, title }) {
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Xác nhận xóa</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Bạn có chắc muốn xóa challenge này?
          </p>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-heading)', wordBreak: 'break-word' }}>{title}</p>
          <div className="delete-confirm-warning">⚠️ Challenge và các đáp án liên quan sẽ bị xóa vĩnh viễn.</div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={onClose}>Hủy</button>
          <button className="btn-danger-admin" disabled={loading} onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}>
            {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterLesson, setFilterLesson] = useState('');

  const [form, setForm] = useState({
    lesson: '', type: 'SELECT', question: '',
    correctAnswer: '', sourceLang: 'vi', targetLang: 'en',
    imageSrc: '', audioSrc: '',
    wordBank: '', correctOrder: '',
    pairs: '',
    sentence: '', blankIndex: '',
    hint: '',
    options: [{ text: '', correct: false }],
    order: 0,
  });

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 10 };
      if (filterLesson) params.lessonId = filterLesson;

      const [chRes, lesRes] = await Promise.all([
        adminService.getChallenges(params),
        adminService.getLessons(),
      ]);
      const chData = chRes.data;
      setChallenges(chData.challenges || []);
      setTotal(chData.total || 0);
      setPage(chData.page || 1);
      setPages(chData.pages || 1);
      setLessons(lesRes.data || []);
    } catch { toast.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [filterLesson]);

  useEffect(() => { loadData(1); }, [loadData]);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      lesson: lessons[0]?._id || '', type: 'SELECT', question: '',
      correctAnswer: '', sourceLang: 'vi', targetLang: 'en',
      imageSrc: '', audioSrc: '',
      wordBank: '', correctOrder: '',
      pairs: '', sentence: '', blankIndex: '', hint: '',
      options: [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }],
      order: 0,
    });
    setShowModal(true);
  };

  const openEdit = async (item) => {
    try {
      const res = await adminService.getChallenge(item._id);
      const ch = res.data;
      setEditItem(ch);
      setForm({
        lesson: ch.lesson?._id || ch.lesson || '',
        type: ch.type || 'SELECT',
        question: ch.question || '',
        correctAnswer: ch.correctAnswer || '',
        sourceLang: ch.sourceLang || 'vi',
        targetLang: ch.targetLang || 'en',
        imageSrc: ch.imageSrc || '',
        audioSrc: ch.audioSrc || '',
        wordBank: (ch.wordBank || []).join(', '),
        correctOrder: (ch.correctOrder || []).join(', '),
        pairs: (ch.pairs || []).map(p => `${p.left}|${p.right}`).join('\n'),
        sentence: ch.sentence || '',
        blankIndex: ch.blankIndex?.toString() || '',
        hint: ch.hint || '',
        options: (ch.options && ch.options.length > 0)
          ? ch.options.map(o => ({ text: o.text || '', correct: o.correct || false }))
          : [{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }],
        order: ch.order || 0,
      });
      setShowModal(true);
    } catch { toast.error('Không thể tải chi tiết Challenge'); }
  };

  const updateOption = (idx, field, val) => {
    const opts = [...form.options];
    opts[idx][field] = val;
    if (field === 'correct') opts.forEach((o, i) => { if (i !== idx) o.correct = false; });
    setForm(f => ({ ...f, options: opts }));
  };

  const handleSave = async () => {
    if (!form.lesson) { toast.error('Vui lòng chọn Lesson'); return; }
    if (!form.question.trim()) { toast.error('Vui lòng nhập câu hỏi'); return; }
    setSaving(true);
    try {
      const payload = {
        lesson: form.lesson,
        type: form.type,
        question: form.question,
        order: parseInt(form.order) || 0,
        sourceLang: form.sourceLang,
        targetLang: form.targetLang,
        imageSrc: form.imageSrc || null,
        audioSrc: form.audioSrc || null,
      };
      if (['TYPE', 'TRANSLATE', 'COMPLETE', 'FILL', 'LISTEN'].includes(form.type)) payload.correctAnswer = form.correctAnswer;
      if (form.type === 'ORDER') {
        payload.wordBank = form.wordBank ? form.wordBank.split(',').map(s => s.trim()).filter(Boolean) : [];
        payload.correctOrder = form.correctOrder ? form.correctOrder.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
      }
      if (form.type === 'MATCH') {
        payload.pairs = form.pairs ? form.pairs.split('\n').map(line => {
          const [left, right] = line.split('|').map(s => s.trim());
          return left && right ? { left, right } : null;
        }).filter(Boolean) : [];
      }
      if (['COMPLETE', 'FILL'].includes(form.type)) {
        payload.sentence = form.sentence;
        payload.blankIndex = form.blankIndex !== '' ? parseInt(form.blankIndex) : null;
      }
      if (form.type === 'LISTEN') payload.hint = form.hint;
      if (['SELECT', 'ASSIST', 'FILL'].includes(form.type)) {
        payload.options = form.options.filter(o => o.text.trim()).map(o => ({ text: o.text, correct: o.correct }));
      }
      if (editItem) { await adminService.updateChallenge(editItem._id, payload); toast.success('Cập nhật thành công'); }
      else { await adminService.createChallenge(payload); toast.success('Tạo Challenge thành công'); }
      setShowModal(false);
      loadData(editItem ? page : 1);
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Có lỗi xảy ra'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await adminService.deleteChallenge(deleteItem._id); toast.success('Đã xóa Challenge'); setDeleteItem(null); loadData(page); }
    catch (err) { toast.error(err.response?.data?.error?.message || 'Xóa thất bại'); }
  };

  const getPageNumbers = () => {
    const range = [];
    const delta = 2;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  if (loading && !challenges.length) return <div className="admin-page-loading"><div className="admin-spinner" /><p>Đang tải...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Danh sách Challenges</h2>
          <p>{total} challenges</p>
        </div>
        <button className="btn-primary-admin" onClick={openCreate} disabled={lessons.length === 0}><Plus size={15} /> Thêm Challenge</button>
      </div>

      <div className="admin-filter-bar">
        <select value={filterLesson} onChange={e => setFilterLesson(e.target.value)}>
          <option value="">Tất cả Lessons</option>
          {lessons.map(l => <option key={l._id} value={l._id}>{l.title} ({l.unit?.title})</option>)}
        </select>
      </div>

      {challenges.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🎯</div>
          <h3>Chưa có Challenge nào</h3>
          <p>Tạo Challenge đầu tiên cho Lesson của bạn</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Câu hỏi</th>
                  <th>Loại</th>
                  <th>Lesson</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c, i) => (
                  <tr key={c._id}>
                    <td className="admin-td-num">{(page - 1) * 10 + i + 1}</td>
                    <td className="admin-td-question" title={c.question}>{c.question}</td>
                    <td><span className={`admin-badge ${c.type?.toLowerCase()}-type`}>{c.type}</span></td>
                    <td className="admin-td-muted">{c.lesson?.title || '—'}</td>
                    <td className="admin-td-actions">
                      <button className="btn-action" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                      <button className="btn-action danger" onClick={() => setDeleteItem(c)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination-btn"
                disabled={page <= 1 || loading}
                onClick={() => loadData(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return <span key={`ellipsis-${idx}`} className="admin-pagination-ellipsis">...</span>;
                }
                return (
                  <button
                    key={p}
                    className={`admin-pagination-btn ${page === p ? 'active' : ''}`}
                    disabled={loading}
                    onClick={() => loadData(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="admin-pagination-btn"
                disabled={page >= pages || loading}
                onClick={() => loadData(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa Challenge' : 'Thêm Challenge mới'}>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Lesson *</label>
              <select className="form-control-admin" value={form.lesson} onChange={e => setForm(f => ({ ...f, lesson: e.target.value }))}>
                <option value="">— Chọn Lesson —</option>
                {lessons.map(l => <option key={l._id} value={l._id}>{l.title} ({l.unit?.title})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Loại Challenge *</label>
              <select className="form-control-admin" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {CHALLENGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Câu hỏi *</label>
            <input className="form-control-admin" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Nhập câu hỏi..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Ngôn ngữ nguồn</label>
              <select className="form-control-admin" value={form.sourceLang} onChange={e => setForm(f => ({ ...f, sourceLang: e.target.value }))}>
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">Tiếng Anh (en)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ngôn ngữ đích</label>
              <select className="form-control-admin" value={form.targetLang} onChange={e => setForm(f => ({ ...f, targetLang: e.target.value }))}>
                <option value="en">Tiếng Anh (en)</option>
                <option value="vi">Tiếng Việt (vi)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>URL hình ảnh</label>
              <input className="form-control-admin" value={form.imageSrc} onChange={e => setForm(f => ({ ...f, imageSrc: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>URL audio</label>
              <input className="form-control-admin" value={form.audioSrc} onChange={e => setForm(f => ({ ...f, audioSrc: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div className="form-group">
            <label>Thứ tự</label>
            <input type="number" className="form-control-admin" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} min={0} style={{ maxWidth: 120 }} />
          </div>

          {form.type && (
            <div className="admin-type-settings">
              <span className="admin-type-settings-title">Cấu hình loại {form.type}</span>
              
              {['TYPE', 'TRANSLATE', 'COMPLETE', 'FILL', 'LISTEN'].includes(form.type) && (
                <div className="form-group">
                  <label>Đáp án đúng</label>
                  <input className="form-control-admin" value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))} placeholder="Nhập đáp án đúng..." />
                </div>
              )}
              
              {form.type === 'ORDER' && (
                <>
                  <div className="form-group">
                    <label>Word Bank (các từ, cách nhau bởi dấu phẩy)</label>
                    <input className="form-control-admin" value={form.wordBank} onChange={e => setForm(f => ({ ...f, wordBank: e.target.value }))} placeholder="I, go, to, school" />
                  </div>
                  <div className="form-group">
                    <label>Correct Order (chỉ số, cách nhau bởi dấu phẩy)</label>
                    <input className="form-control-admin" value={form.correctOrder} onChange={e => setForm(f => ({ ...f, correctOrder: e.target.value }))} placeholder="0, 2, 1, 3" />
                  </div>
                </>
              )}
              
              {form.type === 'MATCH' && (
                <div className="form-group">
                  <label>Pairs (mỗi dòng: left|right)</label>
                  <textarea className="form-control-admin" rows={4} value={form.pairs} onChange={e => setForm(f => ({ ...f, pairs: e.target.value }))} placeholder="cat|mèo&#10;dog|chó" />
                </div>
              )}
              
              {['COMPLETE', 'FILL'].includes(form.type) && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Câu hoàn chỉnh</label>
                    <input className="form-control-admin" value={form.sentence} onChange={e => setForm(f => ({ ...f, sentence: e.target.value }))} placeholder="She is a ___ teacher" />
                  </div>
                  <div className="form-group">
                    <label>Blank Index</label>
                    <input type="number" className="form-control-admin" value={form.blankIndex} onChange={e => setForm(f => ({ ...f, blankIndex: e.target.value }))} placeholder="2" min={0} />
                  </div>
                </div>
              )}
              
              {form.type === 'LISTEN' && (
                <div className="form-group">
                  <label>Gợi ý (hint)</label>
                  <input className="form-control-admin" value={form.hint} onChange={e => setForm(f => ({ ...f, hint: e.target.value }))} placeholder="_ _ _ _ _" />
                </div>
              )}

              {['SELECT', 'ASSIST', 'FILL'].includes(form.type) && (
                <div className="options-editor" style={{ borderTop: 'none', paddingTop: 0, marginTop: '1rem' }}>
                  <div className="options-editor-header">
                    <h4>Tùy chọn đáp án (chỉ chọn 1 đáp án đúng)</h4>
                  </div>
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="option-item">
                      <input className="form-control-admin option-text" value={opt.text} onChange={e => updateOption(idx, 'text', e.target.value)} placeholder={`Tùy chọn ${idx + 1}`} />
                      <label className="option-correct">
                        <input type="checkbox" checked={opt.correct} onChange={e => updateOption(idx, 'correct', e.target.checked)} />
                        Đúng
                      </label>
                      {form.options.length > 2 && (
                        <button className="btn-action danger" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))}><X size={12} /></button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button className="btn-secondary-admin" style={{ marginTop: 8, fontSize: '0.8rem', padding: '5px 12px' }} onClick={() => setForm(f => ({ ...f, options: [...f.options, { text: '', correct: false }] }))}>
                      <Plus size={12} /> Thêm tùy chọn
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-admin" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn-primary-admin" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo Challenge'}</button>
        </div>
      </Modal>

      <DeleteModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title={deleteItem?.question?.substring(0, 60) + (deleteItem?.question?.length > 60 ? '...' : '')} />
    </div>
  );
}
