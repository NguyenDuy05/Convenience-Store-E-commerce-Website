import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import { listPromotions } from '../../api/promotion.api';
import { checkoutPosSale, quoteStoreOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import Receipt from '../../components/staff/Receipt';
import { formatCurrency } from '../../utils/format';
import { newIdempotencyKey as newKey } from '../../utils/idempotency';
import '../../styles/pos.css';

const METHODS = { cash: 'Cash', card: 'Card terminal', vnpay: 'VNPay QR' };
export default function StoreOrderPage() {
  const { user } = useAuth();
  const storageKey = `quick-pos-pending:${user.id}`;
  const initial = useRef((() => { try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; } })());
  const [lines, setLines] = useState(initial.current?.lines || []);
  const [pending, setPending] = useState(initial.current?.request || null);
  const [stage, setStage] = useState(initial.current ? 'payment' : 'items');
  const [catalog, setCatalog] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]), [promotions, setPromotions] = useState([]);
  const [category, setCategory] = useState(''), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [promotionId, setPromotionId] = useState(initial.current?.request?.promotionId || '');
  const [note, setNote] = useState(initial.current?.request?.customerNote || '');
  const [quote, setQuote] = useState(initial.current?.quote || null), [quoting, setQuoting] = useState(false), [loading, setLoading] = useState(true);
  const [method, setMethod] = useState(initial.current?.request?.method || 'cash');
  const [received, setReceived] = useState(initial.current?.request?.received ?? ''), [reference, setReference] = useState(initial.current?.request?.reference || ''), [approved, setApproved] = useState(!!initial.current?.request?.paymentConfirmed);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [catalogError, setCatalogError] = useState(''), [done, setDone] = useState(null), [receipt, setReceipt] = useState(false);
  const key = useRef(newKey()), inFlight = useRef(false);
  const items = useMemo(() => lines.map(({ product, quantity }) => ({ productId: product._id, quantity })), [lines]);
  useEffect(() => { listCategories().then((r) => setCategories(r.data)).catch(() => {}); listPromotions().then((r) => setPromotions(r.data.items || [])).catch(() => {}); }, []);
  const loadCatalog = useCallback(() => {
    let active = true; setLoading(true); setCatalogError('');
    listProducts({ q: search || undefined, categoryId: category || undefined, status: 'active', page, limit: 24 }).then((r) => { if (active) setCatalog(r.data); }).catch(() => { if (active) setCatalogError('Could not load products. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, category, page, reload]);
  useEffect(loadCatalog, [loadCatalog]);
  useEffect(() => {
    if (pending) return undefined;
    setQuote(null);
    if (!items.length) { setQuoting(false); return undefined; }
    let alive = true; setQuoting(true);
    const timer = setTimeout(() => quoteStoreOrder({ items, promotionId: promotionId || undefined }).then((r) => { if (alive) { setQuote(r.data); setError(''); } }).catch((err) => { if (alive) setError(err.response?.data?.message || 'Could not calculate this bill.'); }).finally(() => { if (alive) setQuoting(false); }), 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [items, promotionId, pending]);
  const change = (fn) => { if (pending || busy) return; key.current = newKey(); setError(''); fn(); };
  const add = (product) => change(() => setLines((current) => {
    const hit = current.find((l) => l.product._id === product._id);
    if (hit) return current.map((l) => l === hit ? { ...l, quantity: Math.min(999, l.quantity + 1) } : l);
    return [...current, { product, quantity: 1 }];
  }));
  const find = async (event) => {
    event.preventDefault(); setPage(1); setSearch(query.trim());
    if (!query.trim()) return;
    try { const r = await listProducts({ q: query.trim(), status: 'active', limit: 24 }); const exact = r.data.items?.find((p) => p.barcode === query.trim() || p.sku?.toLowerCase() === query.trim().toLowerCase()); if (exact && exact.stockQuantity > 0) { add(exact); setQuery(''); setSearch(''); } }
    catch { setCatalogError('Could not search products. Please try again.'); }
  };
  const submit = async () => {
    if (inFlight.current) return;
    if (!pending && (!quote?.canCreate || quoting)) return;
    const body = pending || { idempotencyKey: key.current, items, promotionId: promotionId || undefined, customerNote: note, expectedTotal: quote.totalAmount, method, ...(method === 'cash' ? { received: Number(received) } : { reference: reference.trim(), paymentConfirmed: approved }) };
    inFlight.current = true; setBusy(true); setError('');
    sessionStorage.setItem(storageKey, JSON.stringify({ request: body, lines, quote }));
    try { const response = await checkoutPosSale(body); sessionStorage.removeItem(storageKey); setPending(null); setDone(response.data); }
    catch (err) {
      const code = err.response?.status;
      if (!code || code >= 500 || err.response?.data?.code === 'CHECKOUT_PENDING') { setPending(body); setError('Confirmation has not been verified. Retry this same confirmation or check sales history before starting another sale.'); }
      else { sessionStorage.removeItem(storageKey); setPending(null); setError(err.response.data?.message || 'Could not confirm this sale.'); if (err.response.data?.quote) { const fresh = err.response.data.quote; setQuote({ ...fresh, canCreate: !fresh.issues?.length && !fresh.promoError && fresh.totalAmount > 0 }); setStage('items'); } }
    } finally { inFlight.current = false; setBusy(false); }
  };
  const reset = () => { setDone(null); setLines([]); setQuote(null); setPromotionId(''); setNote(''); setReceived(''); setReference(''); setApproved(false); setStage('items'); setError(''); key.current = newKey(); setReload((r) => r + 1); };
  if (done) return <section className="pos-page"><div className="ui-panel pos-success"><span className="pos-success-icon"><Icon name="check_circle" size="xl" /></span><span className="ui-eyebrow">SALE COMPLETE</span><h1>{done.order.orderCode}</h1><p>Payment recorded. This sale is saved in order history.</p><div className="pos-totals"><div><span>Payment method</span><b>{METHODS[done.order.paymentMethod]}</b></div><div><span>Total</span><b>{formatCurrency(done.order.totalAmount)}</b></div>{done.order.paymentMethod === 'cash' && <div><span>Change to customer</span><b>{formatCurrency(done.change)}</b></div>}</div><div className="pos-success-actions"><button className="ui-button" onClick={() => setReceipt(true)}><Icon name="print" />Receipt</button><button className="ui-button secondary" onClick={reset}>New sale</button><Link className="ui-button secondary" to="/staff/orders/history?source=store">Sales history</Link></div></div>{receipt && <Receipt orderId={done.order._id} onClose={() => setReceipt(false)} />}</section>;
  const payable = method === 'cash' ? Number(received) >= (quote?.totalAmount || 0) && received !== '' : approved && /^[A-Za-z0-9-]{4,40}$/.test(reference.trim());
  return <section className="pos-page">
    <header className="ui-page-heading"><div><span className="ui-eyebrow">QUICK · COUNTER SALES</span><h1>Point of sale</h1><p>Select products, review the bill, collect payment and confirm the sale.</p></div><Link className="ui-button secondary" to="/staff/orders/history?source=store"><Icon name="history" />Sales history</Link></header>
    <nav className="pos-steps" aria-label="Sale progress"><span className={stage === 'items' ? 'active' : ''}>1 · Products & bill</span><Icon name="chevron_right" size="sm" /><span className={stage === 'payment' ? 'active' : ''}>2 · Payment & confirmation</span><Icon name="chevron_right" size="sm" /><span>3 · Receipt & history</span></nav>
    {error && <div className="ui-alert error" role="alert">{error}</div>}
    <div className="pos-workspace"><section className="pos-catalog ui-panel">
      {stage === 'items' ? <><form className="pos-search" onSubmit={find}><label className="pos-search-field">Find products<input autoFocus value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or scan barcode" disabled={!!pending || busy} /></label><button className="ui-button secondary" type="submit" disabled={!!pending || busy}><Icon name="search" />Search</button></form><div className="pos-categories"><button className={!category ? 'active' : ''} onClick={() => { setCategory(''); setPage(1); }}>All products</button>{categories.map((c) => <button key={c._id} className={category === c._id ? 'active' : ''} onClick={() => { setCategory(c._id); setPage(1); }}>{c.name}</button>)}</div>{catalogError && <div className="ui-alert error" role="alert">{catalogError}<button onClick={() => setReload((r) => r + 1)}>Try again</button></div>}{loading ? <div className="ui-empty" role="status">Loading products…</div> : !catalog.items.length ? <div className="ui-empty">No matching products.</div> : <div className="pos-products">{catalog.items.map((product) => <button key={product._id} className="pos-product" disabled={busy || !!pending || product.stockQuantity <= 0} onClick={() => add(product)} aria-label={`Add ${product.name} to bill`}><span className="pos-product-image">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <Icon name="inventory_2" size="xl" />}</span><b>{product.name}</b><span>{formatCurrency(product.price)}</span><small>{product.sku} · {product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Out of stock'}</small></button>)}</div>}{catalog.total > 24 && <nav className="ui-pagination" aria-label="Product pages"><button disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {Math.ceil(catalog.total / 24)}</span><button disabled={page * 24 >= catalog.total || loading} onClick={() => setPage(page + 1)}>Next</button></nav>}</> : <div className="pos-payment"><h2>Collect payment</h2><p>Confirm the amount and payment before handing over the items.</p><fieldset disabled={busy || !!pending}><legend>Payment method</legend><div className="pos-methods">{Object.entries(METHODS).map(([value, label]) => <label key={value} className={method === value ? 'active' : ''}><input type="radio" name="pos-method" value={value} checked={method === value} onChange={() => { setMethod(value); setApproved(false); key.current = newKey(); }} />{label}</label>)}</div>{method === 'cash' ? <><label>Cash received (VND)<input type="number" min={quote?.totalAmount || 0} step="1" max="1000000000" value={received} onChange={(e) => setReceived(e.target.value)} /></label><button type="button" className="ui-button secondary" onClick={() => setReceived(quote.totalAmount)}>Exact amount</button><div className="pos-change"><span>Change</span><strong>{formatCurrency(Math.max(0, Number(received) - (quote?.totalAmount || 0)))}</strong></div></> : <><p className="pos-terminal-note">Collect payment using the store's card terminal or QR payment account. Record the reference only after approval.</p><label>Transaction reference<input value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference from terminal or payment app" /></label><label className="pos-approved"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />Payment has been approved on the terminal or payment account.</label></>}</fieldset>{!pending && <button className="ui-button secondary" disabled={busy} onClick={() => setStage('items')}><Icon name="arrow_back" />Edit bill</button>}{pending && <p role="status">This bill is locked while its confirmation is unresolved. Retrying uses the same checkout reference.</p>}</div>}
    </section><aside className="pos-bill ui-panel"><header><div><span className="ui-eyebrow">CURRENT BILL</span><h2>Walk-in sale</h2></div><span>{lines.reduce((sum, l) => sum + l.quantity, 0)} items</span></header>{!lines.length ? <div className="pos-empty"><Icon name="shopping_basket" size="xl" /><p>Choose products to start a bill.</p></div> : <ul className="pos-lines">{lines.map(({ product, quantity }) => { const row = quote?.lines?.find((l) => String(l.productId) === product._id); const issue = quote?.issues?.find((i) => String(i.productId) === product._id); return <li key={product._id}><div><b>{product.name}</b><small>{formatCurrency(row?.unitPrice ?? product.price)} / {product.unit}</small>{issue && <span className="pos-line-error">{issue.message}</span>}</div><div className="pos-line-controls"><div><button disabled={stage !== 'items' || quantity <= 1 || busy || !!pending} aria-label={`Decrease ${product.name}`} onClick={() => change(() => setLines((cur) => cur.map((l) => l.product._id === product._id ? { ...l, quantity: l.quantity - 1 } : l)))}>−</button><span>{quantity}</span><button disabled={stage !== 'items' || quantity >= 999 || busy || !!pending} aria-label={`Increase ${product.name}`} onClick={() => add(product)}>+</button></div><b>{formatCurrency(row?.lineTotal ?? product.price * quantity)}</b><button disabled={stage !== 'items' || busy || !!pending} aria-label={`Remove ${product.name}`} onClick={() => change(() => setLines((cur) => cur.filter((l) => l.product._id !== product._id)))}><Icon name="close" size="sm" /></button></div></li>; })}</ul>}<fieldset disabled={stage !== 'items' || busy || !!pending}><label>Promotion<select value={promotionId} onChange={(e) => change(() => setPromotionId(e.target.value))}><option value="">No promotion</option>{promotions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label><label>Bill note (optional)<input value={note} maxLength={500} onChange={(e) => change(() => setNote(e.target.value))} /></label></fieldset>{quote?.promoError && <p className="pos-line-error" role="alert">{quote.promoError}</p>}<div className="pos-totals"><div><span>Subtotal</span><b>{formatCurrency(quote?.subtotal || 0)}</b></div><div><span>Discount</span><b>− {formatCurrency(quote?.discount || 0)}</b></div><div className="pos-grand-total"><span>Total</span><strong>{formatCurrency(quote?.totalAmount || 0)}</strong></div></div>{stage === 'items' ? <button className="ui-button pos-confirm" disabled={!quote?.canCreate || quoting || busy} onClick={() => { setStage('payment'); setError(''); }}>{quoting ? 'Checking bill…' : 'Proceed to payment'}<Icon name="arrow_forward" /></button> : <button className="ui-button pos-confirm" disabled={busy || (!pending && (!payable || !quote?.canCreate))} onClick={submit}>{busy ? 'Confirming…' : pending ? 'Retry confirmation' : 'Confirm sale'}</button>}<p className="pos-bill-note">In-store sale · Items handed over at the counter. A completed sale is saved only after payment confirmation.</p></aside></div>
  </section>;
}
