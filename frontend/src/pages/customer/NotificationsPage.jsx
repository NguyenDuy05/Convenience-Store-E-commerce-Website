import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api/notification.api';
import { useNotifications, notificationTypes, notificationIcons } from '../../context/NotificationContext';
import Icon from '../../components/common/Icon';
import '../../styles/notifications.css';

// Trang thông báo của người dùng
export default function NotificationsPage() {
  const { refresh } = useNotifications();
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, unreadCount: 0 });
  const [page, setPage] = useState(1), [type, setType] = useState(''), [unread, setUnread] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async (signal) => {
    setLoading(true);
    try { const response = await api.listNotifications({ page, type: type || undefined, unread: unread ? 'true' : undefined }); if (!signal?.aborted) { setData(response.data); setError(''); } }
    catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || "Could not load notifications."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, type, unread]);
  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    const tick = () => { if (!document.hidden) load(controller.signal); };
    const timer = setInterval(tick, 20000); window.addEventListener('focus', tick);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [load]);
  const act = async (item, open = false) => {
    setBusy(true);
    try { await api.readNotification(item._id); await Promise.all([load(), refresh()]); if (open && item.link) navigate(item.link); }
    catch (err) { setError(err.response?.data?.message || "Could not save your changes."); }
    finally { setBusy(false); }
  };
  return <div className="notification-page">
    <header className="ui-page-heading"><div><span className="ui-eyebrow">YOUR INBOX</span><h1>Notifications <span className="ui-count">{data.unreadCount} unread</span></h1><p>Order updates, store announcements and offers for you.</p></div><button className="ui-button secondary" disabled={busy || !data.unreadCount} onClick={async () => { setBusy(true); try { await api.readAllNotifications(); await Promise.all([load(), refresh()]); } catch { setError("Could not save your changes."); } finally { setBusy(false); } }}><Icon name="done_all" />Mark all read</button></header>
    <div className="notification-filters"><div className="ui-tabs"><button className={!unread ? 'active' : ''} onClick={() => { setUnread(false); setPage(1); }}>All</button><button className={unread ? 'active' : ''} onClick={() => { setUnread(true); setPage(1); }}>Unread</button></div><label>Notification type<select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All types</option>{Object.entries(notificationTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="ui-button secondary" onClick={() => load()} disabled={loading}><Icon name="refresh" />Refresh</button></div>
    {error && <div className="ui-alert error" role="alert">{error}<button onClick={() => load()}>Try again</button></div>}
    {loading && !data.items.length ? <div className="ui-empty" role="status">Loading notifications…</div> : !data.items.length ? <div className="ui-empty"><Icon name="notifications_none" size="xl" /><h2>{unread ? "You're all caught up" : "No notifications yet"}</h2><p>Notifications for your account will appear here.</p></div> : <div className="notification-list" aria-busy={loading}>{data.items.map((item) => <article key={item._id} className={`notification-card ${item.readAt ? '' : 'unread'}`}>
      <span className={`notification-icon ${item.type}`}><Icon name={notificationIcons[item.type]} /></span><div className="notification-card-body"><div className="notification-card-meta"><span>{notificationTypes[item.type]}</span><time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleString('en-GB')}</time>{!item.readAt && <b>Unread</b>}</div><h2>{item.title}</h2><p>{item.message}</p><div className="notification-card-actions">{item.link && <button className="ui-button" disabled={busy} onClick={() => act(item, true)}>{item.type === 'order' ? "Track order" : "View details"}<Icon name="arrow_forward" size="sm" /></button>}{!item.readAt && <button className="ui-button secondary" disabled={busy} onClick={() => act(item)}>Mark as read</button>}</div></div>
    </article>)}</div>}
    {data.total > 20 && <nav className="ui-pagination" aria-label="Notification pagination"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Trang {page} / {Math.ceil(data.total / 20)}</span><button disabled={page * 20 >= data.total || loading} onClick={() => setPage(page + 1)}>Sau</button></nav>}
  </div>;
}
