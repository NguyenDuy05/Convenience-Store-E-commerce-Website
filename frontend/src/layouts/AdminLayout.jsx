import { Outlet } from 'react-router-dom';
import AdminShell from '../components/admin/AdminShell';

// Mọi trang /admin/* dùng chung sidebar + topbar QUICK. Riêng Reviews tự dựng khung của nó.
export default function AdminLayout() {
  return <AdminShell><Outlet /></AdminShell>;
}
