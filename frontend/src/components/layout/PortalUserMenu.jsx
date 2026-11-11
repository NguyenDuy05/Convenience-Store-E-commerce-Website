import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import UserAvatarIcon from '../common/UserAvatarIcon';

// Avatar + menu tài khoản trên thanh trên cùng của staff / admin
export default function PortalUserMenu({ profilePath, roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="portal-user" ref={ref}>
      <button type="button" className={`portal-avatar-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open}>
        <UserAvatarIcon size={34} />
      </button>
      {open && (
        <div className="portal-user-menu" role="menu">
          <div className="portal-user-head"><b>{user?.fullName || roleLabel}</b><small>{user?.email}</small><span>{roleLabel}</span></div>
          <Link to={profilePath} role="menuitem" className="portal-user-item" onClick={() => setOpen(false)}><span className="review-material-icon">account_circle</span>Profile</Link>
          <button type="button" role="menuitem" className="portal-user-item out" onClick={() => { setOpen(false); logout(); navigate('/'); }}><span className="review-material-icon">logout</span>Log out</button>
        </div>
      )}
    </div>
  );
}
