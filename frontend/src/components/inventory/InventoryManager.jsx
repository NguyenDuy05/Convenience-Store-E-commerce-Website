import { useState } from 'react';
import {
  adjustInventory, completeStocktake, createStocktake, getInventoryHistory, getProductStock, listDamaged, listExpired,
  listInventory, listLowStock, listOutOfStock, listStocktakes, receiveStock, recordDamaged,
} from '../../api/inventory.api';
import { Badge, Confirm, Notice, Pager, STATUS_TONE, Stat, Tabs, d, dt, useAction, useFetch } from '../admin/kit';

const TAB_SETS = {
  staff: [['stock', 'Inventory'], ['receive', 'Receive Stock'], ['stocktake', 'Stocktake'], ['low', 'Low Stock'], ['expired', 'Expired'], ['damaged', 'Damaged']],
  admin: [['stock', 'Inventory'], ['stocktake', 'Stocktake'], ['low', 'Low Stock'], ['out', 'Out of Stock'], ['history', 'History']],
};
const TYPE_LABEL = { receive: 'Received', sale: 'Sold', release: 'Returned to stock', adjust: 'Adjusted', stocktake: 'Stocktake', damaged: 'Damaged', expired: 'Expired write-off' };

// Chọn sản phẩm bằng tên / SKU / mã vạch
function ProductPicker({ value, onPick }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const { data, loading } = useFetch(listInventory, { q: term || undefined, limit: 6 });
  if (value) return <div className="pm-line" style={{ gridTemplateColumns: '1fr auto' }}>
    <span><strong>{value.name}</strong> <small style={{ display: 'inline' }}>· {value.sku} · stock {value.stockQuantity}</small></span>
    <button type="button" onClick={() => onPick(null)}>Change</button></div>;
  return <div>
    <div className="pm-search-row"><label>Find product<input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setTerm(q.trim()); } }} placeholder="Name, SKU or barcode" /></label>
      <button type="button" onClick={() => setTerm(q.trim())}>Search</button></div>
    {loading ? <p role="status">Searching...</p> : <div className="pm-lines">
      {(data?.items || []).map((p) => <div className="pm-line" style={{ gridTemplateColumns: '1fr auto' }} key={p._id}>
        <span><strong>{p.name}</strong><small>{p.sku} · stock {p.stockQuantity}</small></span><button type="button" onClick={() => onPick(p)}>Select</button></div>)}
      {!data?.items?.length && <p className="pm-note">No products found.</p>}
    </div>}
  </div>;
}

