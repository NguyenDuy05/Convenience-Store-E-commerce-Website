import { Outlet } from 'react-router-dom';
import StaffShell from '../components/staff/StaffShell';

// Layout các trang /staff/*
export default function StaffLayout() {
  return <StaffShell><Outlet /></StaffShell>;
}
