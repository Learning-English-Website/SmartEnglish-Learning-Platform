import { Outlet, useNavigate } from 'react-router-dom';
import { createContext, useContext, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import './StudyLayout.css';

export const StudyLayoutContext = createContext({
  setTitle: () => {},
  setBackTo: () => {},
});

export function useStudyLayoutContext() {
  return useContext(StudyLayoutContext);
}

export default function StudyLayout({ backTo: defaultBackTo }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [backTo, setBackTo] = useState(defaultBackTo || '/dashboard');

  return (
    <StudyLayoutContext.Provider value={{ setTitle, setBackTo }}>
      <div className="study-layout">
        {/* ── Minimal Top Bar ────────────────────────────────────── */}
        <header className="study-layout__topbar">
          <div className="study-layout__topbar-left">
            <button
              className="study-layout__back-btn"
              onClick={() => navigate(backTo)}
              title="Quay lại"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="study-layout__brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4255ff" />
                <path d="M2 17l10 5 10-5" stroke="#4255ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="#4255ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="study-layout__brand-name">SmartEnglish</span>
            </div>
            {title && (
              <>
                <span className="study-layout__sep">/</span>
                <span className="study-layout__title">{title}</span>
              </>
            )}
          </div>

          <div className="study-layout__topbar-right">
            <button
              className="study-layout__close-btn"
              onClick={() => navigate(backTo)}
              title="Thoát học"
            >
              <X size={16} />
              <span>Thoát</span>
            </button>
          </div>
        </header>

        {/* ── Main Content ──────────────────────────────────────── */}
        <main className="study-layout__content">
          <Outlet />
        </main>
      </div>
    </StudyLayoutContext.Provider>
  );
}
