import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/checkout.css';
import { previewCheckout, createOrder } from '../../api/order.api';
import { createOnlinePayment } from '../../api/payment.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import PriceSummary from '../../components/checkout/PriceSummary';
import PaymentMethodPicker from '../../components/checkout/PaymentMethodPicker';
import { newIdempotencyKey } from '../../utils/idempotency';
import { formatCurrency } from '../../utils/format';
import { CHECKOUT_METHODS } from '../../utils/orderMeta';

// UC-08.1 Create Order: xem lại đơn (giá/khuyến mãi tính ở server), chọn cách thanh toán, đặt hàng.
// Đơn online: sau khi tạo đơn chuyển sang cổng thanh toán (UC-08.2). Tiền mặt: xác nhận ngay.
export default function CheckoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [notice, setNotice] = useState('');        // thông báo cần khách chú ý (giá đổi, hết hàng...)
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);             // chặn bấm đúp trước cả khi state kịp cập nhật
  const keyRef = useRef(newIdempotencyKey());      // giữ nguyên khi gửi lại do lỗi mạng; đổi sau lỗi "dứt khoát"

  const handleAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  const loadPreview = useCallback((code) => {
    setLoading(true); setLoadError('');
    previewCheckout({ discountCode: code || undefined })
      .then((res) => setSummary(res.data))
      .catch(async (err) => { if (!(await handleAuth(err))) setLoadError(err.response?.data?.message || 'Không tải được thông tin đơn hàng. Vui lòng thử lại.'); })
      .finally(() => setLoading(false));
  }, [handleAuth]);

  useEffect(() => { loadPreview(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCode = () => {
    const code = codeInput.trim().toUpperCase();
    setAppliedCode(code); setNotice(''); setSubmitError('');
    keyRef.current = newIdempotencyKey();
    loadPreview(code);
  };
  const clearCode = () => { setCodeInput(''); setAppliedCode(''); keyRef.current = newIdempotencyKey(); loadPreview(''); };

  const submit = async () => {
    if (submittingRef.current || !summary?.canCheckout) return;
    submittingRef.current = true; setSubmitting(true); setSubmitError(''); setNotice('');
    let order;
    try {
      const res = await createOrder({
        paymentMethod: method,
        discountCode: appliedCode || undefined,
        customerNote: note.trim() || undefined,
        expectedTotal: summary.totalAmount,        // để server phát hiện giá đã đổi
      }, keyRef.current);
      order = res.data.order;
    } catch (err) {
      if (await handleAuth(err)) return;
      const status = err.response?.status;
      const data = err.response?.data || {};
      if (!err.response || status >= 500) {
        // Không biết đơn đã tạo chưa: GIỮ nguyên khoá, bấm lại sẽ nhận đúng đơn cũ nếu đã tạo (không đặt trùng)
        setSubmitError('Chưa nhận được phản hồi từ hệ thống. Bạn có thể bấm "Đặt hàng" lại, hệ thống sẽ không tạo đơn trùng.');
      } else {
        keyRef.current = newIdempotencyKey();
        if (data.code === 'PRICE_CHANGED' && data.summary) { setSummary(data.summary); setNotice(data.message); }
        else if (data.code === 'CART_ISSUES' || data.code === 'INSUFFICIENT_STOCK') { if (data.summary) setSummary(data.summary); else loadPreview(appliedCode); setNotice(data.message); }
        else if (data.code === 'INVALID_DISCOUNT_CODE') { setAppliedCode(''); setNotice(data.message); loadPreview(''); }
        else setSubmitError(data.message || 'Không đặt được hàng. Vui lòng thử lại.');
      }
      submittingRef.current = false; setSubmitting(false);
      return;
    }

    // Đơn đã tạo. Tiền mặt -> xong. Online -> sang cổng thanh toán.
    if (method === 'cash') { navigate(`/payment/result?orderId=${order._id}`, { replace: true }); return; }
    try {
      const pay = await createOnlinePayment({ orderId: order._id, method });
      window.location.href = pay.data.paymentUrl;
    } catch (err) {
      // Đơn đã giữ hàng nhưng chưa tạo được link: đưa khách tới trang thanh toán để thử lại, không mất đơn
      navigate(`/orders/${order._id}/pay`, { replace: true, state: { error: err.response?.data?.message || 'Chưa kết nối được cổng thanh toán. Bạn có thể thử lại.' } });
    }
  };

  const crumb = (
    <nav className="co-crumb" aria-label="Breadcrumb">
      <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
      <Link to="/cart">Giỏ hàng</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Đặt hàng</span>
    </nav>
  );

  if (loading && !summary) return <div className="co">{crumb}<div className="co-skeleton" aria-busy="true" aria-label="Đang tải đơn hàng" /></div>;

  if (loadError) {
    return (
      <div className="co">{crumb}
        <div className="co-state" role="alert"><Icon name="cloud_off" size="xl" /><h2>Chưa tải được đơn hàng</h2><p>{loadError}</p>
          <button type="button" className="co-btn" onClick={() => loadPreview(appliedCode)}><Icon name="refresh" size="md" />Thử lại</button></div>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="co">{crumb}
        <div className="co-state"><Icon name="shopping_cart" size="xl" /><h2>Giỏ hàng đang trống</h2><p>Hãy thêm sản phẩm vào giỏ trước khi đặt hàng.</p>
          <Link className="co-btn" to="/products"><Icon name="storefront" size="md" />Xem sản phẩm</Link></div>
      </div>
    );
  }

  const store = summary.store;
  const online = method !== 'cash';

  return (
    <div className="co">
      {crumb}
      <h1 className="co-title">Xác nhận đơn hàng</h1>

      {notice && (
        <div className="co-alert warn" role="alert"><Icon name="warning" size="lg" /><div><strong>{notice}</strong><span>Thông tin bên dưới là giá và tồn kho mới nhất. Vui lòng xem lại rồi bấm "Đặt hàng" nếu đồng ý.</span></div></div>
      )}
      {summary.issues.length > 0 && (
        <div className="co-alert error" role="alert">
          <Icon name="error" size="lg" />
          <div>
            <strong>Một số sản phẩm không thể đặt:</strong>
            <ul>{summary.issues.map((i) => (
              <li key={`${i.productId}-${i.type}`}>{i.name}: {i.type === 'unavailable' ? 'không còn bán' : i.available > 0 ? `chỉ còn ${i.available} sản phẩm` : 'đã hết hàng'}</li>
            ))}</ul>
            <Link to="/cart">Quay lại giỏ hàng để chỉnh sửa</Link>
          </div>
        </div>
      )}

      <div className="co-grid">
        <div className="co-main">
          <section className="co-card">
            <h2><Icon name="shopping_basket" />Sản phẩm ({summary.items.reduce((s, i) => s + i.quantity, 0)})</h2>
            <ul className="co-items">
              {summary.items.map((it) => (
                <li key={it.productId}>
                  <div className="co-thumb">{it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}</div>
                  <div className="co-item-info">
                    <b>{it.name}</b>
                    <span>{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}</span>
                    {it.discountAmount > 0 && <em>Giảm {formatCurrency(it.discountAmount)}</em>}
                  </div>
                  <div className="co-item-total">{formatCurrency(it.lineTotal)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="co-card">
            <h2><Icon name="store" />Nhận hàng tại cửa hàng</h2>
            {store ? (
              <div className="co-store"><b>{store.name}</b>
                {store.address && <span><Icon name="location_on" size="md" />{store.address}</span>}
                {store.phone && <span><Icon name="call" size="md" />{store.phone}</span>}
              </div>
            ) : <p className="co-muted">Cửa hàng sẽ thông báo địa điểm nhận hàng.</p>}
            <p className="co-muted">Đơn hàng được chuẩn bị sẵn tại quầy. Khi đến nhận, bạn đọc <b>mã đơn</b> cho nhân viên.</p>
            <label className="co-label" htmlFor="co-note">Ghi chú cho cửa hàng (không bắt buộc)</label>
            <textarea id="co-note" className="co-note" maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: cho mình xin túi giấy" />
          </section>

          <section className="co-card">
            <h2><Icon name="credit_card" />Phương thức thanh toán</h2>
            <PaymentMethodPicker methods={CHECKOUT_METHODS} value={method} onChange={setMethod} disabled={submitting} />
            {online && <p className="co-muted">Sau khi đặt hàng bạn được chuyển sang cổng thanh toán. Hàng được giữ trong 15 phút, quá hạn đơn sẽ tự hủy.</p>}
          </section>
        </div>

        <aside className="co-side">
          <h2>Tổng kết</h2>
          <div className="co-code">
            <label htmlFor="co-code">Mã giảm giá</label>
            {appliedCode && summary.discountCode ? (
              <div className="co-code-on"><span><Icon name="sell" size="md" fill />{summary.discountCode.code}</span><button type="button" onClick={clearCode}>Bỏ mã</button></div>
            ) : (
              <div className="co-code-row">
                <input id="co-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Nhập mã" maxLength={30} onKeyDown={(e) => { if (e.key === 'Enter') applyCode(); }} />
                <button type="button" onClick={applyCode} disabled={!codeInput.trim() || loading}>Áp dụng</button>
              </div>
            )}
            {summary.discountError && <p className="co-code-err" role="alert">{summary.discountError}</p>}
          </div>

          <PriceSummary subtotal={summary.subtotal} appliedPromotions={summary.appliedPromotions} promotionDiscount={summary.promotionDiscount}
            discountCode={summary.discountCode} totalAmount={summary.totalAmount} />

          {submitError && <p className="co-error" role="alert"><Icon name="error" size="md" />{submitError}</p>}
          <button type="button" className="co-btn block" onClick={submit} disabled={submitting || loading || !summary.canCheckout}>
            {submitting ? 'Đang xử lý…' : online ? 'Đặt hàng và thanh toán' : 'Đặt hàng'}
            {!submitting && <Icon name="arrow_forward" size="md" />}
          </button>
          <Link className="co-link" to="/cart">Quay lại giỏ hàng</Link>
        </aside>
      </div>
    </div>
  );
}
