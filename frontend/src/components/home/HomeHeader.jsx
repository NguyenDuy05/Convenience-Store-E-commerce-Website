import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Icon } from './HomeParts';
import ProductSearchInput from './ProductSearchInput';
import { BRAND_NAME, LOGO_IMAGE } from './homeConfig';

const NAV = [['top', 'Home'], ['products', 'Products'], ['promotions', 'Deals'], ['store', 'Store']];
const roleHome = { customer: '/profile', staff: '/staff', admin: '/admin' };

// Header: top info bar + main bar (logo, menu, search, cart, account)
export default function HomeHeader({ store, info, q, setQ, active, onNav, onSearch, products = [] }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const nav = (id) => { setOpen(false); onNav(id); };
    const visit = (path) => { setOpen(false); navigate(path); };
    const currentPage = location.pathname === '/promotions' ? 'promotions' : location.pathname.startsWith('/products') ? 'products' : active;
    const name = user?.fullName?.trim().split(/\s+/).pop() || 'Account';

    const search = (cls) => (
        <form className={cls} onSubmit={(e) => { setOpen(false); onSearch(e); }}>
            <Icon name="search" />
            <ProductSearchInput products={products} value={q} onChange={setQ} placeholder="Search products..." ariaLabel="Search products" />
            <button type="submit" className="hp-b hp-find">Find</button>
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
                        <span className="hp-pickup"><Icon name="local_mall" size="sm" /> In-store pickup only · No delivery</span>
                        <span className="hp-ready"><Icon name="schedule" size="sm" /> Ready in ~15 mins</span>
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
                    <Link to="/cart" className="hp-icobtn" aria-label="Cart"><Icon name="shopping_bag" size="lg" /></Link>
                    {user ? (
                        <>
                            <Link to={roleHome[user.role] || '/profile'} className="hp-user"><span className="hp-avatar">{name[0]?.toUpperCase()}</span><span className="hp-user-name">Hi, {name}</span></Link>
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
                    </div>
                </div>
            )}
        </header>
    );
}
