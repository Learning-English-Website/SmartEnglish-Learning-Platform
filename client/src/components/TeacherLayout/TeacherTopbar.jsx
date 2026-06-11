import { useLocation } from 'react-router-dom';
import './TeacherTopbar.css';

export default function TeacherTopbar() {
  const location = useLocation();
  const path = location.pathname;
  let pageTitle = 'Duolingo Studio';
  
  if (path.startsWith('/teacher/studio/')) {
    pageTitle = 'Soạn Bài';
  } else if (path.startsWith('/teacher/daily-challenge')) {
    pageTitle = 'Lên lịch Thử thách';
  }

  return (
    <header className="teacher-topbar">
      <div className="teacher-topbar-left">
        <h1 className="teacher-topbar-title">{pageTitle}</h1>
      </div>
    </header>
  );
}
