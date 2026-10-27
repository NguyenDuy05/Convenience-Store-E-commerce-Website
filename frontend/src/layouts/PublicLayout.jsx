import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import useAuth from '../hooks/useAuth';

const base = [
  { to: '/', label: 'Trang chủ' },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/promotions', label: 'Khuyến mãi' },
];

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const extra =
    user?.role === 'customer' ? [{ to: '/cart', label: 'Giỏ hàng' }, { to: '/orders', label: 'Đơn hàng' }, { to: '/profile', label: 'Hồ sơ' }]
    : user?.role === 'staff' ? [{ to: '/staff', label: 'Khu nhân viên' }]
    : user?.role === 'admin' ? [{ to: '/admin', label: 'Khu quản trị' }]
    : [];
  if (pathname === '/products' || pathname === '/promotions' || pathname === '/promotion') return <Outlet />;

  return (
    <>
      <NavBar links={[...base, ...extra]} />
      <main className="container"><Outlet /></main>
    </>
  );
}
