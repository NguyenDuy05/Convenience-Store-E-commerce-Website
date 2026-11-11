import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useNotifications, notificationPath, notificationIcons } from '../../context/NotificationContext';
import Icon from './Icon';
import '../../styles/notifications.css';

// Chuông thông báo: số chưa đọc + danh sách thông báo mới
export default function NotificationBell() {
  const { user } = useAuth();
  const { items, unreadCount, loading, error, refresh, markRead, markAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const escape = (e) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  if (!user) return null;
  const visit = async (item) => {
    setActionError(''); setBusy(true);
    try { if (!item.readAt) await markRead(item._id); setOpen(false); navigate(item.link || notificationPath(user.role)); }
    catch { setActionError("Could not mark this notification as read. Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="notification-bell" ref={root}>
    <button ref={trigger} type="button" className="notification-trigger" aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={open} aria-controls="notification-popover" onClick={() => { setOpen(!open); setActionError(''); if (!open) refresh(); }}>
      <Icon name="notifications" />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section id="notification-popover" className="notification-popover" aria-label="Latest notifications">
      <header><div><b>Notifications</b><small>{unreadCount} unread</small></div><button type="button" disabled={!unreadCount || busy} onClick={async () => { setBusy(true); try { await markAll(); } catch { setActionError("Could not save your changes."); } finally { setBusy(false); } }}>Mark all read</button></header>
      {(error || actionError) && <p className="notification-error" role="alert">{actionError || error} <button type="button" onClick={refresh}>Try again</button></p>}
      {loading && !items.length ? <p className="notification-empty">Loading…</p> : !items.length ? <p className="notification-empty">You have no new notifications.</p> : <div className="notification-preview-list">{items.map((item) => <button type="button" disabled={busy} key={item._id} className={`notification-preview ${item.readAt ? '' : 'unread'}`} onClick={() => visit(item)}>
        <span className={`notification-icon ${item.type}`}><Icon name={notificationIcons[item.type] || 'notifications'} /></span><span><b>{item.title}</b><span className="notification-snippet">{item.message}</span><small>{new Date(item.publishedAt).toLocaleString('en-GB')}</small></span>{!item.readAt && <i aria-label="Unread" />}
      </button>)}</div>}
      <footer><Link to={notificationPath(user.role)} onClick={() => setOpen(false)}>View all notifications <Icon name="arrow_forward" size="sm" /></Link></footer>
    </section>}
  </div>;
}
