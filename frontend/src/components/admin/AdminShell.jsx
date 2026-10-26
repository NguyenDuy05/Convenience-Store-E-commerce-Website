import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import '../../styles/style.css';        // chứa style khung admin (review-*) dùng chung với trang Reviews
import '../../styles/admin-products.css';

// Khung admin theo thiết kế QUICK (sidebar + topbar). Dùng cho các trang admin mới: <AdminShell crumbs={['Products']}>...</AdminShell>
const NAV_GROUPS = [
    { title: 'Main', items: [{ to: '/admin', label: 'Dashboard', icon: 'space_dashboard' }] },
    {
        title: 'Management', items: [
            { to: '/admin/customers', label: 'Customers', icon: 'group' },
            { to: '/admin/staff', label: 'Staff', icon: 'badge' },
            { to: '/admin/stores', label: 'Stores', icon: 'storefront' },
            { to: '/admin/products', label: 'Products', icon: 'inventory_2' },
            { to: '/admin/categories', label: 'Categories', icon: 'category' },
            { to: '/admin/inventory', label: 'Inventory', icon: 'warehouse' },
        ]
    },
    {
        title: 'Operations', items: [
            { to: '/admin/orders', label: 'Orders', icon: 'shopping_bag' },
            { to: '/admin/transactions', label: 'Transactions', icon: 'receipt_long' },
            { to: '/admin/promotions', label: 'Promotions', icon: 'campaign' },
            { to: '/admin/discount-codes', label: 'Discount Codes', icon: 'sell' },
        ]
    },
    {
        title: 'Customer Programs', items: [
            { to: '/admin/membership', label: 'Membership', icon: 'card_membership' },
            { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
        ]
    },
    { title: 'Finance', items: [{ to: '/admin/payments', label: 'Payments', icon: 'payments' }] },
];

export default function AdminShell({ crumbs = [], children }) {
    const { user, logout } = useAuth();
    return (
        <div className="review-dashboard">
            <aside className="review-sidebar">
                <div className="review-brand"><span className="review-brand-mark">Q</span><b>QUICK</b><small>ADMIN</small></div>
                <nav className="review-side-nav">
                    {NAV_GROUPS.map((group) => (
                        <section key={group.title}>
                            <h2>{group.title}</h2>
                            {group.items.map((item) => (
                                <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
                                    className={({ isActive }) => `review-nav-link${isActive ? ' active' : ''}`}>
                                    <span className="review-material-icon">{item.icon}</span><span>{item.label}</span>
                                </NavLink>
                            ))}
                        </section>
                    ))}
                </nav>
                <div className="review-side-bottom">
                    <NavLink to="/admin/profile" className="review-nav-link"><span className="review-material-icon">account_circle</span><span>Profile</span></NavLink>
                    <button className="review-nav-link review-logout" onClick={logout}><span className="review-material-icon">logout</span><span>Logout</span></button>
                </div>
            </aside>
            <div className="review-app-area">
                <header className="review-topbar">
                    <div className="review-topbar-left">
                        <div className="review-top-crumb">
                            <span>Quick Retail Ops</span>
                            {crumbs.map((c) => <span key={c} className="ap-crumb-part"><span className="review-material-icon">chevron_right</span>{c}</span>)}
                        </div>
                    </div>
                    <div className="review-topbar-right">
                        <div className="review-admin-user"><div><b>{user?.fullName || 'Admin'}</b><small>Administrator</small></div><span className="review-user-avatar"><span className="review-material-icon">person</span></span></div>
                    </div>
                </header>
                <main className="review-admin-content">{children}</main>
            </div>
        </div>
    );
}