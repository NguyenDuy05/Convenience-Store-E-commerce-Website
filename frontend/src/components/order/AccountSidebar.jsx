import { NavLink, useNavigate } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/account-sidebar.css';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';

const links = [
  { to: '/profile', label: 'Hồ sơ cá nhân', icon: 'person' },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: 'receipt_long', badge: true },
  { to: '/addresses', label: 'Địa chỉ', icon: 'location_on' },
  { to: '/reviews', label: 'Đánh giá của tôi', icon: 'rate_review' },
  { to: '/membership', label: 'Thành viên & điểm', icon: 'stars' },
  { to: '/support', label: 'Hỗ trợ', icon: 'help_center' },
];

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

// Cột tài khoản bên trái trang đơn hàng. activeCount = số đơn đang xử lý (hiện trên mục "Đơn hàng").
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
        <nav className="aside-nav" aria-label="Menu tài khoản">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `aside-link ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
                <>
                  <span className="aside-link-label"><Icon name={l.icon} fill={isActive} />{l.label}</span>
                  {l.badge && activeCount > 0
                    ? <span className="aside-badge">{activeCount} đang xử lý</span>
                    : <Icon name="chevron_right" size="md" />}
                </>
              )}
            </NavLink>
          ))}
          <div className="aside-sep" />
          <button type="button" className="aside-logout" onClick={onLogout}>
            <Icon name="logout" />Đăng xuất
          </button>
        </nav>
      </div>

      <div className="aside-help">
        <div className="aside-help-title"><Icon name="electric_bolt" size="lg" /><h4>Nhận hàng tại cửa hàng</h4></div>
        <ol>
          <li>Đặt hàng và thanh toán online hoặc chọn trả tiền mặt.</li>
          <li>Chờ đơn chuyển sang <b>Sẵn sàng nhận hàng</b>.</li>
          <li>Đến cửa hàng, đọc <b>mã đơn</b> cho nhân viên để nhận hàng.</li>
        </ol>
      </div>
    </aside>
  );
}
