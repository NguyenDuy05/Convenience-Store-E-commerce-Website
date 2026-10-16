import { Outlet } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { staffNav } from '../routes/navConfig';

export default function StaffLayout() {
  return (
    <>
      <NavBar links={staffNav} brand="Nhân viên" />
      <main className="container"><Outlet /></main>
    </>
  );
}
