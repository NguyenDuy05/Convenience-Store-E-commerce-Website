import { useEffect, useState } from 'react';
import { activatePromotion, createPromotion, deletePromotion, listAllPromotions, suspendPromotion, updatePromotion } from '../../api/promotion.api';
import { listCategories } from '../../api/category.api';
import { listProducts } from '../../api/product.api';
import '../../styles/admin-promotions.css';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const date = (value) => new Date(value).toLocaleString('en-US');
const STATUS = { inactive: 'Inactive', active: 'Active', suspended: 'Suspended', deleted: 'Deleted' };
const SCOPE = { all: 'All products', category: 'Selected categories', product: 'Selected products' };
const message = (err) => {
  if (err.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (err.response?.status === 403) return 'You do not have permission to manage promotions.';
  return err.response?.data?.message || 'Unable to complete the request. Please try again.';
};
const localDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const reference = (item) => typeof item === 'string' ? { _id: item, name: item } : item;
const timing = (item) => {
  if (new Date(item.endDate) < new Date()) return 'Expired';
  if (new Date(item.startDate) > new Date()) return 'Scheduled';
  return item.status === 'active' ? 'Running' : 'Within date range';
};

function PromotionEditor({ promotion, busy, error, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: promotion?.name || '', description: promotion?.description || '', type: promotion?.type || 'percent',
    value: promotion?.value ?? '', maxDiscount: promotion?.maxDiscount ?? '', scope: promotion?.scope || 'all',
    startDate: localDate(promotion?.startDate), endDate: localDate(promotion?.endDate),
    categoryIds: (promotion?.categoryIds || []).filter(Boolean).map(reference),
    productIds: (promotion?.productIds || []).filter(Boolean).map(reference),
  }));
  const [options, setOptions] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupReload, setLookupReload] = useState(0);
  const [validation, setValidation] = useState('');

  useEffect(() => {
    if (form.scope === 'all') return;
    let active = true;
    setLoading(true); setLookupError(''); setOptions([]);
    const timer = setTimeout(() => {
      const request = form.scope === 'category' ? listCategories() : listProducts({ q: query, status: 'active', limit: 20 });
      request.then(({ data }) => { if (active) setOptions(form.scope === 'category' ? data : data.items); })
        .catch(() => { if (active) setLookupError('Unable to load available selections. Please try again.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [form.scope, query, lookupReload]);

  const field = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const key = form.scope === 'category' ? 'categoryIds' : 'productIds';
  const selected = form[key];
  const toggle = (option) => setForm((current) => ({ ...current, [key]: current[key].some((item) => item._id === option._id)
    ? current[key].filter((item) => item._id !== option._id) : [...current[key], option] }));
  const submit = (event) => {
    event.preventDefault(); setValidation('');
    if (!form.name.trim()) return setValidation('Please enter a promotion name.');
    if (new Date(form.endDate) <= new Date(form.startDate)) return setValidation('End date must be later than start date.');
    if (new Date(form.endDate) <= new Date()) return setValidation('End date must be in the future.');
    if (form.scope !== 'all' && (!selected.length || selected.length > 100)) return setValidation('Select between 1 and 100 items for this scope.');
    onSave({ ...form, name: form.name.trim(), value: Number(form.value),
      maxDiscount: form.type === 'percent' && form.maxDiscount !== '' ? Number(form.maxDiscount) : null,
      categoryIds: form.scope === 'category' ? form.categoryIds.map((item) => item._id) : [],
      productIds: form.scope === 'product' ? form.productIds.map((item) => item._id) : [],
      startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(),
    });
  };

  return <section className="pm-card pm-editor" aria-labelledby="promotion-editor-title">
    <h2 id="promotion-editor-title">{promotion ? 'Update Promotion' : 'Create Promotion'}</h2>
    <p>New promotions are inactive until activated. Dates use your local time.</p>
    {promotion?.status === 'active' && <p className="pm-note">Saving changes updates this active promotion immediately.</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <div className="pm-form-grid">
          <label className="pm-wide">Promotion name<input autoFocus name="name" value={form.name} onChange={field} required maxLength={120} /></label>
          <label className="pm-wide">Description<textarea name="description" value={form.description} onChange={field} rows={3} maxLength={2000} /></label>
          <label>Discount type<select name="type" value={form.type} onChange={field}><option value="percent">Percentage</option><option value="fixed">Fixed amount (VND)</option></select></label>
          <label>Discount value {form.type === 'percent' ? '(%)' : '(VND)'}<input type="number" name="value" required min={form.type === 'percent' ? '0.01' : '1'} max={form.type === 'percent' ? 100 : 100000000} step={form.type === 'percent' ? '0.01' : '1'} value={form.value} onChange={field} /></label>
          {form.type === 'percent' && <label>Maximum discount (VND, optional)<input type="number" name="maxDiscount" min="1" max="100000000" step="1" value={form.maxDiscount} onChange={field} placeholder="No cap" /></label>}
          <label>Applies to<select name="scope" value={form.scope} onChange={field}>{Object.entries(SCOPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Start date<input type="datetime-local" name="startDate" required value={form.startDate} onChange={field} /></label>
          <label>End date<input type="datetime-local" name="endDate" required value={form.endDate} onChange={field} /></label>
          {form.scope !== 'all' && <div className="pm-wide pm-picker">
            <h3>{SCOPE[form.scope]}</h3>
            {form.scope === 'product' && <label>Search products<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search by name or SKU" /></label>}
            <p>{selected.length}/100 selected. {form.scope === 'product' && 'Showing up to 20 matching products. Search to find more.'}</p>
            <div className="pm-tags">{selected.map((item) => <button type="button" key={item._id} onClick={() => toggle(item)} aria-label={`Remove ${item.name}`}>{item.name} &times;</button>)}</div>
            {loading ? <p role="status">Loading selections...</p> : lookupError ? <div><p role="alert" className="pm-error">{lookupError}</p><button type="button" onClick={() => setLookupReload((n) => n + 1)}>Retry</button></div> :
              <div className="pm-options">{options.length ? options.map((item) => <label key={item._id}>
                <input type="checkbox" checked={selected.some((entry) => entry._id === item._id)} onChange={() => toggle(item)} disabled={selected.length >= 100 && !selected.some((entry) => entry._id === item._id)} />
                <span>{item.name}{item.sku ? ` (${item.sku})` : ''}</span>
              </label>) : <p>No matching items found.</p>}</div>}
          </div>}
        </div>
        {(validation || error) && <p role="alert" className="pm-error">{validation || error}</p>}
        <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save promotion'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
      </fieldset>
    </form>
  </section>;
}

export default function AdminPromotionsPage() {
  const [data, setData] = useState({ items: [], total: 0, limit: 10 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editor, setEditor] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    listAllPromotions({ status, q: query, page, limit: 10 }).then(({ data: result }) => {
      if (!active) return;
      if (page > 1 && !result.items.length) { setPage((n) => n - 1); return; }
      setData(result);
    }).catch((err) => { if (active) setError(message(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, query, page, reload]);

  const run = async (operation, notice) => {
    if (busy) return;
    setBusy(true); setActionError(''); setSuccess('');
    try {
      await operation(); setEditor(null); setAction(null); setSuccess(notice); setReload((n) => n + 1);
    } catch (err) { setActionError(message(err)); }
    finally { setBusy(false); }
  };
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  const chooseAction = (type, promotion) => { setEditor(null); setActionError(''); setAction({ type, promotion }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">MARKETING</span><h1>Manage Promotions</h1><p>Create offers, set their dates and control availability across your catalog.</p></div>
      <button className="pm-primary" disabled={busy} onClick={() => { setEditor({ promotion: null }); setAction(null); setActionError(''); }}>+ Create Promotion</button>
    </header>
    {success && <p className="pm-success" role="status">{success}</p>}
    {editor && <PromotionEditor key={editor.promotion?._id || 'new'} promotion={editor.promotion} busy={busy} error={actionError}
      onCancel={() => setEditor(null)} onSave={(payload) => run(() => editor.promotion ? updatePromotion(editor.promotion._id, payload) : createPromotion(payload), editor.promotion ? 'Promotion updated successfully.' : 'Promotion created. Activate it when you are ready.')} />}
    {action && <section className="pm-card pm-confirm" aria-labelledby="promotion-confirm-title">
      <h2 id="promotion-confirm-title">{action.type === 'delete' ? 'Delete' : action.type === 'activate' ? 'Activate' : 'Suspend'} promotion?</h2>
      <p><strong>{action.promotion.name}</strong></p>
      <p>{action.type === 'delete' ? 'This promotion will stop applying to new purchases and be removed from the default list. Existing order records will be preserved.' : action.type === 'activate' ? 'The promotion will be available during its date range. Future promotions will start automatically on their start date.' : 'The promotion will stop applying until you activate it again.'}</p>
      {actionError && <p className="pm-error" role="alert">{actionError}</p>}
      <div className="pm-actions"><button className={action.type === 'delete' ? 'pm-danger' : 'pm-primary'} disabled={busy} onClick={() => run(() => ({ activate: activatePromotion, suspend: suspendPromotion, delete: deletePromotion })[action.type](action.promotion._id), `Promotion ${action.type === 'delete' ? 'deleted' : action.type === 'activate' ? 'activated' : 'suspended'} successfully.`)}>{busy ? 'Processing...' : 'Confirm'}</button><button disabled={busy} onClick={() => setAction(null)}>Cancel</button></div>
    </section>}
    <section className="pm-card" aria-label="Promotions list">
      <div className="pm-toolbar">
        <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><label>Search promotions<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Name or description" /></label><button type="submit">Search</button></form>
        <label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All except deleted</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button disabled={loading || busy} onClick={() => setReload((n) => n + 1)}>Refresh</button>
      </div>
      <p className="pm-note">Active promotions apply only within their date range. Amounts are in VND.</p>
      {loading ? <p role="status">Loading promotions...</p> : error ? <p role="alert" className="pm-error">{error}</p> : <>
        <p>{data.total} promotion{data.total === 1 ? '' : 's'} found</p>
        {!data.items.length ? <div className="pm-empty"><h2>No promotions found</h2><p>Create a promotion or adjust your search and filters.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Promotion</th><th>Discount</th><th>Scope</th><th>Date range</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {data.items.map((item) => <tr key={item._id}>
              <td><strong>{item.name}</strong><p className="pm-description">{item.description || 'No description'}</p></td>
              <td><strong>{item.type === 'percent' ? `${item.value}%` : money(item.value)}</strong>{item.type === 'percent' && item.maxDiscount != null && <small>Up to {money(item.maxDiscount)}</small>}</td>
              <td>{SCOPE[item.scope]}{item.scope !== 'all' && <small>{(item.scope === 'category' ? item.categoryIds : item.productIds).filter(Boolean).map((entry) => entry.name || String(entry._id || entry)).join(', ')}</small>}</td>
              <td><small>From {date(item.startDate)}</small><small>To {date(item.endDate)}</small></td>
              <td><span className={`pm-badge pm-${item.status}`}>{STATUS[item.status]}</span><small>{timing(item)}</small></td>
              <td>{item.status !== 'deleted' && <div className="pm-row-actions">
                <button disabled={busy} onClick={() => { setEditor({ promotion: item }); setAction(null); setActionError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Update</button>
                {item.status !== 'active' && <button disabled={busy || new Date(item.endDate) <= new Date()} onClick={() => chooseAction('activate', item)}>Activate</button>}
                {item.status === 'active' && <button disabled={busy} onClick={() => chooseAction('suspend', item)}>Suspend</button>}
                <button className="pm-delete" disabled={busy} onClick={() => chooseAction('delete', item)}>Delete</button>
              </div>}</td>
            </tr>)}
          </tbody></table></div>}
        <nav className="pm-pagination" aria-label="Promotions pagination"><button disabled={page <= 1 || busy} onClick={() => setPage((n) => n - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages || busy} onClick={() => setPage((n) => n + 1)}>Next</button></nav>
      </>}
    </section>
  </div>;
}
