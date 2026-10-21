import { Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { customerNav } from '../routes/navConfig';

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
  const onReviewPage = pathname === '/reviews';
  const links = customerNav.map((link) => {
    if (!onReviewPage) return link;
    const to = link.to.replace(/^\/\//, '/');
    return { ...link, to, label: REVIEW_NAV_LABELS[to] || link.label };
  });
  return (
    <>
      <NavBar links={[{ to: '/products', label: onReviewPage ? 'Products' : 'Sáº£n pháº©m' }, ...links]} />
      <main className="container"><Outlet /></main>
    </>
  );
}
