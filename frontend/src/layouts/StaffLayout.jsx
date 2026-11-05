import { Outlet } from 'react-router-dom';
import StaffShell from '../components/staff/StaffShell';

// Mọi trang /staff/* dùng chung sidebar + topbar QUICK (giống admin).
export default function StaffLayout() {
  return <StaffShell><Outlet /></StaffShell>;
}