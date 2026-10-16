import { Link, NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function NavBar({ links, brand = 'Convenience Store' }) {
  const { user, logout } = useAuth();
  return (
    <header className="navbar">
      <Link to="/" className="brand">{brand}</Link>
      <nav>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={['/', '/staff', '/admin'].includes(l.to)}>{l.label}</NavLink>
        ))}
      </nav>
      <div className="auth">
        {user ? (
          <>
            <span>{user.fullName}</span>
            <button onClick={logout}>Đăng xuất</button>
          </>
        ) : (
          <>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </>
        )}
      </div>
    </header>
  );
}
