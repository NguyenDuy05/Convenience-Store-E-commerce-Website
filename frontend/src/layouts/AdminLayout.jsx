import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { adminNav } from '../routes/navConfig';

export default function AdminLayout() {
  const { pathname } = useLocation();
  if (pathname === '/admin/reviews') return <Outlet />;
  return (
    <>
      <NavBar links={adminNav} brand="Quản trị" />
      <main className="container"><Outlet /></main>
    </>
  );
}
