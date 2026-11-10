import { useCallback, useEffect, useState } from 'react';
import * as api from '../../api/notification.api';
import Icon from '../../components/common/Icon';
import { notificationTypes, useNotifications } from '../../context/NotificationContext';
import '../../styles/notifications.css';

const audiences = { all: "All accounts", customer: "Customer", staff: "Staff", admin: "Administrators", users: "Individual recipients" };
const statuses = { draft: "Draft", published: "Published", archived: "Archived" };
const blank = () => ({ title: '', message: '', type: 'general', audience: 'all', link: '', publishedAt: '', expiresAt: '' });
const localTime = (value) => { if (!value) return ''; const d = new Date(value); return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const settingLabels = {
  orders: ["Customer orders", "Order confirmations, status changes and payment expiry."],
  payments: ["Payment results", "Successful, failed and payment-review notifications."],
  staffOrders: ["New orders for staff and admins", "Notify the store team when a customer places an online order."],
  vouchers: ["New vouchers", "Notify customers when a discount code is activated."],
  promotions: ["New promotions", "Notify customers when a promotion is activated."],
};

export default function AdminNotificationsPage() {
  const { refresh } = useNotifications();
  const [tab, setTab] = useState('messages');
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState(''), [audience, setAudience] = useState(''), [page, setPage] = useState(1);
  const [query, setQuery] = useState(''), [search, setSearch] = useState('');
  const [form, setForm] = useState(blank), [editing, setEditing] = useState(null), [composing, setComposing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const load = useCallback(async (signal) => {
    setLoading(true);
    try { const response = await api.listManagedNotifications({ status: status || undefined, audience: audience || undefined, page, q: search }); if (!signal?.aborted) setData(response.data); }
    catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || "Could not load the list."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [status, audience, page, search]);
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);
  useEffect(() => { let alive = true; api.getNotificationSettings().then((r) => { if (alive) setSettings(r.data); }).catch(() => { if (alive) setError("Could not load notification settings."); }); return () => { alive = false; }; }, []);
  const field = (key) => (e) => setForm((old) => ({ ...old, [key]: e.target.value }));
  const run = async (fn, message) => {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); setSuccess(message); await Promise.all([load(), refresh()]); }
    catch (err) { setError(err.response?.data?.message || "Could not save changes. Please try again."); }
    finally { setBusy(false); }
  };
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const body = { ...form, publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null };
      if (editing) await api.updateNotification(editing, body); else await api.createNotification(body);
      setComposing(false); setEditing(null); setForm(blank());
    }, "Draft saved. Select Publish to send it to your chosen audience.");
  };
  return <div className="notification-admin notification-page">
    <header className="ui-page-heading"><div><span className="ui-eyebrow">STAY CONNECTED</span><h1>Manage notifications</h1><p>Reach the right audience and automatically share important updates.</p></div><button className="ui-button" onClick={() => { setTab('messages'); setComposing(true); setEditing(null); setForm(blank()); setError(''); setSuccess(''); }}><Icon name="add" />Create notification</button></header>
    <div className="ui-tabs notification-admin-tabs"><button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>Notification list</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Icon name="tune" size="sm" />Automatic settings</button></div>
    {error && <div className="ui-alert error" role="alert">{error}<button onClick={async () => { setError(''); load(); try { setSettings((await api.getNotificationSettings()).data); } catch { setError("Could not load notification settings."); } }}>Try again</button></div>}
    {success && <div className="ui-alert success" role="status">{success}</div>}
    {tab === 'settings' ? <section className="ui-panel notification-settings"><h2>Automatic in-app notifications</h2><p>These settings apply to new notifications. Transactional email uses its own mail configuration.</p>{settings ? <><div>{Object.entries(settingLabels).map(([key, [title, description]]) => <label className="notification-setting" key={key}><span><b>{title}</b><small>{description}</small></span><input type="checkbox" role="switch" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} disabled={busy} /></label>)}</div><button className="ui-button" disabled={busy} onClick={() => run(async () => { const body = Object.fromEntries(Object.keys(settingLabels).map((key) => [key, settings[key]])); setSettings((await api.saveNotificationSettings(body)).data); }, "Notification settings saved.")}>Save settings</button></> : <p>Loading settings…</p>}<div className="notification-settings-note"><Icon name="event" /><p><b>Event announcements</b><br />Create a notification, choose Events, select an audience and set a publication time. You can include a link to an event or promotion.</p></div></section> : <>
      {composing && <section className="ui-panel notification-composer" aria-label="Create notification"><header><h2>{editing ? "Edit draft" : "New notification"}</h2><button className="ui-button secondary" disabled={busy} onClick={() => setComposing(false)}>Close</button></header><form onSubmit={submit}>
        <label>Title<input value={form.title} maxLength={160} required onChange={field('title')} placeholder="Example: Weekend offers for members" /></label>
        <div className="ui-form-grid"><label>Notification type<select value={form.type} onChange={field('type')}>{['general', 'event', 'voucher', 'promotion'].map((type) => <option key={type} value={type}>{notificationTypes[type]}</option>)}</select></label><label>Recipient audience<select value={form.audience} onChange={field('audience')}>{Object.entries(audiences).filter(([key]) => key !== 'users').map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label></div>
        <label>Message<textarea value={form.message} maxLength={4000} rows={5} required onChange={field('message')} placeholder="The message your audience will receive…" /></label>
        <label>Website link (optional)<input value={form.link} maxLength={500} onChange={field('link')} placeholder="/promotions" /></label>
        <div className="ui-form-grid"><label>Publish at (leave blank to publish immediately)<input type="datetime-local" value={form.publishedAt} onChange={field('publishedAt')} /></label><label>Expires at (optional)<input type="datetime-local" value={form.expiresAt} min={form.publishedAt || undefined} onChange={field('expiresAt')} /></label></div>
        <footer><span>Drafts are visible only to admins until published.</span><button className="ui-button" disabled={busy} type="submit">{busy ? "Saving…" : "Save draft"}</button></footer>
      </form></section>}
      <div className="notification-filters"><form onSubmit={(e) => { e.preventDefault(); setSearch(query.trim()); setPage(1); }}><label>Search notifications<input value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} placeholder="Title or message" /></label><button className="ui-button secondary" type="submit"><Icon name="search" />Search</button></form><label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{Object.entries(statuses).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label>Audience<select value={audience} onChange={(e) => { setAudience(e.target.value); setPage(1); }}><option value="">All audiences</option>{Object.entries(audiences).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><button className="ui-button secondary" disabled={loading} onClick={() => load()}><Icon name="refresh" />Refresh</button></div>
      {loading ? <div className="ui-empty" role="status">Loading notifications…</div> : !data.items.length ? <div className="ui-empty"><Icon name="campaign" size="xl" /><h2>No matching notifications</h2><p>Create a notification or adjust the filters.</p></div> : <div className="notification-managed-list">{data.items.map((item) => <article className="ui-panel notification-managed" key={item._id}><div><div className="notification-card-meta"><span>{notificationTypes[item.type]}</span><span>{audiences[item.audience]}</span><b className={`notification-status ${item.status}`}>{item.status === 'published' && new Date(item.publishedAt) > new Date() ? "Scheduled" : item.status === 'published' && item.expiresAt && new Date(item.expiresAt) <= new Date() ? "Expired" : statuses[item.status]}</b></div><h2>{item.title}</h2><p>{item.message}</p><small>{item.publishedAt && `Published: ${new Date(item.publishedAt).toLocaleString('en-GB')}`}{item.expiresAt && ` · Expires: ${new Date(item.expiresAt).toLocaleString('en-GB')}`}</small></div><div className="notification-managed-actions">{item.status === 'draft' && <><button className="ui-button secondary" disabled={busy} onClick={() => { setForm({ ...item, publishedAt: localTime(item.publishedAt), expiresAt: localTime(item.expiresAt) }); setEditing(item._id); setComposing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit draft</button><button className="ui-button" disabled={busy} onClick={() => run(() => api.publishNotification(item._id), "Notification published with your selected schedule.")}><Icon name="send" size="sm" />Publish</button></>}{item.status !== 'archived' && <button className="ui-button secondary" disabled={busy} onClick={() => run(() => api.archiveNotification(item._id), "Notification archived.")}><Icon name="archive" size="sm" />Archive</button>}</div></article>)}</div>}
      {data.total > 20 && <nav className="ui-pagination" aria-label="Admin notification pagination"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Trang {page} / {Math.ceil(data.total / 20)}</span><button disabled={page * 20 >= data.total || loading} onClick={() => setPage(page + 1)}>Sau</button></nav>}
    </>}
  </div>;
}
