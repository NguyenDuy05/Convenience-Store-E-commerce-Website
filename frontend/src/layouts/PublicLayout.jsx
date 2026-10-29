import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import useAuth from '../hooks/useAuth';

const base = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/promotions', label: 'Promotions' },
];

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const extra =
    user?.role === 'customer' ? [{ to: '/cart', label: 'Cart' }, { to: '/orders', label: 'Orders' }, { to: '/profile', label: 'Profile' }]
    : user?.role === 'staff' ? [{ to: '/staff', label: 'Staff Dashboard' }]
    : user?.role === 'admin' ? [{ to: '/admin', label: 'Admin Dashboard' }]
    : [];
  if (pathname === '/products' || pathname === '/promotions' || pathname === '/promotion') return <Outlet />;

  return (
    <>
      <NavBar links={[...base, ...extra]} />
      <main className="container"><Outlet /></main>
    </>
  );
}
