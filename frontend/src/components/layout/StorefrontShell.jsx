import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HomeHeader from '../home/HomeHeader';
import { BRAND_NAME, openInfo } from '../home/homeConfig';
import { listStores } from '../../api/store.api';
import '../../styles/home.css';

export default function StorefrontShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [store, setStore] = useState(null);
  useEffect(() => { let alive = true; listStores().then((r) => { if (alive) setStore(r.data[0] || null); }).catch(() => {}); return () => { alive = false; }; }, []);
  const fullWidth = location.pathname === '/' || ['/products', '/promotions', '/promotion', '/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get('search') || '');
    if (location.hash) {
      const timer = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location.pathname, location.hash, location.search]);
  const go = (id) => navigate(id === 'products' ? '/products' : id === 'promotions' ? '/promotions' : id === 'store' ? '/#store' : '/');
  return <div className="storefront-shell">
    <a className="ui-skip-link" href="#main-content">Skip to main content</a>
    <div className="hp storefront-header"><HomeHeader store={store} info={openInfo(store)} q={search} setQ={setSearch} active={location.pathname === '/' ? 'top' : ''} onNav={go} onSearch={(e) => { e.preventDefault(); navigate(`/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`); }} /></div>
    <div id="main-content" tabIndex={-1} className={fullWidth ? 'storefront-main full-width' : 'container storefront-main'}>{children}</div>
    <footer className="storefront-footer"><div><Link className="storefront-footer-brand" to="/">{BRAND_NAME}</Link><p>Order online. Pick up in store.</p></div><nav aria-label="Footer navigation"><Link to="/products">Products</Link><Link to="/promotions">Offers</Link><Link to="/orders">Track orders</Link><Link to="/support">Support</Link></nav>{store && <address className="storefront-contact"><span>{store.address}</span><a href={"tel:" + store.phone}>{store.phone}</a>{store.website && <a href={store.website}>{store.website.replace(/^https?:\/\//, "")}</a>}<span>{store.openingHours?.[0] && `${store.openingHours[0].openTime} - ${store.openingHours[0].closeTime} daily`}</span></address>}<small>© {new Date().getFullYear()} {BRAND_NAME}</small></footer>
  </div>;
}
