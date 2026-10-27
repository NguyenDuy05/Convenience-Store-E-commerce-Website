import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPromotions, applyPromotion } from '../../api/promotion.api';
import { listProducts } from '../../api/product.api';
import { formatCurrency } from '../../utils/format';
import '../../styles/staff-promotions.css';

const SCOPE_LABEL = { all: 'Toàn bộ sản phẩm', category: 'Theo danh mục', product: 'Theo sản phẩm' };
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
const valueText = (p) => (p.type === 'percent' ? `Giảm ${p.value}%` : `Giảm ${formatCurrency(p.value)}`);
const scopeDetail = (p) => {
  if (p.scope === 'category') return p.categories.map((c) => c.name).filter(Boolean).join(', ');
  if (p.scope === 'product') return p.products.map((x) => x.name).filter(Boolean).join(', ');
  return '';
};

// UC-20.1 View Promotions, UC-20.2 Apply Promotion
export default function StaffPromotionsPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [lines, setLines] = useState([]);           // [{ product, quantity }]
  const [pq, setPq] = useState('');
  const [found, setFound] = useState([]);
  const [finding, setFinding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);       // kết quả áp dụng thành công
  const [applyError, setApplyError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    listPromotions({ q: search || undefined })
      .then((res) => setPromos(res.data.items))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được danh sách khuyến mãi.'))
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
      .catch((err) => setApplyError(err.response?.data?.message || 'Không áp dụng được khuyến mãi. Vui lòng thử lại.'))
      .finally(() => setApplying(false));
  };

  return (
    <section className="spt">
      <nav className="spt-crumb" aria-label="Breadcrumb">
        <Link to="/staff">Nhân viên</Link><span>›</span><span aria-current="page">Khuyến mãi</span>
      </nav>
      <div className="spt-head">
        <h1>Khuyến mãi</h1>
        <p>Xem các khuyến mãi đang hoạt động và áp dụng cho đơn tại quầy. Mức giảm luôn được hệ thống tính lại từ giá hiện tại.</p>
      </div>

      <div className="spt-section-title">
        <h2>Đang hoạt động</h2>
        <form className="spt-search" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <input className="spt-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm khuyến mãi..." maxLength={100} />
          <button type="submit" className="spt-btn">Tìm</button>
        </form>
      </div>

      {loading ? <div className="spt-skeleton" /> : error ? (
        <div className="spt-card spt-state">
          <h3>Không tải được khuyến mãi</h3><p>{error}</p>
          <button type="button" className="spt-btn" onClick={load}>Thử lại</button>
        </div>
      ) : promos.length === 0 ? (
        <div className="spt-card spt-state"><h3>Hiện chưa có khuyến mãi nào</h3><p>{search ? 'Không có khuyến mãi phù hợp với từ khóa.' : 'Chưa có khuyến mãi đang hoạt động.'}</p></div>
      ) : (
        <div className="spt-promos">
          {promos.map((p) => (
            <article key={p._id} className={`spt-promo${p._id === selectedId ? ' selected' : ''}`}>
              <div className="spt-value">{valueText(p)}</div>
              <h3>{p.name}</h3>
              {p.description && <p>{p.description}</p>}
              <div className="spt-meta">
                <span className="spt-chip success">Đang hoạt động</span>
                <span className="spt-chip">{SCOPE_LABEL[p.scope]}</span>
                {p.type === 'percent' && p.maxDiscount != null && <span className="spt-chip warn">Tối đa {formatCurrency(p.maxDiscount)}</span>}
              </div>
              {scopeDetail(p) && <p>Áp dụng: {scopeDetail(p)}</p>}
              <p>Hiệu lực: {fmtDate(p.startDate)} – {fmtDate(p.endDate)}</p>
              <button type="button" className={`spt-btn${p._id === selectedId ? '' : ' ghost'}`} onClick={() => selectPromo(p._id)}>
                {p._id === selectedId ? 'Đã chọn cho đơn' : 'Chọn cho đơn'}
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="spt-section-title"><h2>Áp dụng vào đơn tại quầy</h2></div>
      <div className="spt-grid">
        <div className="spt-card">
          <h2>Sản phẩm trong đơn</h2>
          <form className="spt-search" style={{ maxWidth: 'none' }} onSubmit={onFind}>
            <input className="spt-input" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Tìm sản phẩm để thêm..." maxLength={100} />
            <button type="submit" className="spt-btn" disabled={finding}>{finding ? 'Đang tìm...' : 'Tìm'}</button>
          </form>
          {found.length > 0 && (
            <ul className="spt-results">
              {found.map((p) => (
                <li key={p._id}>
                  <span>{p.name} <span className="spt-sub">· {formatCurrency(p.price)} / {p.unit}</span></span>
                  <button type="button" className="spt-btn sm" onClick={() => addProduct(p)}>Thêm</button>
                </li>
              ))}
            </ul>
          )}
          {lines.length === 0 ? (
            <div className="spt-state">Chưa có sản phẩm nào. Hãy tìm và thêm sản phẩm vào đơn.</div>
          ) : (
            <ul className="spt-lines">
              {lines.map((l) => {
                const r = resultByProduct.get(l.product._id);
                return (
                  <li key={l.product._id} className="spt-line">
                    <div className="spt-line-info">
                      <span className="spt-line-name">{l.product.name}</span>
                      <span className="spt-sub">{formatCurrency(l.product.price)} / {l.product.unit}</span>
                      {r && r.discountAmount > 0 && <span className="spt-line-disc">Giảm {formatCurrency(r.discountAmount)}</span>}
                    </div>
                    <input className="spt-input" type="number" min="1" max="999" value={l.quantity} aria-label={`Số lượng ${l.product.name}`}
                      onChange={(e) => setQty(l.product._id, e.target.value)} />
                    <span className="spt-line-total">{formatCurrency(r ? r.lineTotal : l.product.price * l.quantity)}</span>
                    <button type="button" className="spt-btn spt-remove sm" onClick={() => removeLine(l.product._id)}>Xóa</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="spt-side">
          <div className="spt-card">
            <h2>Chọn khuyến mãi</h2>
            {promos.length === 0 ? <p className="spt-sub">Không có khuyến mãi khả dụng.</p> : (
              <div className="spt-radio" role="radiogroup" aria-label="Khuyến mãi">
                {promos.map((p) => (
                  <label key={p._id} className={p._id === selectedId ? 'on' : ''}>
                    <input type="radio" name="promo" checked={p._id === selectedId} onChange={() => selectPromo(p._id)} />
                    <span><b>{p.name}</b><br /><span className="spt-sub">{valueText(p)}</span></span>
                  </label>
                ))}
              </div>
            )}

            <div className="spt-rows">
              <div className="spt-row"><span>Tạm tính</span><span>{formatCurrency(subtotal)}</span></div>
              {result && <>
                <div className="spt-row discount"><span>Khuyến mãi: {result.promotion.name}</span><span>- {formatCurrency(result.discount)}</span></div>
                <div className="spt-sep" />
                <div className="spt-row strong"><span>Tổng thanh toán</span><span>{formatCurrency(result.totalAmount)}</span></div>
              </>}
            </div>

            <button type="button" className="spt-btn" style={{ width: '100%', marginTop: 16 }}
              disabled={!selected || lines.length === 0 || applying} onClick={onApply}>
              {applying ? 'Đang kiểm tra...' : 'Áp dụng khuyến mãi'}
            </button>

            {result && (
              <div className="spt-banner success"><strong>Đã áp dụng khuyến mãi</strong><span>Mức giảm {formatCurrency(result.discount)} đã được hệ thống tính lại từ giá hiện tại.</span></div>
            )}
            {applyError && (
              <div className="spt-banner error" role="alert"><strong>Không thể áp dụng</strong><span>{applyError}. Tổng tiền đơn không thay đổi, bạn có thể chọn khuyến mãi khác hoặc tiếp tục không dùng khuyến mãi.</span></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
