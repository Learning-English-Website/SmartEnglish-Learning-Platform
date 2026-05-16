import { Outlet } from 'react-router-dom';
import DashboardLayout from '../Layout/DashboardLayout';

/**
 * PublicSetLayout - DashboardLayout nhưng không require login.
 * Dùng cho các trang xem set public.
 */
export default function PublicSetLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
