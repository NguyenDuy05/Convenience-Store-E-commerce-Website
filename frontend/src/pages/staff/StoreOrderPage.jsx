import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../../api/product.api';
import { listPromotions } from '../../api/promotion.api';
import { quoteStoreOrder, createStoreOrder } from '../../api/order.api';
import { formatCurrency } from '../../utils/format';
import '../../styles/store-order.css';

const newKey = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// UC-21 Create Store Order (Staff): chọn sản phẩm -> kiểm tra giá/tồn kho -> áp dụng khuyến mãi -> tạo đơn chờ thanh toán
export default function StoreOrderPage() {
  const [lines, setLines] = useState([]);              // [{ product, quantity }]
  const [promos, setPromos] = useState([]);
  const [promotionId, setPromotionId] = useState('');
  const [note, setNote] = useState('');
  const [pq, setPq] = useState('');
  const [found, setFound] = useState([]);
  const [finding, setFinding] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);        // { type: 'error' | 'warn', title, text }
  const [done, setDone] = useState(null);              // { order, idempotent }
  const keyRef = useRef(newKey());

  useEffect(() => {
    listPromotions().then((res) => setPromos(Array.isArray(res.data?.items) ? res.data.items : [])).catch(() => setPromos([]));
  }, []);

  const payloadItems = useMemo(() => lines.map((l) => ({ productId: l.product._id, quantity: l.quantity })), [lines]);

  // Mỗi lần đơn thay đổi: cấp key mới (đơn khác) và tính lại giá + kiểm tra tồn kho từng dòng (21.3, 21.4)
  useEffect(() => {
    keyRef.current = newKey();
    if (payloadItems.length === 0) { setQuote(null); setQuoteError(''); return undefined; }
    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(() => {
      quoteStoreOrder({ items: payloadItems, promotionId: promotionId || undefined })
        .then((res) => { if (!cancelled) { setQuote(res.data); setQuoteError(''); } })
        .catch((err) => { if (!cancelled) { setQuote(null); setQuoteError(err.response?.data?.message || 'Không kiểm tra được đơn hàng. Vui lòng thử lại.'); } })
        .finally(() => { if (!cancelled) setQuoting(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [payloadItems, promotionId, note]);

  const onFind = (e) => {
    e.preventDefault();
    if (!pq.trim()) return;
    setFinding(true);
    listProducts({ q: pq.trim(), limit: 8 })
      .then((res) => setFound((Array.isArray(res.data?.items) ? res.data.items : []).filter((p) => p.status === 'active')))
      .catch(() => setFound([]))
      .finally(() => setFinding(false));
  };

  const addProduct = (product) => {
    setMessage(null);
    setLines((cur) => {
      const i = cur.findIndex((l) => l.product._id === product._id);
      if (i >= 0) return cur.map((l, k) => (k === i ? { ...l, quantity: Math.min(l.quantity + 1, 999) } : l));
      return [...cur, { product, quantity: 1 }];
    });
  };
  const setQty = (id, v) => {
    setMessage(null);
    const n = Math.max(1, Math.min(999, parseInt(v, 10) || 1));
    setLines((cur) => cur.map((l) => (l.product._id === id ? { ...l, quantity: n } : l)));
  };
  const removeLine = (id) => { setMessage(null); setLines((cur) => cur.filter((l) => l.product._id !== id)); };

  const quoteLine = (id) => (quote?.lines || []).find((l) => String(l.productId) === String(id));
  const issueFor = (id) => (quote?.issues || []).find((i) => String(i.productId) === String(id));
  const canCreate = !!quote?.canCreate && !quoting && !submitting;

  const onCreate = () => {
    setSubmitting(true);
    setMessage(null);
    createStoreOrder({
      idempotencyKey: keyRef.current, items: payloadItems, promotionId: promotionId || undefined,
      customerNote: note.trim() || undefined, expectedTotal: quote?.totalAmount,
    })
      .then((res) => setDone({ order: res.data.order, idempotent: res.data.idempotent }))
      .catch((err) => {
        const r = err.response;
        if (!r) {
          // Không nhận được phản hồi: kết quả chưa chắc chắn. Bấm lại sẽ dùng cùng mã chống trùng nên không tạo đơn thứ hai.
          setMessage({ type: 'warn', title: 'Chưa xác nhận được kết quả', text: 'Mất kết nối khi tạo đơn. Hãy bấm "Tạo đơn" lại: hệ thống sẽ kiểm tra và không tạo đơn trùng.' });
          return;
        }
        if (r.data?.quote) setQuote({ ...r.data.quote, canCreate: false });
        if (r.data?.code === 'TOTAL_CHANGED') {
          setQuote({ ...r.data.quote, canCreate: true });
          setMessage({ type: 'warn', title: 'Giá hoặc khuyến mãi đã thay đổi', text: `Tổng tiền mới là ${formatCurrency(r.data.quote.totalAmount)}. Vui lòng kiểm tra lại rồi bấm "Tạo đơn" để xác nhận.` });
        } else {
          setMessage({ type: 'error', title: 'Không tạo được đơn', text: r.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
        }
      })
      .finally(() => setSubmitting(false));
  };

  const reset = () => {
    setDone(null); setLines([]); setPromotionId(''); setNote(''); setFound([]); setPq(''); setQuote(null); setMessage(null);
    keyRef.current = newKey();
  };

  if (done) {
    const o = done.order;
    return (
      <section className="sop">
        <div className="sop-card sop-done">
          <span className="sop-chip">Chờ thanh toán</span>
          <h2>{done.idempotent ? 'Đơn này đã được tạo trước đó' : 'Đã tạo đơn tại quầy'}</h2>
          <div className="sop-code">{o.orderCode}</div>
          <div className="sop-rows">
            {o.items.map((i) => <div className="sop-row" key={i.productId}><span>{i.name} × {i.quantity}</span><span>{formatCurrency(i.lineTotal)}</span></div>)}
            <div className="sop-sep" />
            <div className="sop-row"><span>Tạm tính</span><span>{formatCurrency(o.subtotal)}</span></div>
            {o.promotionDiscount > 0 && <div className="sop-row discount"><span>Khuyến mãi</span><span>- {formatCurrency(o.promotionDiscount)}</span></div>}
            <div className="sop-row strong"><span>Tổng thanh toán</span><span>{formatCurrency(o.totalAmount)}</span></div>
          </div>
          <div className="sop-banner"><strong>Bước tiếp theo: thanh toán</strong><span>Đơn đang ở trạng thái chờ thanh toán và chưa được ghi nhận là đã trả tiền.</span></div>
          <div className="sop-actions">
            <Link className="sop-btn" to="/staff/payment">Đến bước thanh toán</Link>
            <button type="button" className="sop-btn ghost" onClick={reset}>Tạo đơn mới</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sop">
      <nav className="sop-crumb" aria-label="Breadcrumb">
        <Link to="/staff">Nhân viên</Link><span>›</span><span aria-current="page">Tạo đơn tại quầy</span>
      </nav>
      <div className="sop-head">
        <h1>Tạo đơn tại quầy</h1>
        <p>Chọn sản phẩm và số lượng. Hệ thống kiểm tra tồn kho và tính lại giá từ dữ liệu hiện tại trước khi tạo đơn.</p>
      </div>

      <div className="sop-grid">
        <div className="sop-card">
          <h2>Sản phẩm trong đơn</h2>
          <form className="sop-search" onSubmit={onFind}>
            <input className="sop-input" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Tìm sản phẩm để thêm..." maxLength={100} aria-label="Tìm sản phẩm" />
            <button type="submit" className="sop-btn" disabled={finding}>{finding ? 'Đang tìm...' : 'Tìm'}</button>
          </form>
          {found.length > 0 && (
            <ul className="sop-results">
              {found.map((p) => (
                <li key={p._id}>
                  <span>{p.name} <span className="sop-sub">· {formatCurrency(p.price)} / {p.unit} · còn {p.stockQuantity}</span></span>
                  <button type="button" className="sop-btn sm" disabled={p.stockQuantity < 1} onClick={() => addProduct(p)}>{p.stockQuantity < 1 ? 'Hết hàng' : 'Thêm'}</button>
                </li>
              ))}
            </ul>
          )}
          {lines.length === 0 ? (
            <div className="sop-state">Chưa có sản phẩm nào. Hãy tìm và thêm sản phẩm vào đơn.</div>
          ) : (
            <ul className="sop-lines">
              {lines.map((l) => {
                const q = quoteLine(l.product._id);
                const issue = issueFor(l.product._id);
                return (
                  <li key={l.product._id} className={`sop-line${issue ? ' bad' : ''}`}>
                    <div className="sop-line-info">
                      <span className="sop-line-name">{l.product.name}</span>
                      <span className="sop-sub">{formatCurrency(q?.unitPrice ?? l.product.price)} / {l.product.unit}</span>
                      {q && q.discountAmount > 0 && <span className="sop-line-disc">Giảm {formatCurrency(q.discountAmount)}</span>}
                      {issue && <span className="sop-line-err" role="alert">{issue.message}</span>}
                    </div>
                    <input className="sop-input" type="number" min="1" max="999" value={l.quantity} aria-label={`Số lượng ${l.product.name}`} onChange={(e) => setQty(l.product._id, e.target.value)} />
                    <span className="sop-line-total">{formatCurrency(q ? q.lineTotal : l.product.price * l.quantity)}</span>
                    <button type="button" className="sop-btn sop-remove sm" onClick={() => removeLine(l.product._id)}>Xóa</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="sop-side">
          <div className="sop-card">
            <h2>Xem lại và tạo đơn</h2>
            <label className="sop-field">Khuyến mãi
              <select className="sop-input" value={promotionId} onChange={(e) => { setMessage(null); setPromotionId(e.target.value); }}>
                <option value="">Không dùng khuyến mãi</option>
                {promos.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </label>
            <label className="sop-field">Ghi chú đơn hàng
              <textarea className="sop-input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
            </label>

            <div className="sop-rows">
              <div className="sop-row"><span>Tạm tính</span><span>{quote ? formatCurrency(quote.subtotal) : '—'}</span></div>
              {quote && quote.discount > 0 && <div className="sop-row discount"><span>Khuyến mãi: {quote.promotion?.name}</span><span>- {formatCurrency(quote.discount)}</span></div>}
              <div className="sop-sep" />
              <div className="sop-row strong"><span>Tổng thanh toán</span><span>{quote ? formatCurrency(quote.totalAmount) : '—'}</span></div>
            </div>

            {quoting && <p className="sop-sub" style={{ marginTop: 8 }}>Đang kiểm tra giá và tồn kho...</p>}
            {quoteError && <div className="sop-banner error" role="alert"><strong>Không kiểm tra được đơn</strong><span>{quoteError}</span></div>}
            {quote?.promoError && <div className="sop-banner warn"><strong>Chưa áp dụng được khuyến mãi</strong><span>{quote.promoError}. Hãy chọn khuyến mãi khác hoặc bỏ chọn.</span></div>}
            {quote?.issues?.length > 0 && <div className="sop-banner error" role="alert"><strong>Cần chỉnh sửa trước khi tạo đơn</strong><span>Các dòng sản phẩm bị lỗi được đánh dấu ở danh sách bên trái.</span></div>}
            {message && <div className={`sop-banner ${message.type}`} role="alert"><strong>{message.title}</strong><span>{message.text}</span></div>}

            <button type="button" className="sop-btn block" style={{ marginTop: 16 }} disabled={!canCreate} onClick={onCreate}>
              {submitting ? 'Đang tạo đơn...' : 'Tạo đơn'}
            </button>
            <p className="sop-sub" style={{ marginTop: 8 }}>Đơn được tạo ở trạng thái chờ thanh toán. Tồn kho được trừ khi tạo đơn.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
