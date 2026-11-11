import { Outlet } from 'react-router-dom';
import AdminShell from '../components/admin/AdminShell';

// Layout các trang /admin/* (Reviews tự dựng khung riêng)
export default function AdminLayout() {
  return <AdminShell><Outlet /></AdminShell>;
}
