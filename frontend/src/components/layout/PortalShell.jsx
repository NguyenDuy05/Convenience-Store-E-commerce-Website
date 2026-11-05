import { createContext, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import '../../styles/style.css';           // style khung (review-*) dùng chung với trang Reviews / Products
import '../../styles/admin-products.css';
import '../../styles/dashboard.css';

// Khung giao diện QUICK dùng chung cho Admin và Staff: sidebar + topbar giống trang /admin/products.
// Lồng nhau an toàn: nếu trang con lại bọc <AdminShell> thì chỉ render nội dung (không tạo khung thứ hai).
const ShellContext = createContext(false);

const EXTRA = { new: 'Add', edit: 'Edit' };
function autoCrumbs(groups, pathname) {
    const items = groups.flatMap((g) => g.items);
    const hit = items.filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
    if (!hit) return [];
    const rest = pathname.slice(hit.to.length).split('/').filter(Boolean);
    const out = [hit.label];
    if (rest.length) out.push(rest.length === 1 ? (EXTRA[rest[0]] || 'Details') : (EXTRA[rest[rest.length - 1]] || 'Details'));
    return out;
}

export default function PortalShell({ tag, roleLabel, groups, profilePath, crumbs, children }) {
    const nested = useContext(ShellContext);
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    if (nested) return <>{children}</>;
    const trail = autoCrumbs(groups, pathname);
    const shown = trail.length ? trail : (crumbs || []);

    return (
        <ShellContext.Provider value>
            <div className="review-dashboard">
                <aside className="review-sidebar">
                    <div className="review-brand"><span className="review-brand-mark">Q</span><b>QUICK</b><small>{tag}</small></div>
                    <nav className="review-side-nav">
                        {groups.map((group) => (
                            <section key={group.title}>
                                <h2>{group.title}</h2>
                                {group.items.map((item) => (
                                    <NavLink key={item.to} to={item.to} end={item.end}
                                        className={({ isActive }) => `review-nav-link${isActive ? ' active' : ''}`}>
                                        <span className="review-material-icon">{item.icon}</span><span>{item.label}</span>
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
                            <div className="review-top-crumb">
                                <span>Quick Retail Ops</span>
                                {shown.map((c) => <span key={c} className="ap-crumb-part"><span className="review-material-icon">chevron_right</span>{c}</span>)}
                            </div>
                        </div>
                        <div className="review-topbar-right">
                            <div className="review-admin-user"><div><b>{user?.fullName || roleLabel}</b><small>{roleLabel}</small></div><span className="review-user-avatar"><span className="review-material-icon">person</span></span></div>
                        </div>
                    </header>
                    <main className="review-admin-content">{children}</main>
                </div>
            </div>
        </ShellContext.Provider>
    );
}