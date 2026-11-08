import { useState } from 'react';
import { addStore, closeStore, listStores, openStore, updateStore, updateStoreHours } from '../../api/store.api';
import { Badge, Confirm, Notice, STATUS_TONE, useAction, useFetch } from '../../components/admin/kit';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PHONE_RE = /^(\+?84|0)\d{9,10}$/;

function StoreEditor({ store, busy, error, onSave, onCancel }) {
  const [f, setF] = useState({ name: store?.name || '', address: store?.address || '', phone: store?.phone || '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Store name is required.');
    if (!f.address.trim()) return setErr('Address is required.');
    if (f.phone.trim() && !PHONE_RE.test(f.phone.trim().replace(/[\s.-]/g, ''))) return setErr('Phone number is invalid.');
    setErr(''); onSave(f);
  };
  return <section className="pm-card" aria-labelledby="store-edit">
    <h2 id="store-edit">{store ? 'Update Store' : 'Add Store'}</h2>
    {!store && <p>New stores start with default opening hours (07:00 – 22:00, every day). You can change them afterwards.</p>}
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Store name<input autoFocus value={f.name} maxLength={120} onChange={set('name')} /></label>
        <label>Phone<input value={f.phone} inputMode="tel" onChange={set('phone')} /></label>
        <label className="pm-wide">Address<input value={f.address} maxLength={255} onChange={set('address')} /></label>
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save store'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

function HoursEditor({ store, busy, error, onSave, onCancel }) {
  const initial = DAYS.map((_, day) => { const h = (store.openingHours || []).find((x) => x.day === day) || {}; return { day, openTime: h.openTime || '07:00', closeTime: h.closeTime || '22:00', isClosed: !!h.isClosed }; });
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState('');
  const set = (i, patch) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const submit = (e) => {
    e.preventDefault();
    const bad = rows.find((r) => !r.isClosed && r.openTime >= r.closeTime);
    if (bad) return setErr(`${DAYS[bad.day]}: closing time must be later than opening time.`);
    setErr(''); onSave(rows);
  };
  return <section className="pm-card" aria-labelledby="hours-edit">
    <h2 id="hours-edit">Opening hours · {store.name}</h2>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-hours">
        {rows.map((r, i) => <div className="pm-hours-row" key={r.day}>
          <strong>{DAYS[r.day]}</strong>
          <label>Opens<input type="time" value={r.openTime} disabled={r.isClosed} onChange={(e) => set(i, { openTime: e.target.value })} /></label>
          <label>Closes<input type="time" value={r.closeTime} disabled={r.isClosed} onChange={(e) => set(i, { closeTime: e.target.value })} /></label>
          <label className="pm-inline"><input type="checkbox" checked={r.isClosed} onChange={(e) => set(i, { isClosed: e.target.checked })} />Closed</label>
        </div>)}
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save hours'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

export default function AdminStoresPage() {
  const { data, loading, error, reload } = useFetch(listStores, {});
  const act = useAction(reload);
  const [panel, setPanel] = useState(null); // { type: 'add'|'edit'|'hours'|'close'|'open', store }
  const [reason, setReason] = useState('');
  const open = (type, store) => { act.setError(''); act.setSuccess(''); setReason(''); setPanel({ type, store }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };
  const stores = data || [];

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">LOCATIONS</span><h1>Manage Stores</h1><p>Maintain store details, opening hours and availability.</p></div>
      <button className="pm-primary" onClick={() => open('add')}>+ Add Store</button></header>
    <Notice success={act.success} error={!panel ? act.error : ''} />
    {panel?.type === 'add' && <StoreEditor busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => addStore(f), 'Store added.')} />}
    {panel?.type === 'edit' && <StoreEditor key={panel.store._id} store={panel.store} busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => updateStore(panel.store._id, f), 'Store updated.')} />}
    {panel?.type === 'hours' && <HoursEditor key={panel.store._id} store={panel.store} busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(rows) => run(() => updateStoreHours(panel.store._id, { openingHours: rows }), 'Opening hours updated.')} />}
    {panel?.type === 'close' && <Confirm title="Close store?" danger confirmLabel="Close store" busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onConfirm={() => run(() => closeStore(panel.store._id, { reason }), 'Store closed.')}>
      <p><strong>{panel.store.name}</strong> will be shown as closed to customers.</p>
      <label>Reason (optional)<input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} /></label></Confirm>}
    {panel?.type === 'open' && <Confirm title="Re-open store?" confirmLabel="Open store" busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onConfirm={() => run(() => openStore(panel.store._id, {}), 'Store re-opened.')}>
      <p><strong>{panel.store.name}</strong> will be shown as open again.</p></Confirm>}

    {loading ? <p role="status">Loading stores...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !stores.length ?
      <section className="pm-card pm-empty"><h2>No stores yet</h2><p>Add your first store.</p></section> :
      <div className="pm-store-grid">{stores.map((s) => <section className="pm-card" key={s._id}>
        <div className="pm-toolbar"><h2 style={{ margin: 0 }}>{s.name}</h2><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></div>
        <p>{s.address}<br />{s.phone || 'No phone'}</p>
        {s.status === 'closed' && s.closedReason && <p className="pm-note">Closed: {s.closedReason}</p>}
        <div className="pm-table-wrap"><table><tbody>
          {DAYS.map((name, day) => { const h = (s.openingHours || []).find((x) => x.day === day); return <tr key={day}><td>{name}</td><td>{!h || h.isClosed ? 'Closed' : `${h.openTime} – ${h.closeTime}`}</td></tr>; })}
        </tbody></table></div>
        <div className="pm-actions"><button onClick={() => open('edit', s)}>Update</button><button onClick={() => open('hours', s)}>Hours</button>
          {s.status === 'open' ? <button className="pm-delete" onClick={() => open('close', s)}>Close</button> : <button onClick={() => open('open', s)}>Open</button>}</div>
      </section>)}</div>}
  </div>;
}
