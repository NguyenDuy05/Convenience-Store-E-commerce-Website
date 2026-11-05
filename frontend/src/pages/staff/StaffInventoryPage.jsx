import { useCallback, useEffect, useState } from 'react';
import {
  listInventory, receiveStock, adjustInventory, listStocktakes, createStocktake,
  completeStocktake, listLowStock, listExpired, listDamaged, recordDamaged,
} from '../../api/inventory.api';
import '../../styles/qk-tokens.css';
import '../../styles/style.css';

const tabs = [
  ['inventory', 'Inventory'], ['low', 'Low Stock'], ['expired', 'Expired'],
  ['damaged', 'Damaged'], ['stocktakes', 'Stocktakes'],
];
const loaders = { inventory: listInventory, low: listLowStock, expired: listExpired,
  damaged: listDamaged, stocktakes: listStocktakes };
const initialForm = { productId: '', quantity: '', quantityChange: '', countedQty: '',
  batchCode: '', expiryDate: '', costPrice: '', reason: '', note: '' };
const toDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : 'Unknown';
const errorMessage = (error) => error.response?.data?.message || 'Request failed. Please try again.';

// UC-18.1–18.7 Manage Inventory — Staff
export default function StaffInventoryPage() {
  const [tab, setTab] = useState('inventory');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [catalog, setCatalog] = useState([]);
  const [mode, setMode] = useState('');
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (['inventory', 'low'].includes(tab)) params.q = search;
      const response = await loaders[tab](params);
      setData(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, search, page, refresh]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listInventory({ limit: 100 }).then(({ data: result }) => setCatalog(result.items)).catch(() => {});
  }, [refresh]);

  const switchTab = (next) => {
    setTab(next);
    setPage(1);
    setMode('');
    setNotice('');
    setError('');
  };
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const openForm = (next, productId = '') => {
    setForm({ ...initialForm, productId });
    setMode(next);
    setNotice('');
    setError('');
  };
  const run = async (action) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice('Inventory information saved successfully.');
      setMode('');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.productId) return setError('Select a product.');
    if (mode === 'receive') {
      const quantity = Number(form.quantity);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) return setError('Enter a positive whole quantity.');
      return run(() => receiveStock({
        productId: form.productId, quantity, batchCode: form.batchCode.trim(),
        expiryDate: form.expiryDate || undefined,
        costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
      }));
    }
    if (mode === 'adjust') {
      const quantityChange = Number(form.quantityChange);
      if (!Number.isSafeInteger(quantityChange) || quantityChange === 0) return setError('Enter a non-zero whole adjustment.');
      if (!form.reason.trim()) return setError('Reason is required.');
      return run(() => adjustInventory({ productId: form.productId, quantityChange, reason: form.reason.trim() }));
    }
    if (mode === 'damaged') {
      const quantity = Number(form.quantity);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) return setError('Enter a positive whole quantity.');
      if (!form.reason.trim()) return setError('Reason is required.');
      return run(() => recordDamaged({ productId: form.productId, quantity, reason: form.reason.trim() }));
    }
    if (mode === 'stocktake') {
      const countedQty = Number(form.countedQty);
      if (!Number.isSafeInteger(countedQty) || countedQty < 0) return setError('Counted quantity must be zero or greater.');
      return run(() => createStocktake({ items: [{ productId: form.productId, countedQty }], note: form.note.trim() }));
    }
  };

  const selected = catalog.find((product) => product._id === form.productId);
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / 15));

  return (
    <section className="inventory-page">
      <header className="inventory-heading">
        <div>
          <h1>Inventory Management</h1>
          <p>Check stock, receive deliveries, record adjustments and review stock conditions.</p>
        </div>
        <button type="button" className="inventory-button" onClick={() => openForm('receive')}>+ Receive Stock</button>
      </header>

      <nav className="inventory-tabs" aria-label="Inventory sections">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? 'active' : ''}
            aria-current={tab === key ? 'page' : undefined} onClick={() => switchTab(key)}>{label}</button>
        ))}
      </nav>

      <div className="inventory-toolbar">
        {['inventory', 'low'].includes(tab) ? (
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(query.trim()); }}>
            <input aria-label="Search products by name or SKU" placeholder="Search by product name or SKU" value={query}
              onChange={(event) => setQuery(event.target.value)} />
            <button type="submit" className="inventory-button">Search</button>
          </form>
        ) : <strong>{tabs.find(([key]) => key === tab)?.[1]}</strong>}
        <div className="inventory-actions">
          <button type="button" className="inventory-button outline" onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
          <button type="button" className="inventory-button outline" onClick={() => openForm('adjust')}>Adjust Stock</button>
          <button type="button" className="inventory-button outline" onClick={() => openForm('damaged')}>Record Damaged</button>
          <button type="button" className="inventory-button outline" onClick={() => openForm('stocktake')}>New Stocktake</button>
        </div>
      </div>

      {error && <p className="inventory-alert error" role="alert">{error}</p>}
      {notice && <p className="inventory-alert success" role="status">{notice}</p>}

      {mode && (
        <form className="inventory-panel" onSubmit={submit}>
          <div className="inventory-panel-title">
            <h2>{({ receive: 'Receive Stock', adjust: 'Adjust Inventory', damaged: 'Record Damaged Products', stocktake: 'Create Stocktake' })[mode]}</h2>
            <button type="button" className="inventory-button outline" onClick={() => setMode('')}>Cancel</button>
          </div>
          <div className="inventory-form-grid">
            <label>Product
              <select required value={form.productId} onChange={(event) => change('productId', event.target.value)}>
                <option value="">Select product</option>
                {catalog.map((product) => <option key={product._id} value={product._id}>{product.name} — {product.sku}</option>)}
              </select>
            </label>
            {selected && <p className="inventory-current">Current stock: <b>{selected.stockQuantity}</b></p>}
            {['receive', 'damaged'].includes(mode) && <label>Quantity
              <input type="number" min="1" step="1" required value={form.quantity} onChange={(event) => change('quantity', event.target.value)} />
            </label>}
            {mode === 'adjust' && <label>Quantity change (+ or −)
              <input type="number" step="1" required value={form.quantityChange} onChange={(event) => change('quantityChange', event.target.value)} />
            </label>}
            {mode === 'stocktake' && <label>Physical count
              <input type="number" min="0" step="1" required value={form.countedQty} onChange={(event) => change('countedQty', event.target.value)} />
            </label>}
            {mode === 'receive' && <>
              <label>Batch code (optional)<input maxLength="100" value={form.batchCode} onChange={(event) => change('batchCode', event.target.value)} /></label>
              <label>Expiry date (optional)<input type="date" value={form.expiryDate} onChange={(event) => change('expiryDate', event.target.value)} /></label>
              <label>Unit cost (optional)<input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => change('costPrice', event.target.value)} /></label>
            </>}
            {['adjust', 'damaged'].includes(mode) && <label>Reason
              <input required maxLength="500" value={form.reason} onChange={(event) => change('reason', event.target.value)} placeholder="Explain the stock movement" />
            </label>}
            {mode === 'stocktake' && <label>Notes (optional)
              <input maxLength="500" value={form.note} onChange={(event) => change('note', event.target.value)} />
            </label>}
          </div>
          {mode === 'stocktake' && <p className="inventory-hint">Counts with differences are saved for reconciliation. Stock quantities will not change without an approved application policy.</p>}
          <button type="submit" className="inventory-button" disabled={busy || !catalog.length}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      )}

      <div className="inventory-panel inventory-table-wrap">
        {tab === 'expired' && data.unknownExpiryCount > 0 && (
          <p className="inventory-alert warn">{data.unknownExpiryCount} stock batches have no expiry date. Their expiry status is unknown.</p>
        )}
        {loading ? <p role="status">Loading inventory...</p> : !data.items?.length ? (
          <p className="inventory-empty">No records found.</p>
        ) : (
          <table className="inventory-table">
            <thead><tr>
              <th>{['inventory', 'low'].includes(tab) ? 'Product / SKU' : tab === 'stocktakes' ? 'Stocktake' : 'Product'}</th>
              <th>{tab === 'expired' ? 'Batch / Expiry' : tab === 'stocktakes' ? 'Counted / Differences' : 'Quantity'}</th>
              <th>{tab === 'inventory' || tab === 'low' ? 'Status' : 'Details'}</th>
              <th>Action</th>
            </tr></thead>
            <tbody>
              {data.items.map((item) => {
                if (tab === 'stocktakes') {
  const rows = Array.isArray(item.items) ? item.items : [];
  const validItems = rows.length > 0 && rows.every(
    (row) => typeof row?.difference === 'number' && Number.isFinite(row.difference)
  );
  const variance = validItems
    ? rows.reduce((sum, row) => sum + row.difference, 0)
    : null;

  return (
    <tr key={item._id}>
      <td>
        <b>{item.code}</b>
        <small>{toDate(item.createdAt)}</small>
      </td>
      <td>
        {validItems
          ? `${rows.length} product(s), net ${variance > 0 ? '+' : ''}${variance}`
          : 'Invalid stocktake data'}
      </td>
      <td>
        <span className={`inventory-tag ${!validItems || variance !== 0 ? 'warn' : ''}`}>
          {!validItems
            ? 'Data unavailable'
            : item.status === 'completed'
              ? 'Completed'
              : variance !== 0
                ? 'Variance to review'
                : 'Ready'}
        </span>
      </td>
      <td>
        {validItems && item.status === 'in_progress' && (
          <button
            type="button"
            className="inventory-button outline"
            disabled={busy}
            onClick={() => run(() => completeStocktake(item._id, {}))}
          >
            Complete
          </button>
        )}
      </td>
    </tr>
  );
}
                if (tab === 'expired') return <tr key={item._id}>
                  <td><b>{item.productId?.name || 'Unknown product'}</b><small>{item.productId?.sku}</small></td>
                  <td>{item.batchCode || 'Uncoded batch'}<small>{toDate(item.expiryDate)}</small></td>
                  <td><span className="inventory-tag danger">Expired · {item.quantity} remaining</span></td>
                  <td>—</td>
                </tr>;
                if (tab === 'damaged') return <tr key={item._id}>
                  <td><b>{item.productId?.name || 'Unknown product'}</b><small>{item.productId?.sku}</small></td>
                  <td>{Math.abs(item.quantityChange)}</td>
                  <td>{item.reason || 'Damaged stock'}<small>{toDate(item.createdAt)}</small></td>
                  <td>Recorded</td>
                </tr>;
                const low = item.stockQuantity <= item.lowStockThreshold;
                return <tr key={item._id}>
                  <td><b>{item.name}</b><small>SKU: {item.sku}</small></td>
                  <td><b>{item.stockQuantity}</b> <small>/{item.unit || 'item'}</small></td>
                  <td><span className={`inventory-tag ${low ? 'warn' : ''}`}>{low ? 'Low Stock' : 'Available'}</span></td>
                  <td><button type="button" className="inventory-button outline" onClick={() => openForm('adjust', item._id)}>Check / Adjust</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        )}
        <footer className="inventory-pager">
          <span>{data.total || 0} record(s)</span>
          <div>
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((n) => n - 1)}>Previous</button>
            <span>Page {page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((n) => n + 1)}>Next</button>
          </div>
        </footer>
      </div>
    </section>
  );
}
