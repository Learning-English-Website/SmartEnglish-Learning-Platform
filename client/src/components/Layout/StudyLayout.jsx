import { Outlet, useNavigate } from 'react-router-dom';
import { createContext, useContext, useState } from 'react';
import './StudyLayout.css';

export const StudyLayoutContext = createContext({
  setTitle: () => {},
  setBackTo: () => {},
});

export function useStudyLayoutContext() {
  return useContext(StudyLayoutContext);
}

export default function StudyLayout({ backTo: defaultBackTo, hideHeader = false }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [backTo, setBackTo] = useState(defaultBackTo || '/dashboard');

  if (hideHeader) {
    return (
      <StudyLayoutContext.Provider value={{ setTitle, setBackTo }}>
        <div className="study-layout study-layout--minimal">
          <main className="study-layout__content">
            <Outlet />
          </main>
        </div>
      </StudyLayoutContext.Provider>
    );
  }

  return (
    <StudyLayoutContext.Provider value={{ setTitle, setBackTo }}>
      <div className="study-layout">
        <header className="study-layout__topbar">
          <div className="study-layout__topbar-left">
            <button
              className="study-layout__back-btn"
              onClick={() => navigate(backTo)}
              title="Quay lại"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className="study-layout__brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4255ff"/>
                <path d="M2 17l10 5 10-5" stroke="#4255ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="#4255ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="study-layout__brand-name">Memoris</span>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
              <span>Thoát</span>
            </button>
          </div>
        </header>

        <main className="study-layout__content">
          <Outlet />
        </main>
      </div>
    </StudyLayoutContext.Provider>
  );
}
