import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Icon } from './HomeParts';
import ProductSearchInput from './ProductSearchInput';
import { BRAND_NAME, LOGO_IMAGE } from './homeConfig';
import NotificationBell from '../common/NotificationBell';
import { getCart } from '../../api/cart.api';
import CartIcon from '../common/CartIcon';
import UserAvatarIcon from '../common/UserAvatarIcon';

const NAV = [['top', "Home"], ['products', "Products"], ['promotions', "Offers"], ['store', "Store"]];
const roleHome = { customer: '/profile', staff: '/staff', admin: '/admin' };
const ACCOUNT_LINKS = [
    ['/profile', 'person', 'My profile'],
    ['/orders', 'receipt_long', 'My orders'],
    ['/wallet', 'account_balance_wallet', 'My wallet'],
    ['/addresses', 'location_on', 'Addresses'],
    ['/reviews', 'reviews', 'My reviews'],
    ['/membership', 'loyalty', 'Membership'],
    ['/notifications', 'notifications', 'Notifications'],
    ['/support', 'support_agent', 'Support'],
];

// Header cửa hàng: logo, menu, tìm kiếm, giỏ hàng, chuông, avatar + menu tài khoản
export default function HomeHeader({ store, info, q, setQ, active, onNav, onSearch, products = [] }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [menu, setMenu] = useState(false);
    const [cartCount, setCartCount] = useState(null);
    useEffect(() => {
        let alive = true, changed = false;
        setCartCount(null);
        if (user?.role !== 'customer') return;
        const update = (event) => { changed = true; setCartCount(event.detail.itemCount); };
        window.addEventListener('quick:cart-updated', update);
        getCart().then((response) => { if (alive && !changed) setCartCount(response.data.itemCount); }).catch(() => {});
        return () => { alive = false; window.removeEventListener('quick:cart-updated', update); };
    }, [user?.id, user?._id, user?.role, location.pathname]);
    const nav = (id) => { setOpen(false); onNav(id); };
    const visit = (path) => { setOpen(false); navigate(path); };
    const currentPage = location.pathname === '/promotions' ? 'promotions' : location.pathname.startsWith('/products') ? 'products' : active;

    const search = (cls) => (
        <form className={cls} onSubmit={(e) => { setOpen(false); onSearch(e); }}>
            <Icon name="search" />
            <ProductSearchInput products={products} value={q} onChange={setQ} placeholder="Search products…" ariaLabel="Search products" />
            <button type="submit" className="hp-b hp-find">Search</button>
        </form>
    );

    return (
        <header className="hp-header">
            <div className="hp-topbar">
                <div className="hp-wrap hp-topbar-in">
                    <span className="hp-topbar-l">
                        <Icon name="store" size="md" /> <b>{store?.name || BRAND_NAME}</b>
                        {info && <em className={info.open ? 'ok' : 'off'}>{info.open ? 'Open' : 'Closed'} · {info.text}</em>}
                    </span>
                    <span className="hp-topbar-r">
                        <span className="hp-pickup"><Icon name="local_mall" size="sm" /> Order online · Pick up in store</span>
                    </span>
                </div>
            </div>

            <div className="hp-wrap hp-hbar">
                <Link to="/" className="hp-b hp-brand" aria-label={`${BRAND_NAME} home`}>
                    <span className="hp-logo">{LOGO_IMAGE ? <img src={LOGO_IMAGE} alt="" /> : <Icon name="storefront" size="lg" />}</span>
                    <span>{BRAND_NAME}</span>
                </Link>

                <nav className="hp-nav" aria-label="Main">
                    {NAV.map(([id, label]) => (
                        id === 'products' || id === 'promotions'
                            ? <button type="button" key={id} className={`hp-b hp-navbtn ${currentPage === id ? 'on' : ''}`} onClick={() => visit(id === 'products' ? '/products' : '/promotions')}>{label}</button>
                            : <button type="button" key={id} className={`hp-b hp-navbtn ${currentPage === id ? 'on' : ''}`} onClick={() => nav(id)}>{label}</button>
                    ))}
                </nav>

                {search('hp-hsearch')}

                <div className="hp-actions">
                    {(!user || user.role === 'customer') && <Link to="/cart" className="hp-icobtn hp-cart-indicator" aria-label={cartCount === null ? 'Cart' : `Cart (${cartCount} items)`}><CartIcon size={24} strokeWidth={1.9} />{cartCount > 0 && <span className="hp-cart-count">{cartCount > 99 ? '99+' : cartCount}</span>}</Link>}
                    {user?.role === 'customer' && <Link to="/wallet" className="hp-icobtn" aria-label="My wallet"><Icon name="account_balance_wallet" size="lg" /></Link>}
                    {(user?.role === 'staff' || user?.role === 'admin') && <Link to={roleHome[user.role]} className="dash-trigger" aria-label={`${user.role === 'admin' ? 'Admin' : 'Staff'} dashboard`} title={`${user.role === 'admin' ? 'Admin' : 'Staff'} dashboard`}><Icon name="space_dashboard" size="lg" /></Link>}
                    <NotificationBell />
                    {user ? (
                        <div className="hp-acct" onMouseLeave={() => setMenu(false)}>
                            <button type="button" className={`hp-b hp-avatar-btn ${menu ? 'on' : ''}`} onClick={() => setMenu(!menu)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={menu}>
                                <UserAvatarIcon size={34} />
                            </button>
                            {menu && (
                                <div className="hp-acct-menu" role="menu">
                                    <div className="hp-acct-head"><b>{user.fullName}</b><small>{user.email}</small></div>
                                    {(user.role === 'customer' ? ACCOUNT_LINKS : [[roleHome[user.role], 'dashboard', 'Dashboard']]).map(([to, icon, label]) => (
                                        <Link key={to} to={to} role="menuitem" className={`hp-acct-item ${location.pathname.startsWith(to) ? 'on' : ''}`} onClick={() => setMenu(false)}><Icon name={icon} size="md" />{label}</Link>
                                    ))}
                                    <button type="button" role="menuitem" className="hp-b hp-acct-item out" onClick={() => { setMenu(false); logout(); navigate('/'); }}><Icon name="logout" size="md" />Log out</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="hp-hbtn">Log in</Link>
                            <Link to="/register" className="hp-hbtn solid">Sign up</Link>
                        </>
                    )}
                    <button type="button" className="hp-b hp-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><Icon name={open ? 'close' : 'menu'} size="lg" /></button>
                </div>
            </div>

            {open && (
                <div className="hp-mobile">
                    <div className="hp-wrap">
                        {search('hp-msearch')}
                        {NAV.map(([id, label]) => <button type="button" key={id} className={`hp-b hp-mnav ${currentPage === id ? 'on' : ''}`} onClick={() => id === 'products' || id === 'promotions' ? visit(id === 'products' ? '/products' : '/promotions') : nav(id)}>{label}</button>)}
                        {user?.role === 'customer' && <><Link className="hp-mnav" to="/orders" onClick={() => setOpen(false)}>My orders</Link><Link className="hp-mnav" to="/wallet" onClick={() => setOpen(false)}>My wallet</Link><Link className="hp-mnav" to="/membership" onClick={() => setOpen(false)}>Membership & points</Link><Link className="hp-mnav" to="/notifications" onClick={() => setOpen(false)}>Notifications</Link></>}
                    </div>
                </div>
            )}
        </header>
    );
}
