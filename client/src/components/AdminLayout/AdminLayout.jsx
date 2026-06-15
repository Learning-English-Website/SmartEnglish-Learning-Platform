import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import './AdminLayout.css';
import '../../pages/Admin/AdminPage.css';

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div className="admin-layout-main">
        <AdminTopbar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <main className="admin-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}

