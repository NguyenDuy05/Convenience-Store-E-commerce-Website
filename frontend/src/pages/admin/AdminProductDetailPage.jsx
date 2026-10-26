import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import { ConfirmDialog, PriceDialog } from '../../components/admin/products/ProductDialogs';
import { categoryName, errMsg, mealLabel, shortDate, stockState, vnd } from '../../components/admin/products/productUtils';
import { activateProduct, deactivateProduct, deleteProduct, getProduct, updateProductPrice } from '../../api/product.api';

// UC-32.3 View Product Details (+ nút Edit, Update price, Activate/Deactivate, Delete)
function batchState(b) {
    if (!b.expiryDate) return { key: 'active', label: 'No expiry' };
    const days = Math.ceil((new Date(b.expiryDate) - Date.now()) / 86400000);
    if (days < 0) return { key: 'out', label: 'Expired' };
    if (days <= 7) return { key: 'low', label: `${days}d left` };
    return { key: 'active', label: `${days}d left` };
}

export default function AdminProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [p, setP] = useState(null);
    const [error, setError] = useState('');
    const [flash, setFlash] = useState(location.state?.flash || '');
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);
    const [dialogError, setDialogError] = useState('');
    const [activeImg, setActiveImg] = useState(0);

    const load = useCallback(async () => {
        try { setP((await getProduct(id, { include: 'batches' })).data); setError(''); }
        catch (err) { setError(errMsg(err, 'Product not found.')); }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const close = () => { if (!busy) { setDialog(null); setDialogError(''); } };
    const run = async (fn, ok, after) => {
        setBusy(true); setDialogError('');
        try { await fn(); setDialog(null); setFlash(ok); if (after) after(); else await load(); }
        catch (err) { setDialogError(errMsg(err, 'Action failed. Please try again.')); }
        finally { setBusy(false); }
    };

    if (error) return <AdminShell crumbs={['Products', 'Details']}><div className="ap-page"><p className="ap-alert error">{error}</p><Link className="ap-btn ghost" to="/admin/products">Back to products</Link></div></AdminShell>;
    if (!p) return <AdminShell crumbs={['Products', 'Details']}><p className="ap-empty-note">Loading product…</p></AdminShell>;

    const st = stockState(p);
    const images = p.images || [];
    const batches = p.batches || [];
    const history = [...(p.priceHistory || [])].reverse();
    const live = batches.filter((b) => b.quantity > 0);

    return (
        <AdminShell crumbs={['Products', p.sku]}>
            <div className="ap-page">
                <div className="ap-head">
                    <div>
                        <Link className="ap-link-btn" to="/admin/products"><span className="review-material-icon">arrow_back</span>Back to products</Link>
                        <p style={{ margin: '8px 0 0' }}>Catalog record · System ID <span className="ap-mono">{p._id}</span></p>
                    </div>
                    <div className="ap-actions">
                        <button className="ap-btn ghost" onClick={() => setDialog('price')}><span className="review-material-icon">payments</span>Update Price</button>
                        {p.status === 'active'
                            ? <button className="ap-btn warn" onClick={() => setDialog('deactivate')}><span className="review-material-icon">block</span>Deactivate</button>
                            : <button className="ap-btn soft" onClick={() => setDialog('activate')}><span className="review-material-icon">check_circle</span>Activate</button>}
                        <button className="ap-btn primary" onClick={() => navigate(`/admin/products/${p._id}/edit`)}><span className="review-material-icon">edit</span>Edit Product</button>
                        <button className="ap-btn ghost" onClick={() => setDialog('delete')} title="Delete product"><span className="review-material-icon">delete</span></button>
                    </div>
                </div>
                {flash && <p className="ap-alert success" role="status">{flash} <button className="ap-link-btn" onClick={() => setFlash('')}>Dismiss</button></p>}

                <section className="ap-hero">
                    <div className="ap-hero-img">{images[0] ? <img src={images[0]} alt={p.name} /> : <span className="review-material-icon" style={{ fontSize: 48 }}>inventory_2</span>}</div>
                    <div className="ap-hero-main">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span className={`ap-badge ${st.key}`}>{st.label}</span><span className="ap-chip">{categoryName(p)}</span><span className="ap-chip">{mealLabel(p.mealType)}</span></div>
                        <h1>{p.name}</h1>
                        <div className="ap-meta"><span>SKU: <b className="ap-mono">{p.sku}</b></span><span>Barcode: <b className="ap-mono">{p.barcode || '—'}</b></span><span>Rating: <b>{p.ratingCount ? `${p.ratingAvg.toFixed(1)} ★ (${p.ratingCount})` : 'No reviews yet'}</b></span></div>
                    </div>
                    <div className="ap-hero-price"><small>Retail price</small><b>{vnd(p.price)}</b><small>per {p.unit}</small></div>
                </section>

                <div className="ap-kpis">
                    <article className="ap-kpi"><div className="ap-kpi-top"><span>Stock on hand</span><span className="review-material-icon">warehouse</span></div><strong>{p.stockQuantity}<small> {p.unit}</small></strong><small>{live.length} active batch{live.length === 1 ? '' : 'es'}</small></article>
                    <article className="ap-kpi"><div className="ap-kpi-top"><span>Low-stock level</span><span className="review-material-icon">warning</span></div><strong>{p.lowStockThreshold}</strong><small>{p.stockQuantity <= p.lowStockThreshold ? 'Stock is at or below this level' : 'Stock is above this level'}</small></article>
                    <article className="ap-kpi"><div className="ap-kpi-top"><span>Price changes</span><span className="review-material-icon">trending_up</span></div><strong>{history.length}</strong><small>{history[0] ? `Last: ${shortDate(history[0].changedAt)}` : 'Never changed'}</small></article>
                    <article className="ap-kpi"><div className="ap-kpi-top"><span>Last updated</span><span className="review-material-icon">schedule</span></div><strong style={{ fontSize: 20 }}>{shortDate(p.updatedAt)}</strong><small>Created {shortDate(p.createdAt)}</small></article>
                </div>

                <div className="ap-layout detail">
                    <div className="ap-col">
                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">tune</span>Product Specifications</h2></div>
                            {images.length > 0 && <>
                                <div className="ap-hero-img" style={{ width: '100%', height: 220 }}><img src={images[activeImg] || images[0]} alt="" /></div>
                                {images.length > 1 && <div className="ap-gallery">{images.map((u, i) => <button type="button" key={u + i} className="ap-thumb" style={{ border: i === activeImg ? '2px solid #0058bc' : '2px solid transparent', padding: 0, cursor: 'pointer' }} onClick={() => setActiveImg(i)}><img src={u} alt="" /></button>)}</div>}
                            </>}
                            <p className="ap-desc">{p.description || 'No description provided.'}</p>
                            <dl className="ap-dl">
                                <div><dt>Category</dt><dd>{categoryName(p)}</dd></div>
                                <div><dt>Unit of measure</dt><dd>{p.unit}</dd></div>
                                <div><dt>Meal group</dt><dd>{mealLabel(p.mealType)}</dd></div>
                                <div><dt>Selling status</dt><dd style={{ textTransform: 'capitalize' }}>{p.status}</dd></div>
                            </dl>
                        </section>
                    </div>

                    <div className="ap-col">
                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">inventory</span>Stock Batches</h2><small>Sold first-expiry-first-out</small></div>
                            {batches.length === 0 ? <p className="ap-empty-note">No stock has been received for this product yet. Receive stock in Inventory.</p> : (
                                <div style={{ overflowX: 'auto' }}><table className="ap-mini-table">
                                    <thead><tr><th>Batch</th><th>Received</th><th className="r">Remaining</th><th>Expiry</th><th>State</th></tr></thead>
                                    <tbody>{batches.map((b) => {
                                        const bs = batchState(b); return (
                                            <tr key={b._id}><td className="ap-mono">{b.batchCode || String(b._id).slice(-6)}</td><td>{shortDate(b.receivedAt)}</td>
                                                <td className="r"><b>{b.quantity}</b> / {b.receivedQuantity}</td><td>{shortDate(b.expiryDate)}</td>
                                                <td>{b.quantity === 0 ? <span className="ap-badge inactive">Sold out</span> : <span className={`ap-badge ${bs.key}`}>{bs.label}</span>}</td></tr>);
                                    })}</tbody>
                                </table></div>)}
                        </section>
                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">history</span>Price History</h2></div>
                            {history.length === 0 ? <p className="ap-empty-note">The price has not changed since this product was created.</p> : (
                                <div style={{ overflowX: 'auto' }}><table className="ap-mini-table">
                                    <thead><tr><th>Date</th><th className="r">Old</th><th className="r">New</th><th>Changed by</th></tr></thead>
                                    <tbody>{history.map((h, i) => <tr key={i}><td>{shortDate(h.changedAt)}</td><td className="r">{vnd(h.oldPrice)}</td><td className="r"><b>{vnd(h.newPrice)}</b></td><td>{h.changedBy?.fullName || '—'}</td></tr>)}</tbody>
                                </table></div>)}
                        </section>
                    </div>
                </div>
            </div>

            {dialog === 'price' && <PriceDialog product={p} busy={busy} error={dialogError} onClose={close} onSubmit={(body) => run(() => updateProductPrice(p._id, body), `Price updated to ${vnd(body.price)}.`)} />}
            {dialog === 'deactivate' && <ConfirmDialog product={p} busy={busy} error={dialogError} title="Deactivate product?" icon="toggle_off" confirmLabel="Deactivate" onClose={close} onConfirm={() => run(() => deactivateProduct(p._id), 'Product deactivated.')}>
                <p>It will be hidden from the storefront and can no longer be added to carts. Existing orders are not affected.</p></ConfirmDialog>}
            {dialog === 'activate' && <ConfirmDialog product={p} busy={busy} error={dialogError} title="Activate product?" icon="toggle_on" confirmLabel="Activate" onClose={close} onConfirm={() => run(() => activateProduct(p._id), 'Product activated.')}>
                <p>The product becomes visible and purchasable again.</p></ConfirmDialog>}
            {dialog === 'delete' && <ConfirmDialog product={p} busy={busy} error={dialogError} tone="danger" title="Delete product?" icon="delete" confirmLabel="Delete product" onClose={close}
                onConfirm={() => run(() => deleteProduct(p._id), 'Product deleted.', () => navigate('/admin/products', { replace: true }))}>
                <p>The product is removed from the catalog and storefront. Past orders keep their product snapshot.</p></ConfirmDialog>}
        </AdminShell>
    );
}