// Khung chung cho các form kho
function FormShell({ title, hint, busy, error, onCancel, onSubmit, submitLabel, children }) {
  return <section className="pm-card" aria-label={title}>
    <h2>{title}</h2>{hint && <p>{hint}</p>}
    <form onSubmit={onSubmit}><fieldset disabled={busy}>{children}
      {error && <p className="pm-error" role="alert">{error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : submitLabel}</button>{onCancel && <button type="button" onClick={onCancel}>Cancel</button>}</div>
    </fieldset></form>
  </section>;
}

// Form nhập hàng (số lượng, hạn dùng, giá vốn)
function ReceiveForm({ initial, act, onCancel, onDone }) {
  const [product, setProduct] = useState(initial || null);
  const [f, setF] = useState({ quantity: '', expiryDate: '', costPrice: '', batchCode: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!product) return setErr('Select a product first.');
    const q = Number(f.quantity);
    if (!Number.isInteger(q) || q < 1) return setErr('Quantity must be a whole number of 1 or more.');
    if (f.expiryDate && new Date(f.expiryDate) <= new Date()) return setErr('Expiry date must be in the future.');
    setErr('');
    if (await act.run(() => receiveStock({ productId: product._id, quantity: q, expiryDate: f.expiryDate || undefined, costPrice: f.costPrice === '' ? undefined : Number(f.costPrice), batchCode: f.batchCode || undefined, note: f.note || undefined }),
      `Received ${q} × ${product.name}.`)) { setF({ quantity: '', expiryDate: '', costPrice: '', batchCode: '', note: '' }); setProduct(null); onDone?.(); }
  };
  return <FormShell title="Receive Stock" hint="Each delivery is stored as its own batch so expiry dates are tracked separately." busy={act.busy} error={err || act.error} onCancel={onCancel} onSubmit={submit} submitLabel="Receive stock">
    <ProductPicker value={product} onPick={setProduct} />
    <div className="pm-form-grid three" style={{ marginTop: 12 }}>
      <label>Quantity<input type="number" min="1" value={f.quantity} onChange={set('quantity')} /></label>
      <label>Expiry date (optional)<input type="date" value={f.expiryDate} onChange={set('expiryDate')} /></label>
      <label>Cost price (optional)<input type="number" min="0" value={f.costPrice} onChange={set('costPrice')} /></label>
      <label>Batch code (optional)<input maxLength={40} value={f.batchCode} onChange={set('batchCode')} /></label>
      <label className="pm-wide" style={{ gridColumn: 'span 2' }}>Note<input maxLength={300} value={f.note} onChange={set('note')} /></label>
    </div>
  </FormShell>;
}

// Form điều chỉnh tồn kho (bắt buộc lý do)
function AdjustForm({ initial, act, onCancel, onDone }) {
  const [product, setProduct] = useState(initial || null);
  const [qty, setQty] = useState(initial ? String(initial.stockQuantity) : '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!product) return setErr('Select a product first.');
    const n = Number(qty);
    if (qty === '' || !Number.isInteger(n) || n < 0) return setErr('New quantity must be a whole number of 0 or more.');
    if (n === product.stockQuantity) return setErr('The new quantity equals the current stock.');
    if (reason.trim().length < 1) return setErr('A reason is required.');
    setErr('');
    if (await act.run(() => adjustInventory({ productId: product._id, newQuantity: n, reason: reason.trim() }), `Stock for ${product.name} set to ${n}.`)) { onDone?.(); }
  };
  return <FormShell title="Adjust Inventory" hint="Sets the on-hand quantity. The change and your reason are recorded in the inventory history." busy={act.busy} error={err || act.error} onCancel={onCancel} onSubmit={submit} submitLabel="Apply adjustment">
    <ProductPicker value={product} onPick={(p) => { setProduct(p); setQty(p ? String(p.stockQuantity) : ''); }} />
    <div className="pm-form-grid" style={{ marginTop: 12 }}>
      <label>New quantity{product && <small>Current stock: {product.stockQuantity}</small>}<input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
      <label>Reason<input maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recount, correction..." /></label>
    </div>
  </FormShell>;
}

// Form ghi nhận hàng hỏng / hết hạn
function DamagedForm({ initial, act, onCancel, onDone }) {
  const [product, setProduct] = useState(initial || null);
  const [f, setF] = useState({ quantity: '', type: 'damaged', reason: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!product) return setErr('Select a product first.');
    const q = Number(f.quantity);
    if (!Number.isInteger(q) || q < 1) return setErr('Quantity must be a whole number of 1 or more.');
    if (q > product.stockQuantity) return setErr(`Only ${product.stockQuantity} in stock.`);
    if (!f.reason.trim()) return setErr('A reason is required.');
    setErr('');
    if (await act.run(() => recordDamaged({ productId: product._id, quantity: q, type: f.type, reason: f.reason.trim() }), `Removed ${q} × ${product.name} from stock.`)) onDone?.();
  };
  return <FormShell title="Record Damaged / Expired Goods" hint="Removes the quantity from stock (earliest-expiry batches first)." busy={act.busy} error={err || act.error} onCancel={onCancel} onSubmit={submit} submitLabel="Remove from stock">
    <ProductPicker value={product} onPick={setProduct} />
    <div className="pm-form-grid three" style={{ marginTop: 12 }}>
      <label>Quantity<input type="number" min="1" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></label>
      <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="damaged">Damaged</option><option value="expired">Expired</option></select></label>
      <label>Reason<input maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
    </div>
  </FormShell>;
}

// Danh sách lô của một sản phẩm
function Batches({ product, onClose }) {
  const { data, loading, error } = useFetch(() => getProductStock(product._id), product._id);
  return <section className="pm-card" aria-label="Stock batches">
    <div className="pm-toolbar"><h2 style={{ margin: 0 }}>Batches · {product.name}</h2><button onClick={onClose}>Close</button></div>
    {loading ? <p role="status">Loading...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.batches.length ? <p className="pm-note">No stock on hand.</p> :
      <div className="pm-table-wrap"><table><thead><tr><th>Batch</th><th className="pm-num">Remaining</th><th>Received</th><th>Expiry</th></tr></thead><tbody>
        {data.batches.map((b) => <tr key={b._id}><td>{b.batchCode || String(b._id).slice(-6)}</td><td className="pm-num">{b.quantity} / {b.receivedQuantity}</td><td>{d(b.receivedAt)}</td>
          <td>{b.expiryDate ? d(b.expiryDate) : '—'} {b.expired && <Badge tone="bad">expired</Badge>}</td></tr>)}
      </tbody></table></div>}
  </section>;
}

// Bảng tồn kho (lọc còn / sắp hết / hết hàng)
function StockTable({ fetcher, extraParams, rowActions, summary }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [stock, setStock] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(fetcher, { q: q || undefined, stock: stock || undefined, page, limit: 10, ...extraParams });
  const items = data?.items || [];
  return <>
    {summary && data?.summary && <div className="pm-stats"><Stat label="Products" value={data.summary.products} /><Stat label="Low stock" value={data.summary.lowStock} tone="warn" /><Stat label="Out of stock" value={data.summary.outOfStock} tone="bad" /></div>}
    {fetcher === listInventory && <div className="pm-search-row">
      <form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }} style={{ display: 'contents' }}><label>Search<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Name, SKU or barcode" /></label><button type="submit">Search</button></form>
      <label>Stock level<select value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }}><option value="">All</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></label>
    </div>}
    {loading ? <p role="status">Loading inventory...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !items.length ? <div className="pm-empty"><h2>Nothing to show</h2><p>No products match.</p></div> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th className="pm-num">Stock</th><th>Alert at</th><th>Nearest expiry</th><th>Level</th><th>Actions</th></tr></thead><tbody>
        {items.map((p) => <tr key={p._id}>
          <td><strong>{p.name}</strong><small>{p.sku}</small></td><td>{p.category?.name || '—'}</td>
          <td className="pm-num"><strong>{p.stockQuantity}</strong> {p.unit}</td><td>≤ {p.lowStockThreshold}</td><td>{p.nearestExpiry ? d(p.nearestExpiry) : '—'}</td>
          <td><Badge tone={STATUS_TONE[p.stockStatus]}>{{ in: 'In stock', low: 'Low', out: 'Out' }[p.stockStatus]}</Badge></td>
          <td><div className="pm-row-actions">{rowActions(p)}</div></td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </>;
}

// Tab kiểm kê: tạo phiên, nhập số đếm, hoàn tất
function StocktakeTab({ act, role }) {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState(null);
  const [err, setErr] = useState('');
  const [completing, setCompleting] = useState(null);
  const { data, loading, error, reload } = useFetch(listStocktakes, { page, limit: 5 });
  const add = (p) => { if (p && !lines.some((l) => l.product._id === p._id)) setLines([...lines, { product: p, countedQty: String(p.stockQuantity), note: '' }]); setPicker(null); };
  const submit = async (e) => {
    e.preventDefault();
    if (!lines.length) return setErr('Add at least one product to count.');
    if (lines.some((l) => l.countedQty === '' || !Number.isInteger(Number(l.countedQty)) || Number(l.countedQty) < 0)) return setErr('Counted quantities must be whole numbers of 0 or more.');
    setErr('');
    if (await act.run(() => createStocktake({ note: note.trim() || undefined, items: lines.map((l) => ({ productId: l.product._id, countedQty: Number(l.countedQty), note: l.note || undefined })) }), 'Stocktake created. Complete it to update stock levels.')) { setCreating(false); setLines([]); setNote(''); reload(); }
  };
  return <>
    {completing && <Confirm title="Complete stocktake?" busy={act.busy} error={act.error} confirmLabel="Complete & update stock" onCancel={() => setCompleting(null)}
      onConfirm={async () => { if (await act.run(() => completeStocktake(completing._id, {}), `Stocktake ${completing.code} completed.`)) { setCompleting(null); reload(); } }}>
      <p>Stock levels will be set to the counted quantities for <strong>{completing.items.length}</strong> product(s). Differences are recorded in the inventory history.</p></Confirm>}
    {creating ? <FormShell title="New Stocktake" hint="Count the shelves and enter the quantity you found. Stock changes only when you complete the stocktake." busy={act.busy} error={err || act.error} onCancel={() => setCreating(false)} onSubmit={submit} submitLabel="Create stocktake">
      <ProductPicker value={picker} onPick={add} />
      <div className="pm-lines">{lines.map((l, i) => <div className="pm-line" key={l.product._id} style={{ gridTemplateColumns: '1fr 110px 36px' }}>
        <span><strong>{l.product.name}</strong><small>System: {l.product.stockQuantity}</small></span>
        <input type="number" min="0" aria-label={`Counted ${l.product.name}`} value={l.countedQty} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, countedQty: e.target.value } : x)))} />
        <button type="button" aria-label="Remove" onClick={() => setLines(lines.filter((_, k) => k !== i))}>×</button></div>)}</div>
      <label>Note (optional)<input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    </FormShell> : <div className="pm-actions" style={{ marginTop: 0, marginBottom: 16 }}><button className="pm-primary" onClick={() => { act.setError(''); setCreating(true); }}>+ New stocktake</button></div>}
    {loading ? <p role="status">Loading stocktakes...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.items.length ? <div className="pm-empty"><h2>No stocktakes yet</h2></div> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>Code</th><th>Counted by</th><th>Products</th><th className="pm-num">Total difference</th><th>Created</th><th>Status</th><th /></tr></thead><tbody>
        {data.items.map((s) => <tr key={s._id}>
          <td><strong>{s.code}</strong>{s.note && <small>{s.note}</small>}</td><td>{s.performedBy?.fullName || '—'}</td>
          <td>{s.items.map((i) => `${i.product?.name || '?'} (${i.systemQty}→${i.countedQty})`).join(', ')}</td>
          <td className="pm-num">{s.differenceTotal}</td><td>{dt(s.createdAt)}</td>
          <td><Badge tone={s.status === 'completed' ? 'ok' : 'warn'}>{s.status === 'completed' ? 'Completed' : 'In progress'}</Badge></td>
          <td>{s.status === 'in_progress' && <button onClick={() => { act.setError(''); setCompleting(s); }}>Complete</button>}</td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </>;
}

// Tab các lô đã hết hạn
function ExpiredTab({ act }) {
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const { data, loading, error, reload } = useFetch(listExpired, { page, limit: 10 });
  return <>
    {target && <Confirm title="Write off expired batch?" danger busy={act.busy} error={act.error} confirmLabel="Write off" onCancel={() => setTarget(null)}
      onConfirm={async () => { if (await act.run(() => recordDamaged({ productId: target.product._id, batchId: target._id, quantity: target.quantity, type: 'expired', reason: 'Expired batch written off' }), 'Expired stock removed.')) { setTarget(null); reload(); } }}>
      <p>{target.quantity} × <strong>{target.product?.name}</strong> (expired {d(target.expiryDate)}) will be removed from stock.</p></Confirm>}
    {loading ? <p role="status">Loading...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.items.length ? <div className="pm-empty"><h2>No expired stock</h2><p>Every batch on hand is still within date.</p></div> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>Product</th><th>Batch</th><th className="pm-num">Quantity</th><th>Expired on</th><th /></tr></thead><tbody>
        {data.items.map((b) => <tr key={b._id}><td><strong>{b.product?.name}</strong><small>{b.product?.sku}</small></td><td>{b.batchCode || String(b._id).slice(-6)}</td>
          <td className="pm-num">{b.quantity}</td><td>{d(b.expiryDate)}</td><td><button className="pm-delete" onClick={() => { act.setError(''); setTarget(b); }}>Write off</button></td></tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </>;
}

// Tab lịch sử hàng hỏng
function DamagedTab({ act }) {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useFetch(listDamaged, { page, limit: 10 });
  return <>
    {adding ? <DamagedForm act={act} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} /> :
      <div className="pm-actions" style={{ marginTop: 0, marginBottom: 16 }}><button className="pm-primary" onClick={() => { act.setError(''); setAdding(true); }}>+ Record damaged goods</button></div>}
    {loading ? <p role="status">Loading...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.items.length ? <div className="pm-empty"><h2>No records</h2></div> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>Product</th><th>Type</th><th className="pm-num">Quantity</th><th>Reason</th><th>By</th><th>Date</th></tr></thead><tbody>
        {data.items.map((l) => <tr key={l._id}><td><strong>{l.product?.name}</strong><small>{l.product?.sku}</small></td><td><Badge tone={l.type === 'expired' ? 'bad' : 'warn'}>{l.type}</Badge></td>
          <td className="pm-num">{l.quantity}</td><td>{l.reason}</td><td>{l.performedBy || '—'}</td><td>{dt(l.createdAt)}</td></tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </>;
}

// Tab lịch sử biến động kho
function HistoryTab() {
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(getInventoryHistory, { type: type || undefined, from: from || undefined, to: to ? `${to}T23:59:59` : undefined, page, limit: 15 });
  return <>
    <div className="pm-search-row">
      <label>Type<select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
      <label>To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
    </div>
    {from && to && from > to && <p className="pm-error" role="alert">The start date must be before the end date.</p>}
    {loading ? <p role="status">Loading history...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !data.items.length ? <div className="pm-empty"><h2>No history</h2></div> : <>
      <div className="pm-table-wrap"><table><thead><tr><th>When</th><th>Product</th><th>Type</th><th className="pm-num">Change</th><th className="pm-num">After</th><th>Reason / Order</th><th>By</th></tr></thead><tbody>
        {data.items.map((l) => <tr key={l._id}><td>{dt(l.createdAt)}</td><td><strong>{l.product?.name}</strong><small>{l.product?.sku}</small></td><td>{TYPE_LABEL[l.type]}</td>
          <td className={`pm-num ${l.quantityChange > 0 ? 'pm-up' : 'pm-down'}`}>{l.quantityChange > 0 ? '+' : ''}{l.quantityChange}</td><td className="pm-num">{l.quantityAfter}</td>
          <td>{l.order || l.reason || '—'}</td><td>{l.performedBy || '—'}</td></tr>)}
      </tbody></table></div>
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </>;
}

// Trang quản lý kho dùng chung staff / admin (các tab theo quyền)
export default function InventoryManager({ role }) {
  const tabs = TAB_SETS[role].map(([key, label]) => ({ key, label }));
  const [tab, setTab] = useState('stock');
  const [form, setForm] = useState(null);
  const [batches, setBatches] = useState(null);
  const [version, setVersion] = useState(0);
  const act = useAction();
  const refresh = () => setVersion((v) => v + 1);
  const closeForm = () => { setForm(null); act.setError(''); };
  const openForm = (type, product) => { act.setError(''); act.setSuccess(''); setBatches(null); setForm({ type, product }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const canReceive = role === 'staff';

  const rowActions = (p) => <>
    <button onClick={() => { setForm(null); setBatches(p); }}>Batches</button>
    {canReceive && <button onClick={() => openForm('receive', p)}>Receive</button>}
    <button onClick={() => openForm('adjust', p)}>Adjust</button>
    {role === 'staff' && <button className="pm-delete" onClick={() => openForm('damaged', p)}>Damaged</button>}
  </>;

  const listFor = { stock: [listInventory, {}, true], low: [listLowStock, {}, false], out: [listOutOfStock, {}, false] }[tab];
  const done = () => { closeForm(); refresh(); };

  return <div className="pm-page" key={role}>
    <header className="pm-heading"><div><span className="pm-eyebrow">STOCK</span><h1>{role === 'admin' ? 'Manage Inventory' : 'Inventory'}</h1>
      <p>Track stock by batch, review low and expired items and keep counts accurate.</p></div></header>
    <Notice success={act.success} />
    {form?.type === 'receive' && <ReceiveForm key={form.product?._id || 'r'} initial={form.product} act={act} onCancel={closeForm} onDone={done} />}
    {form?.type === 'adjust' && <AdjustForm key={form.product?._id || 'a'} initial={form.product} act={act} onCancel={closeForm} onDone={done} />}
    {form?.type === 'damaged' && <DamagedForm key={form.product?._id || 'd'} initial={form.product} act={act} onCancel={closeForm} onDone={done} />}
    {batches && <Batches key={batches._id} product={batches} onClose={() => setBatches(null)} />}

    <section className="pm-card">
      <Tabs tabs={tabs} value={tab} onChange={(k) => { setTab(k); setBatches(null); act.setError(''); act.setSuccess(''); }} />
      {listFor && <StockTable key={tab} fetcher={listFor[0]} extraParams={{ v: version, ...listFor[1] }} rowActions={rowActions} summary={listFor[2]} />}
      {tab === 'receive' && <ReceiveForm act={act} onDone={refresh} />}
      {tab === 'stocktake' && <StocktakeTab act={act} role={role} />}
      {tab === 'expired' && <ExpiredTab act={act} />}
      {tab === 'damaged' && <DamagedTab act={act} />}
      {tab === 'history' && <HistoryTab />}
    </section>
  </div>;
}
