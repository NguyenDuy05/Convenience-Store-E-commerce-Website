import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import '../../styles/style.css';
import '../../styles/admin-products.css';
import '../../styles/dashboard.css';
import NotificationBell from '../common/NotificationBell';
import PortalUserMenu from './PortalUserMenu';
import { BRAND_NAME, LOGO_IMAGE } from '../home/homeConfig';

const ShellContext = createContext(false);

const EXTRA = { new: 'Add', edit: 'Edit' };
// Tự tạo breadcrumb từ menu và đường dẫn hiện tại
function autoCrumbs(groups, pathname) {
    const items = groups.flatMap((g) => g.items);
    const hit = items.filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
    if (!hit) return [];
    const rest = pathname.slice(hit.to.length).split('/').filter(Boolean);
    const out = [hit.label];
    if (rest.length) out.push(rest.length === 1 ? (EXTRA[rest[0]] || 'Details') : (EXTRA[rest[rest.length - 1]] || 'Details'));
    return out;
}

// Khung trang staff / admin: sidebar, thanh trên cùng (Dashboard, chuông, avatar)
export default function PortalShell({ tag, roleLabel, groups, profilePath, crumbs, children }) {
    const nested = useContext(ShellContext);
    const { logout } = useAuth();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => { setMenuOpen(false); }, [pathname]);
    useEffect(() => {
        if (!menuOpen || nested) return undefined;
        const old = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const escape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', escape);
        return () => { document.body.style.overflow = old; window.removeEventListener('keydown', escape); };
    }, [menuOpen, nested]);
    if (nested) return <>{children}</>;
    const trail = autoCrumbs(groups, pathname);
    const shown = trail.length ? trail : (crumbs || []);

    return (
        <ShellContext.Provider value>
            <div className={`review-dashboard portal-shell${menuOpen ? ' menu-open' : ''}`}>
                <a className="ui-skip-link" href="#portal-content">Skip to main content</a>
                {menuOpen && <button className="portal-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
                <aside id="portal-menu" className="review-sidebar">
                    <Link to="/" className="review-brand" aria-label={`${BRAND_NAME} home`} title="Go to store home"><span className="review-brand-mark">{LOGO_IMAGE ? <img src={LOGO_IMAGE} alt="" /> : <span className="review-material-icon">storefront</span>}</span><b>{BRAND_NAME}</b><small>{tag}</small></Link>
                    <button className="portal-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><span className="review-material-icon">close</span></button>
                    <nav className="review-side-nav">
                        {groups.map((group) => (
                            <section key={group.title}>
                                <h2>{group.title}</h2>
                                {group.items.map((item) => (
                                    <NavLink key={item.to} to={item.to} end={item.end}
                                        onClick={() => setMenuOpen(false)} className={({ isActive }) => `review-nav-link${isActive ? ' active' : ''}`}>
                                        <span className="review-material-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </section>
                        ))}
                    </nav>
                    <div className="review-side-bottom">
                        <NavLink to={profilePath} className={({ isActive }) => `review-nav-link${isActive ? ' active' : ''}`}><span className="review-material-icon">account_circle</span><span>Profile</span></NavLink>
                        <button className="review-nav-link review-logout" onClick={logout}><span className="review-material-icon">logout</span><span>Logout</span></button>
                    </div>
                </aside>
                <div className="review-app-area">
                    <header className="review-topbar">
                        <div className="review-topbar-left">
                            <button className="portal-menu-toggle" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="portal-menu" onClick={() => setMenuOpen(!menuOpen)}><span className="review-material-icon">menu</span></button>
                            <div className="review-top-crumb">
                                <span>Quick Retail Ops</span>
                                {shown.map((c) => <span key={c} className="ap-crumb-part"><span className="review-material-icon">chevron_right</span>{c}</span>)}
                            </div>
                        </div>
                        <div className="review-topbar-right">
                            <NavLink to={groups[0].items[0].to} end className={({ isActive }) => `dash-trigger${isActive ? ' on' : ''}`} aria-label="Dashboard" title="Dashboard"><span className="review-material-icon">space_dashboard</span></NavLink>
                            <NotificationBell />
                            <PortalUserMenu profilePath={profilePath} roleLabel={roleLabel} />
                        </div>
                    </header>
                    <main id="portal-content" tabIndex={-1} className="review-admin-content">{children}</main>
                </div>
            </div>
        </ShellContext.Provider>
    );
}
