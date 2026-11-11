import { useState } from 'react';
import { activateDiscountCode, createDiscountCode, deleteDiscountCode, listDiscountCodes, suspendDiscountCode, updateDiscountCode } from '../../api/discountCode.api';
import { Badge, Confirm, Notice, Pager, STATUS_TONE, Tabs, dt, money, useAction, useFetch } from '../../components/admin/kit';

const TABS = [{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }, { key: 'suspended', label: 'Suspended' }];
// Đổi ngày sang dạng cho ô datetime-local
const local = (v) => { if (!v) return ''; const x = new Date(v); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

// Form thêm / sửa mã giảm giá
function CodeEditor({ code, busy, error, onSave, onCancel }) {
  const editing = !!code;
  const [f, setF] = useState({
    code: code?.code || '', description: code?.description || '', type: code?.type || 'percent', value: code?.value ?? '', maxDiscount: code?.maxDiscount ?? '',
    minOrderAmount: code?.minOrderAmount ?? 0, usageLimit: code?.usageLimit ?? '', perUserLimit: code?.perUserLimit ?? 1,
    startDate: local(code?.startDate), endDate: local(code?.endDate),
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!editing && !/^[A-Za-z0-9_-]{3,30}$/.test(f.code.trim())) return setErr('Code must be 3-30 characters: letters, digits, dash or underscore.');
    const v = Number(f.value);
    if (!Number.isFinite(v) || v < 1 || (f.type === 'percent' && v > 100)) return setErr(f.type === 'percent' ? 'Percentage must be between 1 and 100.' : 'Discount value must be at least 1 VND.');
    if (!f.startDate || !f.endDate) return setErr('Start and end dates are required.');
    if (new Date(f.endDate) <= new Date(f.startDate)) return setErr('End date must be later than start date.');
    setErr('');
    onSave({
      code: f.code.trim().toUpperCase(), description: f.description.trim(), type: f.type, value: v,
      maxDiscount: f.type === 'percent' && f.maxDiscount !== '' ? Number(f.maxDiscount) : undefined,
      minOrderAmount: Number(f.minOrderAmount) || 0, usageLimit: f.usageLimit !== '' ? Number(f.usageLimit) : undefined, perUserLimit: Number(f.perUserLimit) || 1,
      startDate: new Date(f.startDate).toISOString(), endDate: new Date(f.endDate).toISOString(),
    });
  };
  return <section className="pm-card" aria-labelledby="dc-edit">
    <h2 id="dc-edit">{editing ? 'Update Discount Code' : 'Create Discount Code'}</h2>
    <p>New codes are inactive until activated. Dates use your local time.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Code<input autoFocus value={f.code} disabled={editing} maxLength={30} onChange={set('code')} placeholder="SAVE10" /></label>
        <label>Description<input value={f.description} maxLength={300} onChange={set('description')} /></label>
        <label>Discount type<select value={f.type} onChange={set('type')}><option value="percent">Percentage</option><option value="fixed">Fixed amount (VND)</option></select></label>
        <label>Value {f.type === 'percent' ? '(%)' : '(VND)'}<input type="number" min="1" value={f.value} onChange={set('value')} /></label>
        {f.type === 'percent' && <label>Maximum discount (VND, optional)<input type="number" min="1" value={f.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" /></label>}
        <label>Minimum order (VND)<input type="number" min="0" value={f.minOrderAmount} onChange={set('minOrderAmount')} /></label>
        <label>Total usage limit (optional)<input type="number" min="1" value={f.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" /></label>
        <label>Uses per customer<input type="number" min="1" value={f.perUserLimit} onChange={set('perUserLimit')} /></label>
        <label>Start date<input type="datetime-local" value={f.startDate} onChange={set('startDate')} /></label>
        <label>End date<input type="datetime-local" value={f.endDate} onChange={set('endDate')} /></label>
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save code'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

// UC-38 Admin quản lý mã giảm giá
export default function AdminDiscountCodesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState(null);
  const { data, loading, error, reload } = useFetch(listDiscountCodes, { status: status || undefined, q: q || undefined, page, limit: 10 });
  const act = useAction(reload);
  const items = data?.items || [];
  const open = (type, code) => { act.setError(''); act.setSuccess(''); setPanel({ type, code }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };
  const ended = (c) => new Date(c.endDate) <= new Date();
  const COPY = {
    activate: ['Activate code?', activateDiscountCode, 'Customers can use this code during its date range.', 'Code activated.'],
    suspend: ['Suspend code?', suspendDiscountCode, 'The code stops working until you activate it again.', 'Code suspended.'],
    delete: ['Delete code?', deleteDiscountCode, 'The code is removed. Existing orders keep their discount record.', 'Code deleted.'],
  };

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">MARKETING</span><h1>Manage Discount Codes</h1><p>Create codes customers can enter at checkout and control when they are valid.</p></div>
      <button className="pm-primary" onClick={() => open('add')}>+ Create Code</button></header>
    <Notice success={act.success} error={!panel ? act.error : ''} />
    {panel?.type === 'add' && <CodeEditor busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => createDiscountCode(f), 'Code created. Activate it when you are ready.')} />}
    {panel?.type === 'edit' && <CodeEditor key={panel.code._id} code={panel.code} busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => updateDiscountCode(panel.code._id, f), 'Code updated.')} />}
    {COPY[panel?.type] && <Confirm title={COPY[panel.type][0]} danger={panel.type === 'delete'} busy={act.busy} error={act.error} onCancel={() => setPanel(null)}
      onConfirm={() => run(() => COPY[panel.type][1](panel.code._id), COPY[panel.type][3])}><p><strong>{panel.code.code}</strong> — {COPY[panel.type][2]}</p></Confirm>}

    <section className="pm-card" aria-label="Discount codes list">
      <Tabs tabs={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} />
      <div className="pm-toolbar"><form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
        <label>Search codes<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Code or description" /></label><button type="submit">Search</button>
        {q && <button type="button" onClick={() => { setSearch(''); setQ(''); setPage(1); }}>Clear</button>}</form></div>
      {loading ? <p role="status">Loading codes...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
        <p>{data.total} code{data.total === 1 ? '' : 's'}</p>
        {!items.length ? <div className="pm-empty"><h2>No discount codes</h2><p>Create a code or adjust your filters.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th>Conditions</th><th>Usage</th><th>Valid</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {items.map((c) => <tr key={c._id}>
              <td><strong>{c.code}</strong>{c.description && <p className="pm-description">{c.description}</p>}</td>
              <td><strong>{c.type === 'percent' ? `${c.value}%` : money(c.value)}</strong>{c.maxDiscount != null && <small>Up to {money(c.maxDiscount)}</small>}</td>
              <td>Min order {money(c.minOrderAmount)}<small>{c.perUserLimit} use(s) per customer</small></td>
              <td>{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ' used'}</td>
              <td><small>From {dt(c.startDate)}</small><small>To {dt(c.endDate)}</small></td>
              <td><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>{ended(c) && <small>Expired</small>}</td>
              <td><div className="pm-row-actions">
                <button onClick={() => open('edit', c)}>Update</button>
                {c.status !== 'active' && <button disabled={ended(c)} onClick={() => open('activate', c)}>Activate</button>}
                {c.status === 'active' && <button onClick={() => open('suspend', c)}>Suspend</button>}
                <button className="pm-delete" onClick={() => open('delete', c)}>Delete</button>
              </div></td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} busy={act.busy} />
      </>}
    </section>
  </div>;
}
