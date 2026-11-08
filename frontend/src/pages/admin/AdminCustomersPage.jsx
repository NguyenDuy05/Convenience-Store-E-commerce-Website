import { useState } from 'react';
import { deleteCustomer, getCustomer, listCustomers, unlockCustomer, updateCustomer } from '../../api/customer.api';
import { Badge, Confirm, Notice, Pager, STATUS_TONE, Tabs, d, dt, money, useAction, useFetch } from '../../components/admin/kit';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const TABS = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'locked', label: 'Locked' }];

function CustomerEditor({ customer, busy, error, onSave, onCancel }) {
  const [form, setForm] = useState({ fullName: customer.fullName || '', phone: customer.phone || '' });
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setErr('Full name is required.');
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim().replace(/[\s.-]/g, ''))) return setErr('Phone number is invalid.');
    setErr(''); onSave(form);
  };
  return <section className="pm-card" aria-labelledby="cust-edit">
    <h2 id="cust-edit">Update Customer</h2>
    <p>Email is the customer's login and cannot be changed here.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Full name<input autoFocus value={form.fullName} maxLength={100} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Phone number<input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label className="pm-wide">Email<input value={customer.email} disabled /></label>
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save changes'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

function CustomerDetail({ id, onClose }) {
  const { data, loading, error } = useFetch(getCustomer, id);
  return <section className="pm-card" aria-label="Customer details">
    <div className="pm-toolbar"><h2 style={{ margin: 0 }}>Customer details</h2><button onClick={onClose}>Close</button></div>
    {loading ? <p role="status">Loading...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
      <dl className="pm-detail">
        <div><dt>Name</dt><dd>{data.fullName}</dd></div>
        <div><dt>Email</dt><dd>{data.email}</dd></div>
        <div><dt>Phone</dt><dd>{data.phone || '—'}</dd></div>
        <div><dt>Status</dt><dd><Badge tone={STATUS_TONE[data.status]}>{data.status}</Badge></dd></div>
        <div><dt>Joined</dt><dd>{d(data.joinedAt)}</dd></div>
        <div><dt>Membership</dt><dd>{data.membership.tier || '—'} · {data.membership.points} pts</dd></div>
        <div><dt>Orders</dt><dd>{data.stats.orderCount} ({data.stats.completedCount} completed)</dd></div>
        <div><dt>Total spent</dt><dd>{money(data.stats.totalSpent)}</dd></div>
        <div><dt>Open complaints</dt><dd>{data.complaints.openCount}</dd></div>
      </dl>
      <h3>Recent orders</h3>
      {data.recentOrders.length ? <div className="pm-table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>
        {data.recentOrders.map((o) => <tr key={o._id}><td>{o.orderCode}</td><td>{o.status}</td><td>{money(o.totalAmount)}</td><td>{dt(o.createdAt)}</td></tr>)}
      </tbody></table></div> : <p className="pm-note">No orders yet.</p>}
    </>}
  </section>;
}

export default function AdminCustomersPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null); // { type: 'view'|'edit'|'unlock'|'delete', customer }
  const [searchError, setSearchError] = useState('');
  const { data, loading, error, reload } = useFetch(listCustomers, { status: status || undefined, q: q || undefined, page, limit: 10 });
  const act = useAction(reload);
  const items = data?.items || [];

  const submitSearch = (e) => {
    e.preventDefault();
    const v = search.trim();
    if (v && v.length < 2) return setSearchError('Enter at least 2 characters to search.');
    setSearchError(''); setQ(v); setPage(1);
  };
  const open = (type, customer) => { act.setError(''); act.setSuccess(''); setPanel({ type, customer }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">CUSTOMERS</span><h1>Manage Customers</h1><p>Search customer accounts, update their details and unlock or remove accounts.</p></div></header>
    <Notice success={act.success} error={!panel ? act.error : ''} />

    {panel?.type === 'view' && <CustomerDetail id={panel.customer._id} onClose={() => setPanel(null)} />}
    {panel?.type === 'edit' && <CustomerEditor customer={panel.customer} busy={act.busy} error={act.error}
      onCancel={() => setPanel(null)} onSave={(f) => run(() => updateCustomer(panel.customer._id, f), 'Customer updated.')} />}
    {panel?.type === 'unlock' && <Confirm title="Unlock account?" confirmLabel="Unlock" busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => unlockCustomer(panel.customer._id), 'Account unlocked.')}>
      <p><strong>{panel.customer.fullName}</strong> will be able to sign in again immediately.</p></Confirm>}
    {panel?.type === 'delete' && <Confirm title="Delete account?" danger confirmLabel="Delete" busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => deleteCustomer(panel.customer._id), 'Customer account deleted.')}>
      <p><strong>{panel.customer.fullName}</strong> ({panel.customer.email}) will no longer be able to sign in. Order history is kept. Accounts with orders in progress cannot be deleted.</p></Confirm>}

    <section className="pm-card" aria-label="Customers list">
      <Tabs tabs={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} />
      <div className="pm-toolbar">
        <form onSubmit={submitSearch}><label>Search customers<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone" /></label><button type="submit">Search</button>
          {q && <button type="button" onClick={() => { setSearch(''); setQ(''); setPage(1); }}>Clear</button>}</form>
      </div>
      {searchError && <p className="pm-error" role="alert">{searchError}</p>}
      {loading ? <p role="status">Loading customers...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
        <p>{data.total} customer{data.total === 1 ? '' : 's'} found</p>
        {!items.length ? <div className="pm-empty"><h2>No customers found</h2><p>Try a different search or filter.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Membership</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {items.map((c) => <tr key={c._id}>
              <td><strong>{c.fullName}</strong><small>Joined {d(c.joinedAt)}</small></td>
              <td>{c.email}<small>{c.phone || 'No phone'}</small></td>
              <td>{c.tier || '—'}</td>
              <td>{c.orderCount}{c.openComplaints > 0 && <small>{c.openComplaints} open complaint(s)</small>}</td>
              <td><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
              <td><div className="pm-row-actions">
                <button onClick={() => open('view', c)}>Details</button>
                <button onClick={() => open('edit', c)}>Update</button>
                {c.status === 'locked' && <button onClick={() => open('unlock', c)}>Unlock</button>}
                <button className="pm-delete" onClick={() => open('delete', c)}>Delete</button>
              </div></td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} busy={act.busy} />
      </>}
    </section>
  </div>;
}
