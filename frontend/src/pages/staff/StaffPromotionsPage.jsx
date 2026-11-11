import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPromotions, applyPromotion } from '../../api/promotion.api';
import { listProducts } from '../../api/product.api';
import { formatCurrency } from '../../utils/format';
import '../../styles/staff-promotions.css';

const SCOPE_LABEL = { all: 'All products', category: 'By category', product: 'By product' };
// Định dạng ngày
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US');
// Mô tả mức giảm của khuyến mãi
const valueText = (p) => (p.type === 'percent' ? `Save ${p.value}%` : `Save ${formatCurrency(p.value)}`);
// Mô tả phạm vi áp dụng của khuyến mãi
const scopeDetail = (p) => {
  if (p.scope === 'category') return p.categories.map((c) => c.name).filter(Boolean).join(', ');
  if (p.scope === 'product') return p.products.map((x) => x.name).filter(Boolean).join(', ');
  return '';
};

// UC-20 Staff xem khuyến mãi và tính thử cho hóa đơn
export default function StaffPromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [lines, setLines] = useState([]);
  const [pq, setPq] = useState('');
  const [found, setFound] = useState([]);
  const [finding, setFinding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [applyError, setApplyError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    listPromotions({ q: search || undefined })
      .then((res) => setPromos(res.data.items))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load promotions.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [search]);   // eslint-disable-line react-hooks/exhaustive-deps

  const resetResult = () => { setResult(null); setApplyError(''); };

  const onFind = (e) => {
    e.preventDefault();
    if (!pq.trim()) return;
    setFinding(true);
    listProducts({ q: pq.trim(), limit: 6, status: 'active' })
      .then((res) => setFound(res.data.items.filter((p) => p.status === 'active')))
      .catch(() => setFound([]))
      .finally(() => setFinding(false));
  };

  const addProduct = (product) => {
    resetResult();
    setLines((cur) => {
      const i = cur.findIndex((l) => l.product._id === product._id);
      if (i >= 0) return cur.map((l, k) => (k === i ? { ...l, quantity: Math.min(l.quantity + 1, 999) } : l));
      return [...cur, { product, quantity: 1 }];
    });
  };
  const setQty = (id, v) => {
    resetResult();
    const n = Math.max(1, Math.min(999, parseInt(v, 10) || 1));
    setLines((cur) => cur.map((l) => (l.product._id === id ? { ...l, quantity: n } : l)));
  };
  const removeLine = (id) => { resetResult(); setLines((cur) => cur.filter((l) => l.product._id !== id)); };
  const selectPromo = (id) => { resetResult(); setSelectedId(id); };

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.product.price * l.quantity, 0), [lines]);
  const selected = promos.find((p) => p._id === selectedId);
  const resultByProduct = useMemo(() => new Map((result?.lines || []).map((l) => [String(l.productId), l])), [result]);

  const onApply = () => {
    setApplying(true);
    setApplyError('');
    setResult(null);
    applyPromotion({ promotionId: selectedId, items: lines.map((l) => ({ productId: l.product._id, quantity: l.quantity })) })
      .then((res) => setResult(res.data))
      .catch((err) => setApplyError(err.response?.data?.message || 'Unable to apply the promotion. Please try again.'))
      .finally(() => setApplying(false));
  };

  return (
    <section className="spt">
      <nav className="spt-crumb" aria-label="Breadcrumb">
        <Link to="/staff">Staff</Link><span>›</span><span aria-current="page">Promotions</span>
      </nav>
      <div className="spt-head">
        <h1>Promotions</h1>
        <p>View active promotions and apply them to counter orders. Discounts are calculated using current prices.</p>
      </div>

      <div className="spt-section-title">
        <h2>Active</h2>
        <form className="spt-search" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <input className="spt-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search promotions..." maxLength={100} />
          <button type="submit" className="spt-btn">Search</button>
        </form>
      </div>

      {loading ? <div className="spt-skeleton" /> : error ? (
        <div className="spt-card spt-state">
          <h3>Unable to load promotions</h3><p>{error}</p>
          <button type="button" className="spt-btn" onClick={load}>Try again</button>
        </div>
      ) : promos.length === 0 ? (
        <div className="spt-card spt-state"><h3>No promotions available</h3><p>{search ? 'No promotions match your search.' : 'No active promotions.'}</p></div>
      ) : (
        <div className="spt-promos">
          {promos.map((p) => (
            <article key={p._id} className={`spt-promo${p._id === selectedId ? ' selected' : ''}`}>
              <div className="spt-value">{valueText(p)}</div>
              <h3>{p.name}</h3>
              {p.description && <p>{p.description}</p>}
              <div className="spt-meta">
                <span className="spt-chip success">Active</span>
                <span className="spt-chip">{SCOPE_LABEL[p.scope]}</span>
                {p.type === 'percent' && p.maxDiscount != null && <span className="spt-chip warn">Up to {formatCurrency(p.maxDiscount)}</span>}
              </div>
              {scopeDetail(p) && <p>Applies to: {scopeDetail(p)}</p>}
              <p>Valid: {fmtDate(p.startDate)} – {fmtDate(p.endDate)}</p>
              <button type="button" className={`spt-btn${p._id === selectedId ? '' : ' ghost'}`} onClick={() => selectPromo(p._id)}>
                {p._id === selectedId ? 'Selected for order' : 'Select for order'}
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="spt-section-title"><h2>Apply to a counter order</h2></div>
      <div className="spt-grid">
        <div className="spt-card">
          <h2>Order items</h2>
          <form className="spt-search" style={{ maxWidth: 'none' }} onSubmit={onFind}>
            <input className="spt-input" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search products to add..." maxLength={100} />
            <button type="submit" className="spt-btn" disabled={finding}>{finding ? 'Searching...' : 'Search'}</button>
          </form>
          {found.length > 0 && (
            <ul className="spt-results">
              {found.map((p) => (
                <li key={p._id}>
                  <span>{p.name} <span className="spt-sub">· {formatCurrency(p.price)} / {p.unit}</span></span>
                  <button type="button" className="spt-btn sm" onClick={() => addProduct(p)}>Add</button>
                </li>
              ))}
            </ul>
          )}
          {lines.length === 0 ? (
            <div className="spt-state">No items yet. Search for products and add them to the order.</div>
          ) : (
            <ul className="spt-lines">
              {lines.map((l) => {
                const r = resultByProduct.get(l.product._id);
                return (
                  <li key={l.product._id} className="spt-line">
                    <div className="spt-line-info">
                      <span className="spt-line-name">{l.product.name}</span>
                      <span className="spt-sub">{formatCurrency(l.product.price)} / {l.product.unit}</span>
                      {r && r.discountAmount > 0 && <span className="spt-line-disc">Save {formatCurrency(r.discountAmount)}</span>}
                    </div>
                    <input className="spt-input" type="number" min="1" max="999" value={l.quantity} aria-label={`Quantity for ${l.product.name}`}
                      onChange={(e) => setQty(l.product._id, e.target.value)} />
                    <span className="spt-line-total">{formatCurrency(r ? r.lineTotal : l.product.price * l.quantity)}</span>
                    <button type="button" className="spt-btn spt-remove sm" onClick={() => removeLine(l.product._id)}>Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="spt-side">
          <div className="spt-card">
            <h2>Select a promotion</h2>
            {promos.length === 0 ? <p className="spt-sub">No promotions available.</p> : (
              <div className="spt-radio" role="radiogroup" aria-label="Promotions">
                {promos.map((p) => (
                  <label key={p._id} className={p._id === selectedId ? 'on' : ''}>
                    <input type="radio" name="promo" checked={p._id === selectedId} onChange={() => selectPromo(p._id)} />
                    <span><b>{p.name}</b><br /><span className="spt-sub">{valueText(p)}</span></span>
                  </label>
                ))}
              </div>
            )}

            <div className="spt-rows">
              <div className="spt-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {result && <>
                <div className="spt-row discount"><span>Promotions: {result.promotion.name}</span><span>- {formatCurrency(result.discount)}</span></div>
                <div className="spt-sep" />
                <div className="spt-row strong"><span>Total</span><span>{formatCurrency(result.totalAmount)}</span></div>
              </>}
            </div>

            <button type="button" className="spt-btn" style={{ width: '100%', marginTop: 16 }}
              disabled={!selected || lines.length === 0 || applying} onClick={onApply}>
              {applying ? 'Checking...' : 'Apply promotion'}
            </button>

            {result && (
              <div className="spt-banner success"><strong>Promotion applied</strong><span>The discount of {formatCurrency(result.discount)} was calculated using current prices.</span></div>
            )}
            {applyError && (
              <div className="spt-banner error" role="alert"><strong>Unable to apply</strong><span>{applyError}. The order total is unchanged. Select another promotion or continue without one.</span></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
