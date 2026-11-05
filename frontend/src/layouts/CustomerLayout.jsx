import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { customerNav } from '../routes/navConfig';
import MembershipShell from '../components/home/MembershipShell';

const REVIEW_NAV_LABELS = {
  '/profile': 'Profile',
  '/addresses': 'Addresses',
  '/cart': 'Cart',
  '/orders': 'My Orders',
  '/reviews': 'My Reviews',
  '/membership': 'Membership',
  '/support': 'Support',
};

export default function CustomerLayout() {
  const { pathname } = useLocation();
  if (pathname === '/membership') return <MembershipShell><Outlet /></MembershipShell>;
  const onReviewPage = pathname === '/reviews' || pathname === '/membership';
  const links = customerNav.map((link) => {
    if (!onReviewPage) return link;
    const to = link.to.replace(/^\/\//, '/');
    return { ...link, to, label: REVIEW_NAV_LABELS[to] || link.label };
  });
  return (
    <>
      <NavBar links={[{ to: '/products', label: 'Products' }, ...links]} />
      <main className="container"><Outlet /></main>
    </>
  );
}
