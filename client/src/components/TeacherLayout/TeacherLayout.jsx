import React, { useState } from 'react';
import TeacherSidebar from './TeacherSidebar';
import TeacherTopbar from './TeacherTopbar';
import './TeacherLayout.css';

export default function TeacherLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="teacher-layout-wrapper" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TeacherSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="teacher-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <TeacherTopbar />
        <main className="teacher-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
