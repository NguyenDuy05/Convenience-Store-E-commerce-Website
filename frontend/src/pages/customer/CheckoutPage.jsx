import '../../styles/wallet.css';
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
import CartIcon from '../../components/common/CartIcon';

// UC-08.1 Trang đặt hàng: xem lại đơn, mã giảm giá, ví, đặt hàng
export default function CheckoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [method, setMethod] = useState('vnpay');
  const [note, setNote] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const keyRef = useRef(newIdempotencyKey());

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
      .catch(async (err) => { if (!(await handleAuth(err))) setLoadError(err.response?.data?.message || "Could not load checkout details. Please try again."); })
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
        expectedTotal: summary.totalAmount,
        expectedWalletAmount: Math.min(summary.walletBalance || 0, summary.totalAmount),
      }, keyRef.current);
      order = res.data.order;
    } catch (err) {
      if (await handleAuth(err)) return;
      const status = err.response?.status;
      const data = err.response?.data || {};
      if (!err.response || status >= 500 || data.code === 'CHECKOUT_PROCESSING') {
        setSubmitError("No response received. You can select “Place order” again; duplicate orders will not be created.");
      } else {
        keyRef.current = newIdempotencyKey();
        if (data.code === 'PRICE_CHANGED' && data.summary) { setSummary(previous => ({ ...previous, ...data.summary, estimatedPoints: Math.floor(data.summary.totalAmount / 10000) })); setNotice(data.message); }
        else if (data.code === 'CART_ISSUES' || data.code === 'INSUFFICIENT_STOCK') { if (data.summary) setSummary(previous => ({ ...previous, ...data.summary, estimatedPoints: Math.floor(data.summary.totalAmount / 10000) })); else loadPreview(appliedCode); setNotice(data.message); }
        else if (data.code === 'WALLET_BALANCE_CHANGED') { setNotice(data.message); loadPreview(appliedCode); }
        else if (data.code === 'STORE_CLOSED') { setSubmitError(data.message); loadPreview(appliedCode); }
        else if (data.code === 'INVALID_DISCOUNT_CODE') { setAppliedCode(''); setNotice(data.message); loadPreview(''); }
        else setSubmitError(data.message || "Could not place your order. Please try again.");
      }
      submittingRef.current = false; setSubmitting(false);
      return;
    }

    if (order.paymentStatus === 'paid') { navigate(`/payment/result?orderId=${order._id}`, { replace: true }); return; }
    try {
      const pay = await createOnlinePayment({ orderId: order._id, method });
      window.location.href = pay.data.paymentUrl;
    } catch (err) {
      navigate(`/orders/${order._id}/pay`, { replace: true, state: { error: err.response?.data?.message || "Could not connect to the payment gateway. You can try again." } });
    }
  };

  const crumb = (
    <nav className="co-crumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
      <Link to="/cart">Cart</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Place order</span>
    </nav>
  );

  if (loading && !summary) return <div className="co">{crumb}<div className="co-skeleton" aria-busy="true" aria-label="Loading orders" /></div>;

  if (loadError) {
    return (
      <div className="co">{crumb}
        <div className="co-state" role="alert"><Icon name="cloud_off" size="xl" /><h2>Could not load the order</h2><p>{loadError}</p>
          <button type="button" className="co-btn" onClick={() => loadPreview(appliedCode)}><Icon name="refresh" size="md" />Try again</button></div>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="co">{crumb}
        <div className="co-state"><CartIcon size={40} strokeWidth={1.6} /><h2>Your cart is empty</h2><p>Add products to your cart before checking out.</p>
          <Link className="co-btn" to="/products"><Icon name="storefront" size="md" />Browse products</Link></div>
      </div>
    );
  }

  const store = summary.store;
  const walletAmount = Math.min(summary.walletBalance || 0, summary.totalAmount);
  const payableAmount = summary.totalAmount - walletAmount;
  const online = payableAmount > 0;

  return (
    <div className="co">
      {crumb}
      <h1 className="co-title">Review your order</h1>

      {notice && (
        <div className="co-alert warn" role="alert"><Icon name="warning" size="lg" /><div><strong>{notice}</strong><span>These prices and stock levels are up to date. Review the details, then select “Place order” to confirm.</span></div></div>
      )}
      {summary.storeClosed && (
        <div className="co-alert error" role="alert">
          <Icon name="storefront" size="lg" />
          <div><strong>The store is temporarily closed</strong><span>New orders are currently unavailable. Your cart is saved; please return when the store opens.</span></div>
        </div>
      )}
      {summary.issues.length > 0 && (
        <div className="co-alert error" role="alert">
          <Icon name="error" size="lg" />
          <div>
            <strong>Some items cannot be ordered:</strong>
            <ul>{summary.issues.map((i) => (
              <li key={`${i.productId}-${i.type}`}>{i.name}: {i.type === 'unavailable' ? "no longer available" : i.available > 0 ? `only available: ${i.available} items` : "out of stock"}</li>
            ))}</ul>
            <Link to="/cart">Return to your cart to make changes</Link>
          </div>
        </div>
      )}

      <div className="co-grid">
        <div className="co-main">
          <section className="co-card">
            <h2><Icon name="shopping_basket" />Products ({summary.items.reduce((s, i) => s + i.quantity, 0)})</h2>
            <ul className="co-items">
              {summary.items.map((it) => (
                <li key={it.productId}>
                  <div className="co-thumb">{it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}</div>
                  <div className="co-item-info">
                    <b>{it.name}</b>
                    <span>{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}</span>
                    {it.discountAmount > 0 && <em>Discount {formatCurrency(it.discountAmount)}</em>}
                  </div>
                  <div className="co-item-total">{formatCurrency(it.lineTotal)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="co-card">
            <h2><Icon name="store" />Store pickup</h2>
            {store ? (
              <div className="co-store"><b>{store.name}</b>
                {store.address && <span><Icon name="location_on" size="md" />{store.address}</span>}
                {store.phone && <span><Icon name="call" size="md" />{store.phone}</span>}
              </div>
            ) : <p className="co-muted">The store will provide pickup details.</p>}
            {summary.pickupSchedule && !summary.pickupSchedule.isOpen && <p className="co-alert warn" role="status">{summary.pickupSchedule.notice}</p>}
            <p className="co-muted">Your order will be prepared at the counter. At pickup, give your <b>order code</b> to a staff member.</p>
            <label className="co-label" htmlFor="co-note">Note for the store (optional)</label>
            <textarea id="co-note" className="co-note" maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: Please include a paper bag" />
          </section>

          <section className="co-card">
            <h2><Icon name="credit_card" />Payment method</h2>
            <p className="co-muted">Wallet balance: <b>{formatCurrency(summary.walletBalance || 0)}</b>. Available credit is applied first.</p>
            {online && <PaymentMethodPicker methods={CHECKOUT_METHODS} value={method} onChange={setMethod} disabled={submitting} />}
            {!online && <p>Your wallet covers this order in full.</p>}
            {online && <p className="co-muted">After ordering, you will be redirected to the payment gateway. Items are reserved for 15 minutes; unpaid orders expire automatically.</p>}
          </section>
        </div>

        <aside className="co-side">
          <h2>Order summary</h2>
          <div className="co-code">
            <label htmlFor="co-code">Discount code</label>
            {appliedCode && summary.discountCode ? (
              <div className="co-code-on"><span><Icon name="sell" size="md" fill />{summary.discountCode.code}</span><button type="button" onClick={clearCode}>Remove code</button></div>
            ) : (
              <div className="co-code-row">
                <input id="co-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Enter code" maxLength={30} onKeyDown={(e) => { if (e.key === 'Enter') applyCode(); }} />
                <button type="button" onClick={applyCode} disabled={!codeInput.trim() || loading}>Apply</button>
              </div>
            )}
            {summary.discountError && <p className="co-code-err" role="alert">{summary.discountError}</p>}
          </div>

          <PriceSummary subtotal={summary.subtotal} appliedPromotions={summary.appliedPromotions} promotionDiscount={summary.promotionDiscount}
            discountCode={summary.discountCode} totalAmount={summary.totalAmount} />

          <div className="co-wallet-line"><span>Wallet applied</span><b>{formatCurrency(walletAmount)}</b></div>
          <div className="co-wallet-line"><span>Pay via VNPay</span><b>{formatCurrency(payableAmount)}</b></div>
          <p className="co-policy">Earn {summary.estimatedPoints || Math.floor(summary.totalAmount / 10000)} points after pickup. Cancel before preparation starts; payments received are refunded to your <Link to="/wallet">wallet</Link>.</p>
          {submitError && <p className="co-error" role="alert"><Icon name="error" size="md" />{submitError}</p>}
          <button type="button" className="co-btn block" onClick={submit} disabled={submitting || loading || !summary.canCheckout}>
            {submitting ? "Processing…" : online ? "Place order and pay" : "Place order"}
            {!submitting && <Icon name="arrow_forward" size="md" />}
          </button>
          <Link className="co-link" to="/cart">Back to cart</Link>
        </aside>
      </div>
    </div>
  );
}
