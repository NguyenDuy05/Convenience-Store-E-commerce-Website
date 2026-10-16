import { Outlet } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { adminNav } from '../routes/navConfig';

export default function AdminLayout() {
  return (
    <>
      <NavBar links={adminNav} brand="Quản trị" />
      <main className="container"><Outlet /></main>
    </>
  );
}
