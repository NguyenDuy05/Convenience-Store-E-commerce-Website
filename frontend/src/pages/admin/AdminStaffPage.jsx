import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { addStaff, getStaff, getStaffActivity, getStaffOrders, listStaff, lockStaff, unlockStaff, updateStaff } from '../../api/staff.api';
import { Badge, Confirm, Notice, Pager, STATUS_TONE, Stat, Tabs, d, dt, money, useAction, useFetch } from '../../components/admin/kit';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const TABS = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'locked', label: 'Locked' }];
// Đổi ngày sang dạng YYYY-MM-DD cho ô chọn ngày
const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

// Form thêm / sửa nhân viên
function StaffEditor({ staff, busy, error, onSave, onCancel }) {
  const editing = !!staff;
  const [f, setF] = useState({
    fullName: staff?.fullName || '', email: staff?.email || '', phone: staff?.phone || '', password: '',
    employeeCode: staff?.employeeCode || '', position: staff?.position || '', hiredAt: toDateInput(staff?.hiredAt),
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.fullName.trim()) return setErr('Full name is required.');
    if (!editing && !EMAIL_RE.test(f.email.trim())) return setErr('Enter a valid email address.');
    if (!editing && f.password.length < 8) return setErr('Password must be at least 8 characters.');
    if (f.phone.trim() && !PHONE_RE.test(f.phone.trim().replace(/[\s.-]/g, ''))) return setErr('Phone number is invalid.');
    if (f.hiredAt && new Date(f.hiredAt) > new Date()) return setErr('Hire date cannot be in the future.');
    setErr(''); onSave(f);
  };
  return <section className="pm-card" aria-labelledby="staff-edit">
    <h2 id="staff-edit">{editing ? 'Update Staff' : 'Add Staff'}</h2>
    <p>{editing ? 'Email and password cannot be changed here.' : 'Share the initial password with the staff member securely. Leave the employee code empty to generate one.'}</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Full name<input autoFocus value={f.fullName} maxLength={100} onChange={set('fullName')} /></label>
        <label>Email<input type="email" value={f.email} disabled={editing} onChange={set('email')} /></label>
        <label>Phone number<input value={f.phone} inputMode="tel" onChange={set('phone')} /></label>
        {!editing && <label>Initial password<input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></label>}
        <label>Employee code<input value={f.employeeCode} disabled={editing} maxLength={20} onChange={set('employeeCode')} placeholder="Auto" /></label>
        <label>Position<input value={f.position} maxLength={80} onChange={set('position')} placeholder="Cashier, Shift lead..." /></label>
        <label>Hire date<input type="date" value={f.hiredAt} max={toDateInput(new Date())} onChange={set('hiredAt')} /></label>
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save staff'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

const ACTION_LABEL = {
  ORDER_STATUS_CHANGE: 'Updated order status', ORDER_CANCEL: 'Cancelled an order', ORDER_ISSUE_CREATE: 'Reported an order issue', ORDER_ISSUE_RESOLVE: 'Resolved an order issue',
  POS_SALE: 'Counter sale', PAYMENT_CASH: 'Collected cash payment', PAYMENT_CARD: 'Collected card payment', PAYMENT_ERROR_HANDLE: 'Handled a payment error', PAYMENT_FAILED: 'Recorded a failed payment',
  SHIFT_CLOCK_IN: 'Checked in to a shift', SHIFT_CLOCK_OUT: 'Checked out of a shift', SHIFT_CLAIM: 'Took a shift', SHIFT_RELEASE: 'Released a shift',
  STOCK_RECEIVE: 'Received stock', STOCK_ADJUST: 'Adjusted stock', STOCKTAKE_CREATE: 'Started a stocktake', STOCKTAKE_COMPLETE: 'Completed a stocktake',
  CUSTOMER_REGISTER_COUNTER: 'Registered a member at the counter', CUSTOMER_VIEW: 'Viewed a customer', CUSTOMER_UPDATE: 'Updated a customer',
  PROFILE_UPDATE: 'Updated own profile', PASSWORD_CHANGE: 'Changed password', PROMOTION_CREATE: 'Created a promotion',
};
const STATUS_TEXT = { pending_payment: 'Pending payment', confirmed: 'Confirmed', preparing: 'Preparing', ready_for_pickup: 'Ready for pickup', completed: 'Completed', cancelled: 'Cancelled', failed: 'Failed' };
// Đổi mã thao tác sang chữ dễ đọc (mã lạ thì viết thường, bỏ gạch dưới)
const actionText = (a) => ACTION_LABEL[a] || a.charAt(0) + a.slice(1).toLowerCase().replace(/_/g, ' ');
// Tóm tắt chi tiết thao tác thành một dòng chữ
function detailText(a) {
  const x = a.detail || {};
  const parts = [];
  if (x.from && x.to) parts.push(`${STATUS_TEXT[x.from] || x.from} → ${STATUS_TEXT[x.to] || x.to}`);
  if (x.reason) parts.push(`Reason: ${x.reason}`);
  if (x.fault) parts.push(x.fault === 'store' ? 'store side' : 'customer side');
  if (x.voucher) parts.push(`voucher ${x.voucher}`);
  if (x.amount != null) parts.push(money(x.amount));
  if (x.total != null) parts.push(money(x.total));
  if (x.note && !x.reason) parts.push(x.note);
  return parts.join(' · ');
}

// Chi tiết một nhân viên: thông tin, số liệu, đơn đã xử lý và nhật ký thao tác
function StaffDetail({ staffId, onClose }) {
  const [tab, setTab] = useState('orders');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const range = { from: from || undefined, to: to || undefined };
  const dateError = from && to && from > to ? 'The start date must be before the end date.' : '';
  const info = useFetch((p) => getStaff(staffId, p), dateError ? {} : range);
  const orders = useFetch((p) => (tab === 'orders' ? getStaffOrders(staffId, p) : Promise.resolve({ data: null })), { ...(dateError ? {} : range), page, limit: 10, tab });
  const log = useFetch((p) => (tab === 'activity' ? getStaffActivity(staffId, p) : Promise.resolve({ data: null })), { page, limit: 10, tab });
  const st = info.data?.staff;
  const n = info.data?.stats;
  return <section className="pm-card" aria-label="Staff details">
    <div className="pm-toolbar sd-head"><h2 style={{ margin: 0 }}>{st ? st.fullName : 'Staff details'}</h2><button onClick={onClose}>Close</button></div>
    {info.loading && !info.data ? <p role="status">Loading...</p> : info.error ? <p className="pm-error" role="alert">{info.error}</p> : st && <>
      <p className="pm-note">{st.employeeCode || '—'} · {st.position || 'No position'} · {st.email}{st.phone ? ` · ${st.phone}` : ''} · hired {d(st.hiredAt)} · last login {dt(st.lastLoginAt)} · <Badge tone={STATUS_TONE[st.status]}>{st.status}</Badge></p>
      <div className="pm-search-row">
        <label>From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label>To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        {(from || to) && <button type="button" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>All time</button>}
      </div>
      {dateError && <p className="pm-error" role="alert">{dateError}</p>}
      {n && <div className="pm-stats sd-stats">
        <Stat label="Orders handled" value={n.handled} /><Stat label="Started preparing" value={n.prepared} /><Stat label="Handed over" value={n.handedOver} tone="ok" />
        <Stat label="Cancelled" value={n.cancelled} tone={n.cancelled ? 'warn' : ''} /><Stat label="Counter sales" value={n.counterSales} /><Stat label="Payments collected" value={money(n.collected)} />
      </div>}
    </>}
    <Tabs value={tab} onChange={(k) => { setTab(k); setPage(1); }} tabs={[{ key: 'orders', label: 'Orders handled' }, { key: 'activity', label: 'Activity log' }]} />
    {tab === 'orders' ? (orders.loading ? <p role="status">Loading orders...</p> : orders.error ? <p className="pm-error" role="alert">{orders.error}</p> : !orders.data?.items.length ? <p className="pm-note">No orders handled in this period.</p> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Status now</th><th className="pm-num">Total</th><th>What this staff did</th></tr></thead><tbody>
        {orders.data.items.map((o) => <tr key={o._id}>
          <td><Link to={`/admin/orders/${o._id}`}><strong>{o.orderCode}</strong></Link><small>{o.source === 'store' ? 'Counter' : 'Online'}</small></td>
          <td>{o.customer || 'Walk-in'}</td>
          <td>{STATUS_TEXT[o.status] || o.status}</td>
          <td className="pm-num">{money(o.totalAmount)}</td>
          <td>{o.steps.map((x, i) => <small key={i}>{dt(x.at)} · {x.label}{x.amount ? ` (${money(x.amount)})` : ''}{x.note && x.action === 'cancelled' ? ` — ${x.note}` : ''}</small>)}</td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} total={orders.data.total} limit={orders.data.limit} onPage={setPage} />
    </>) : (log.loading ? <p role="status">Loading activity...</p> : log.error ? <p className="pm-error" role="alert">{log.error}</p> : !log.data?.items.length ? <p className="pm-note">No recorded activity yet.</p> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Order / target</th><th>Detail</th></tr></thead><tbody>
        {log.data.items.map((a) => <tr key={a._id}>
          <td>{dt(a.createdAt)}</td><td>{actionText(a.action)}</td>
          <td>{a.targetType === 'Order' && a.targetId ? <Link to={`/admin/orders/${a.targetId}`}>{a.detail?.orderCode || 'View order'}</Link> : (a.detail?.orderCode || a.targetType || '—')}</td>
          <td><small>{detailText(a) || '—'}</small></td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} total={log.data.total} limit={log.data.limit} onPage={setPage} />
    </>)}
  </section>;
}

// UC-30 Admin quản lý nhân viên
export default function AdminStaffPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null);
  const [params, setParams] = useSearchParams();
  const viewId = params.get('view');
  // Mở chi tiết nhân viên khi vào bằng link /admin/staff?view=<id> (vd từ trang chi tiết đơn)
  useEffect(() => { if (viewId) setPanel({ type: 'detail', staffId: viewId }); }, [viewId]);
  const { data, loading, error, reload } = useFetch(listStaff, { status: status || undefined, q: q || undefined, page, limit: 10 });
  const act = useAction(reload);
  const items = data?.items || [];
  const open = (type, staff) => { act.setError(''); act.setSuccess(''); setPanel({ type, staff }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">TEAM</span><h1>Manage Staff</h1><p>Create staff accounts, update their details and lock access when needed.</p></div>
      <button className="pm-primary" onClick={() => open('add')}>+ Add Staff</button></header>
    <Notice success={act.success} error={!panel ? act.error : ''} />

    {panel?.type === 'add' && <StaffEditor busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => addStaff(f), 'Staff account created.')} />}
    {panel?.type === 'edit' && <StaffEditor key={panel.staff._id} staff={panel.staff} busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => updateStaff(panel.staff._id, f), 'Staff updated.')} />}
    {panel?.type === 'lock' && <Confirm title="Lock account?" danger confirmLabel="Lock" busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onConfirm={() => run(() => lockStaff(panel.staff._id, {}), 'Account locked.')}>
      <p><strong>{panel.staff.fullName}</strong> will not be able to sign in until the account is unlocked.</p></Confirm>}
    {panel?.type === 'unlock' && <Confirm title="Unlock account?" confirmLabel="Unlock" busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onConfirm={() => run(() => unlockStaff(panel.staff._id, {}), 'Account unlocked.')}>
      <p><strong>{panel.staff.fullName}</strong> will be able to sign in again.</p></Confirm>}
    {panel?.type === 'detail' && <StaffDetail key={panel.staffId} staffId={panel.staffId} onClose={() => { setPanel(null); if (viewId) setParams({}); }} />}

    <section className="pm-card" aria-label="Staff list">
      <Tabs tabs={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} />
      <div className="pm-toolbar"><form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
        <label>Search staff<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, phone or code" /></label><button type="submit">Search</button>
        {q && <button type="button" onClick={() => { setSearch(''); setQ(''); setPage(1); }}>Clear</button>}</form></div>
      {loading ? <p role="status">Loading staff...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
        <p>{data.total} staff member{data.total === 1 ? '' : 's'}</p>
        {!items.length ? <div className="pm-empty"><h2>No staff found</h2><p>Add a staff member or adjust the search.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Staff</th><th>Contact</th><th>Position</th><th>Last login</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {items.map((s) => <tr key={s._id}>
              <td><strong>{s.fullName}</strong><small>{s.employeeCode || '—'} · hired {d(s.hiredAt)}</small></td>
              <td>{s.email}<small>{s.phone || 'No phone'}</small></td>
              <td>{s.position || '—'}</td><td>{dt(s.lastLoginAt)}</td>
              <td><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
              <td><div className="pm-row-actions">
                <button onClick={() => open('edit', s)}>Update</button>
                <button onClick={() => { act.setError(''); act.setSuccess(''); setPanel({ type: 'detail', staffId: s._id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Details</button>
                {s.status === 'locked' ? <button onClick={() => open('unlock', s)}>Unlock</button> : <button className="pm-delete" onClick={() => open('lock', s)}>Lock</button>}
              </div></td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} busy={act.busy} />
      </>}
    </section>
  </div>;
}
