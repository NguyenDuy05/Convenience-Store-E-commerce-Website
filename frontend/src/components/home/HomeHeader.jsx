import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Icon } from './HomeParts';
import ProductSearchInput from './ProductSearchInput';
import { BRAND_NAME, LOGO_IMAGE } from './homeConfig';
import NotificationBell from '../common/NotificationBell';
import { getCart } from '../../api/cart.api';

const NAV = [['top', "Home"], ['products', "Products"], ['promotions', "Offers"], ['store', "Store"]];
const roleHome = { customer: '/profile', staff: '/staff', admin: '/admin' };

// Header: top info bar + main bar (logo, menu, search, cart, account)
export default function HomeHeader({ store, info, q, setQ, active, onNav, onSearch, products = [] }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
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
    const name = user?.fullName?.trim().split(/\s+/).pop() || 'Account';

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
                    {(!user || user.role === 'customer') && <Link to="/cart" className="hp-icobtn hp-cart-indicator" aria-label={cartCount === null ? 'Cart' : `Cart (${cartCount} items)`}><Icon name="shopping_bag" size="lg" />{cartCount > 0 && <span className="hp-cart-count">{cartCount > 99 ? '99+' : cartCount}</span>}</Link>}
                    {user?.role === 'customer' && <Link to="/wallet" className="hp-icobtn" aria-label="My wallet"><Icon name="account_balance_wallet" size="lg" /></Link>}
                    <NotificationBell />
                    {user ? (
                        <>
                            <Link to={roleHome[user.role] || '/profile'} className="hp-user"><span className="hp-avatar">{name[0]?.toUpperCase()}</span><span className="hp-user-name">{name}</span></Link>
                            <button type="button" className="hp-b hp-hbtn" onClick={logout}>Log out</button>
                        </>
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
