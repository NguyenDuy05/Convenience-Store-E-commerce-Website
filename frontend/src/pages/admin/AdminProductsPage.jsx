import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import { ConfirmDialog, PriceDialog } from '../../components/admin/products/ProductDialogs';
import { categoryName, errMsg, shortDate, stockState, vnd } from '../../components/admin/products/productUtils';
import { activateProduct, deactivateProduct, deleteProduct, listProducts, updateProductPrice } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import ProductSearchInput from '../../components/home/ProductSearchInput';

// UC-32.1 View / 32.2 Search / 32.3 View Details (link) / 32.4 Add / 32.5 Update (link) / 32.6 Price / 32.7 Delete / 32.8 Activate / 32.9 Deactivate
const TABS = [
  { key: 'all', label: 'All', params: {}, count: 'all' },
  { key: 'active', label: 'Active', params: { status: 'active' }, count: 'active' },
  { key: 'low', label: 'Low Stock', params: { stock: 'low' }, count: 'low' },
  { key: 'out', label: 'Out of Stock', params: { stock: 'out' }, count: 'out' },
  { key: 'inactive', label: 'Inactive', params: { status: 'inactive' }, count: 'inactive' },
];
const SORTS = [
  { value: 'newest', label: 'Newest first' }, { value: 'name', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price: low to high' }, { value: 'price_desc', label: 'Price: high to low' },
  { value: 'stock', label: 'Stock: lowest first' },
];

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [dialog, setDialog] = useState(null);       // { type: 'price'|'deactivate'|'activate'|'delete', product }
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  useEffect(() => { listCategories().then((r) => setCategories(r.data || [])).catch(() => { }); }, []);
  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort, withCounts: 1, ...TABS.find((t) => t.key === tab).params };
      if (debouncedQ) params.q = debouncedQ;
      if (categoryId) params.categoryId = categoryId;
      const { data } = await listProducts(params);
      setItems(data.items); setTotal(data.total); setCounts(data.counts); setError('');
    } catch (err) { setError(errMsg(err, 'Unable to load products.')); }
    finally { setLoading(false); }
  }, [page, limit, sort, tab, debouncedQ, categoryId]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageNumbers = useMemo(() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1]);
    return [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  const closeDialog = () => { if (!busy) { setDialog(null); setDialogError(''); } };
  const run = async (fn, okMessage) => {
    setBusy(true); setDialogError('');
    try { await fn(); setDialog(null); setFlash(okMessage); await load(); }
    catch (err) { setDialogError(errMsg(err, 'Action failed. Please try again.')); }
    finally { setBusy(false); }
  };
  const p = dialog?.product;
  const pct = (n) => (counts?.all ? Math.max((n / counts.all) * 100, n ? 2 : 0) : 0);

  return (
    <AdminShell crumbs={['Products Management']}>
      <div className="ap-page">
        <div className="ap-head">
          <div>
            <div className="ap-title-row"><h1>Products</h1><span className="ap-pill">Master Catalog</span></div>
            <p>Manage the product catalog: pricing, categories, selling status and stock levels.</p>
          </div>
          <div className="ap-actions">
            <button className="ap-btn primary" onClick={() => navigate('/admin/products/new')}><span className="review-material-icon">add</span>Add Product</button>
          </div>
        </div>

        {error && <p className="ap-alert error" role="alert">{error}</p>}
        {flash && <p className="ap-alert success" role="status">{flash} <button className="ap-link-btn" onClick={() => setFlash('')}>Dismiss</button></p>}

        <div className="ap-kpis">
          {[
            { label: 'Total Products', value: counts?.all, note: 'Excluding deleted items', color: '#0058bc', bar: 100 },
            { label: 'Active Catalog', value: counts?.active, note: 'Visible to customers', color: '#356b0a', bar: pct(counts?.active) },
            { label: 'Out of Stock', value: counts?.out, note: `${counts?.low ?? 0} more running low`, color: '#ba1a1a', bar: pct(counts?.out) },
            { label: 'Inactive', value: counts?.inactive, note: 'Hidden from the storefront', color: '#727785', bar: pct(counts?.inactive) },
          ].map((k) => (
            <article className="ap-kpi" key={k.label}>
              <div className="ap-kpi-top"><span>{k.label}</span><i className="ap-kpi-dot" style={{ background: k.color }} /></div>
              <strong style={k.label === 'Out of Stock' ? { color: '#ba1a1a' } : undefined}>{counts ? k.value.toLocaleString('en-US') : '—'}</strong>
              <small>{k.note}</small>
              <div className="ap-bar"><i style={{ width: `${k.bar}%`, background: k.color }} /></div>
            </article>
          ))}
        </div>

        <section className="ap-panel">
          <div className="ap-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} className={`${tab === t.key ? 'on ' : ''}${t.key}`} onClick={() => { setTab(t.key); setPage(1); }}>
                {t.label}<small>({counts ? counts[t.count].toLocaleString('en-US') : '…'})</small>
              </button>
            ))}
          </div>
          <div className="ap-filters">
            <div className="ap-search"><span className="review-material-icon">search</span>
              <ProductSearchInput products={items} value={q} onChange={setQ} placeholder="Search name, SKU or barcode…" ariaLabel="Search products" toForProduct={(product) => `/admin/products/${product._id}`} />
            </div>
            <label className="ap-select"><select aria-label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select></label>
            <label className="ap-select"><select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></label>
          </div>
        </section>

        <section className="ap-table-wrap" aria-label="Products table">
          <div className="ap-table-scroll">
            <table className="ap-table">
              <thead><tr><th>Product</th><th>SKU / Barcode</th><th>Category</th><th className="r">Price</th><th>Stock</th><th className="c">Status</th><th>Updated</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {loading && !items.length ? <tr><td colSpan={8} className="ap-table-empty">Loading products…</td></tr>
                  : !items.length ? <tr><td colSpan={8} className="ap-table-empty">No products match your filters.</td></tr>
                    : items.map((it) => {
                      const st = stockState(it);
                      return (
                        <tr key={it._id}>
                          <td><div className="ap-prod">
                            <span className="ap-thumb">{it.images?.[0] ? <img src={it.images[0]} alt="" /> : <span className="review-material-icon">inventory_2</span>}</span>
                            <div><Link to={`/admin/products/${it._id}`}>{it.name}</Link><small>per {it.unit}</small></div>
                          </div></td>
                          <td><div className="ap-sku"><span className="ap-mono">{it.sku}</span><span className="ap-mono">{it.barcode || '—'}</span></div></td>
                          <td><span className="ap-chip">{categoryName(it)}</span></td>
                          <td className="r"><span className="ap-price">{vnd(it.price)}</span></td>
                          <td><div className="ap-stock"><b>{it.stockQuantity}</b> <small>/ min {it.lowStockThreshold}</small></div></td>
                          <td className="c"><span className={`ap-badge ${st.key}`}>{st.label}</span></td>
                          <td>{shortDate(it.updatedAt)}</td>
                          <td><div className="ap-row-actions">
                            <Link className="ap-icon-btn" to={`/admin/products/${it._id}`} title="View details"><span className="review-material-icon">visibility</span></Link>
                            <Link className="ap-icon-btn" to={`/admin/products/${it._id}/edit`} title="Edit product"><span className="review-material-icon">edit</span></Link>
                            <button className="ap-icon-btn" title="Update price" onClick={() => setDialog({ type: 'price', product: it })}><span className="review-material-icon">payments</span></button>
                            {it.status === 'active'
                              ? <button className="ap-icon-btn" title="Deactivate" onClick={() => setDialog({ type: 'deactivate', product: it })}><span className="review-material-icon">toggle_on</span></button>
                              : <button className="ap-icon-btn" title="Activate" onClick={() => setDialog({ type: 'activate', product: it })}><span className="review-material-icon">toggle_off</span></button>}
                            <button className="ap-icon-btn danger" title="Delete" onClick={() => setDialog({ type: 'delete', product: it })}><span className="review-material-icon">delete</span></button>
                          </div></td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <footer className="ap-pager">
            <span>Showing <b>{total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)}</b> of <b>{total.toLocaleString('en-US')}</b> products
              {' · '}Rows per page <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></span>
            <div className="ap-pages">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><span className="review-material-icon">chevron_left</span></button>
              {pageNumbers.map((n, i) => (
                <span key={n} style={{ display: 'contents' }}>
                  {i > 0 && n - pageNumbers[i - 1] > 1 && <span>…</span>}
                  <button className={n === page ? 'on' : ''} onClick={() => setPage(n)}>{n}</button>
                </span>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><span className="review-material-icon">chevron_right</span></button>
            </div>
          </footer>
        </section>
      </div>

      {dialog?.type === 'price' && <PriceDialog product={p} busy={busy} error={dialogError} onClose={closeDialog}
        onSubmit={(body) => run(() => updateProductPrice(p._id, body), `Price of “${p.name}” updated to ${vnd(body.price)}.`)} />}
      {dialog?.type === 'deactivate' && <ConfirmDialog product={p} busy={busy} error={dialogError} title="Deactivate product?" icon="toggle_off" confirmLabel="Deactivate" onClose={closeDialog}
        onConfirm={() => run(() => deactivateProduct(p._id), `“${p.name}” is now inactive.`)}>
        <p>The product will be hidden from the storefront and can no longer be added to carts. Existing orders are not affected. You can reactivate it at any time.</p></ConfirmDialog>}
      {dialog?.type === 'activate' && <ConfirmDialog product={p} busy={busy} error={dialogError} title="Activate product?" icon="toggle_on" confirmLabel="Activate" onClose={closeDialog}
        onConfirm={() => run(() => activateProduct(p._id), `“${p.name}” is now active.`)}>
        <p>The product becomes visible and purchasable again{p.stockQuantity <= 0 ? ', but it currently has no stock' : ''}.</p></ConfirmDialog>}
      {dialog?.type === 'delete' && <ConfirmDialog product={p} busy={busy} error={dialogError} tone="danger" title="Delete product?" icon="delete" confirmLabel="Delete product" onClose={closeDialog}
        onConfirm={() => run(() => deleteProduct(p._id), `“${p.name}” was deleted.`)}>
        <p>The product is removed from the catalog and storefront. Past orders keep their product snapshot. To only hide it temporarily, use Deactivate instead.</p></ConfirmDialog>}
    </AdminShell>
  );
}
