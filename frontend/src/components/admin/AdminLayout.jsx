import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const NAV = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/products', label: 'Products', icon: 'inventory_2' },
    { to: '/admin/categories', label: 'Categories', icon: 'category' },
    { to: '/admin/promotions', label: 'Promotions', icon: 'local_offer' },
    { to: '/admin/orders', label: 'Orders', icon: 'receipt_long' },
    { to: '/admin/stores', label: 'Stores', icon: 'storefront' },
    { to: '/admin/staff', label: 'Staff', icon: 'badge' },
    { to: '/admin/customers', label: 'Customers', icon: 'group' },
];

export default function AdminLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const onLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const userName = user?.fullName?.split(/\s+/).pop() || 'Admin';

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <span className="admin-brand-text">Admin</span>
                    <span className="admin-badge">Portal</span>
                </div>

                <nav className="admin-nav">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-icon" aria-hidden="true">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="admin-nav-link logout" onClick={onLogout}>
                        <span className="admin-icon" aria-hidden="true">
                            logout
                        </span>
                        <span>Logout</span>
                    </button>
                    <div className="admin-version">v2.4</div>
                </div>
            </aside>

            {/* Top Bar */}
            <header className="admin-topbar">
                <div className="admin-topbar-left">
                    <span className="admin-breadcrumb">Admin Panel</span>
                </div>

                <div className="admin-topbar-right">
                    <button className="admin-icon-btn" aria-label="Notifications">
                        <span className="admin-icon" aria-hidden="true">
                            notifications
                        </span>
                        <span className="admin-notif-badge">1</span>
                    </button>

                    <div className="admin-user-menu">
                        <div className="admin-avatar">{userName[0]?.toUpperCase()}</div>
                        <div className="admin-user-info">
                            <span className="admin-user-name">{userName}</span>
                            <span className="admin-user-role">Administrator</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="admin-main">{children}</main>
        </div>
    );
}