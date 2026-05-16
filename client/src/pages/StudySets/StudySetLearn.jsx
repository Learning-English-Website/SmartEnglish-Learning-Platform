import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Brain, X, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { setService } from '../../api/setService';
import { cardService } from '../../api/cardService';
import './StudySetLearn.css';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudySetLearn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const [settings, setSettings] = useState({ showHint: false, multipleChoice: true, flashcardMode: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [setRes, cardsRes] = await Promise.all([setService.getById(id), cardService.getBySetId(id)]);
        setStudySet(setRes?.data ?? setRes);
        setCards(shuffleArray([...(cardsRes?.data ?? cardsRes ?? [])]));
      } catch { toast.error('Không thể tải dữ liệu.'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const options = useMemo(() => {
    if (!cards.length) return [];
    const correct = cards[currentIdx];
    const others = cards.filter((_, i) => i !== currentIdx);
    const allOptions = shuffleArray([correct, ...shuffleArray([...others]).slice(0, 3)]);
    return allOptions.map((c) => ({ id: c._id, text: c.back }));
  }, [cards, currentIdx]);

  const handleAnswer = useCallback((opt) => {
    if (answered) return;
    setSelectedOption(opt.id);
    setAnswered(true);
    const correct_ = opt.id === cards[currentIdx]._id;
    setIsCorrect(correct_);
    if (correct_) {
      setKnown((k) => k + 1);
      setStreak((s) => { const ns = s + 1; setMaxStreak((m) => Math.max(m, ns)); return ns; });
    } else {
      setUnknown((u) => u + 1);
      setStreak(0);
    }
  }, [answered, cards, currentIdx]);

  const handleNext = useCallback(() => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setIsCorrect(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIdx, cards.length]);

  const handleRetryUnknown = useCallback(() => {
    setCurrentIdx(0); setSelectedOption(null); setAnswered(false);
    setIsCorrect(false); setKnown(0); setUnknown(0); setStreak(0); setIsComplete(false);
    setCards(shuffleArray([...cards]));
  }, [cards]);

  const progress = cards.length > 0 ? ((currentIdx + (answered ? 1 : 0)) / cards.length) * 100 : 0;

  if (loading) return (
    <div className="sl-page">
      <div className="sl-loading"><div className="spinner-border text-primary" /><span>Đang chuẩn bị bài học...</span></div>
    </div>
  );

  /* ── Complete ─────────────────────────────────────────────────────── */
  if (isComplete) {
    const total = known + unknown;
    const score = total > 0 ? Math.round((known / total) * 100) : 0;
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="sl-page">
        <div className="sl-complete" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 40px' }}>
          <div className="sl-complete-icon">{score >= 80 ? '🏆' : score >= 50 ? '💪' : '📚'}</div>
          <h1 className="sl-complete-title">{score >= 80 ? 'Xuất sắc!' : score >= 50 ? 'Tốt lắm!' : 'Cố gắng hơn nhé!'}</h1>
          <p className="sl-complete-subtitle">Bạn đã hoàn thành {studySet?.title}</p>

          <div className="sl-score-ring">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <defs><linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient></defs>
              <circle className="sl-score-ring-bg" cx="60" cy="60" r="52" />
              <circle className="sl-score-ring-fill" cx="60" cy="60" r="52" strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <div className="sl-score-value">
              <span className="sl-score-num">{score}%</span>
              <span className="sl-score-lbl">Điểm</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{known}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đúng</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{unknown}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sai</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>{maxStreak}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chuỗi tốt nhất</div></div>
          </div>

          <div className="sl-complete-actions">
            <button className="sl-complete-btn sl-complete-btn--outline" onClick={() => navigate(`/study-sets/${id}`)}><ChevronLeft size={15} />Quay lại học phần</button>
            <button className="sl-complete-btn sl-complete-btn--primary" onClick={handleRetryUnknown}><RotateCcw size={15} />Học lại</button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIdx];
  if (!currentCard) return null;

  return (
    <div className="sl-page">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="sl-topbar">
        <div className="sl-topbar-left">
          <button className="sl-topbar-title-btn" onClick={() => navigate(`/study-sets/${id}`)}>
            <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
            <Brain size={15} style={{ color: 'var(--gl-tertiary)' }} />
            <span>Học</span>
          </button>
        </div>
        <div className="sl-topbar-center">
          <div className="sl-progress-bar"><div className="sl-progress-fill" style={{ width: `${progress}%` }} /></div>
          <span className="sl-progress-text">{currentIdx + 1} / {cards.length}</span>
        </div>
        <div className="sl-topbar-right">
          <button className="sl-close-btn" onClick={() => navigate(`/study-sets/${id}`)} title="Đóng"><X size={14} /></button>
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────────── */}
      <div className="sl-layout">
        <div className="sl-main">
          <div className="sl-question-card">
            <div className="sl-question-header">
              <span className="sl-question-type-badge"><Brain size={11} />Học</span>
              <span className="sl-question-progress-label">{known} đúng · {unknown} sai</span>
            </div>
            <div className="sl-question-body">
              <div className="sl-question-label">Thuật ngữ</div>
              <div className="sl-question-text">{currentCard.front}</div>
            </div>

            {options.length > 0 && (
              <div className="sl-options-grid">
                {options.map((opt, i) => {
                  let btnClass = 'sl-option-btn';
                  if (answered) {
                    if (opt.id === currentCard._id) btnClass += ' correct';
                    else if (opt.id === selectedOption && !isCorrect) btnClass += ' wrong';
                  }
                  return (
                    <button key={opt.id} className={btnClass} onClick={() => handleAnswer(opt)} disabled={answered}>
                      <span className="sl-option-letter">{String.fromCharCode(65 + i)}</span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {answered && (
              <div className="sl-feedback-bar">
                {isCorrect ? (
                  <div className="sl-feedback-correct"><CheckCircle size={15} />Chính xác! {streak > 1 && `🔥 Chuỗi ${streak}`}</div>
                ) : (
                  <div className="sl-feedback-wrong"><XCircle size={15} />Chưa đúng. Đáp án: {cards[currentIdx]?.back}</div>
                )}
                <div className="sl-feedback-next">
                  <button className="sl-btn-next sl-btn-next--outline" onClick={() => navigate(`/study-sets/${id}`)}>Thoát</button>
                  <button className="sl-btn-next sl-btn-next--primary" onClick={handleNext}>{currentIdx < cards.length - 1 ? 'Tiếp theo →' : 'Hoàn thành'}</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ─────────────────────────────────────────── */}
        <div className="sl-sidebar">
          <div className="sl-settings-card">
            <div className="sl-settings-title">Cài đặt</div>
            <div className="sl-streak">
              <span className="sl-streak-icon">🔥</span>
              <div className="sl-streak-info">
                <span className="sl-streak-count">{streak}</span>
                <span className="sl-streak-label">Chuỗi hiện tại</span>
              </div>
            </div>
            <div className="sl-settings-section">
              {[
                { key: 'showHint', label: 'Gợi ý' },
                { key: 'multipleChoice', label: 'Trắc nghiệm' },
                { key: 'flashcardMode', label: 'Chế độ thẻ' },
              ].map(({ key, label }) => (
                <label key={key} className="sl-settings-toggle-row">
                  <span className="sl-settings-toggle-label">{label}</span>
                  <label className="sl-toggle">
                    <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))} />
                    <span className="sl-toggle-slider" />
                  </label>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
