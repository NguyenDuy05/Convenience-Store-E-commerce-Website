import { NavLink, useNavigate } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/account-sidebar.css';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';

const links = [
  { to: '/profile', label: "Profile", icon: 'person' },
  { to: '/orders', label: "My orders", icon: 'receipt_long', badge: true, end: true },
  { to: '/orders/history', label: "Order history", icon: 'history' },
  { to: '/notifications', label: "Notifications", icon: 'notifications' },
  { to: '/addresses', label: "Addresses", icon: 'location_on' },
  { to: '/reviews', label: "My reviews", icon: 'rate_review' },
  { to: '/wallet', label: 'My wallet', icon: 'account_balance_wallet' },
  { to: '/membership', label: "Membership & points", icon: 'stars' },
  { to: '/support', label: "Support", icon: 'help_center' },
];

// Chữ cái đầu của họ tên (cho avatar)
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

// Cột menu tài khoản bên trái các trang của khách
export default function AccountSidebar({ activeCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="aside">
      <div className="aside-card">
        <div className="aside-user">
          <div className="aside-avatar">{initials(user?.fullName)}</div>
          <div className="aside-user-text">
            <h2 title={user?.fullName}>{user?.fullName}</h2>
            <p title={user?.email}>{user?.email}</p>
          </div>
        </div>
        <nav className="aside-nav" aria-label="Account navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `aside-link ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
                <>
                  <span className="aside-link-label"><Icon name={l.icon} fill={isActive} />{l.label}</span>
                  {l.badge && activeCount > 0
                    ? <span className="aside-badge">{activeCount} in progress</span>
                    : <Icon name="chevron_right" size="md" />}
                </>
              )}
            </NavLink>
          ))}
          <div className="aside-sep" />
          <button type="button" className="aside-logout" onClick={onLogout}>
            <Icon name="logout" />Log out
          </button>
        </nav>
      </div>

      <div className="aside-help">
        <div className="aside-help-title"><Icon name="electric_bolt" size="lg" /><h4>Store pickup</h4></div>
        <ol>
          <li>Place your order using wallet credit and VNPay.</li>
          <li>Wait until the order is <b>Ready for pickup</b>.</li>
          <li>Visit the store and give your <b>order code</b> to a staff member to collect your order.</li>
        </ol>
      </div>
    </aside>
  );
}
