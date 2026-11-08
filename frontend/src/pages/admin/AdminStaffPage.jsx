import { useState } from 'react';
import { addStaff, getStaffActivity, listStaff, lockStaff, unlockStaff, updateStaff } from '../../api/staff.api';
import { Badge, Confirm, Notice, Pager, STATUS_TONE, Tabs, d, dt, useAction, useFetch } from '../../components/admin/kit';

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const TABS = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'locked', label: 'Locked' }];
const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

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

function Activity({ staff, onClose }) {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch((p) => getStaffActivity(staff._id, p), { page, limit: 10 });
  return <section className="pm-card" aria-label="Staff activity">
    <div className="pm-toolbar"><h2 style={{ margin: 0 }}>Activity history · {staff.fullName}</h2><button onClick={onClose}>Close</button></div>
    {loading ? <p role="status">Loading...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.items.length ? <p className="pm-note">No recorded activity yet.</p> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>
        {data.items.map((a) => <tr key={a._id}><td>{dt(a.createdAt)}</td><td>{a.action}</td><td>{a.targetType || '—'}</td><td><small>{a.detail ? JSON.stringify(a.detail) : ''}</small></td></tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </section>;
}

export default function AdminStaffPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null); // { type: 'add'|'edit'|'lock'|'unlock'|'activity', staff }
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
    {panel?.type === 'activity' && <Activity staff={panel.staff} onClose={() => setPanel(null)} />}

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
                <button onClick={() => open('activity', s)}>Activity</button>
                {s.status === 'locked' ? <button onClick={() => open('unlock', s)}>Unlock</button> : <button className="pm-delete" onClick={() => open('lock', s)}>Lock</button>}
              </div></td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} busy={act.busy} />
      </>}
    </section>
  </div>;
}
