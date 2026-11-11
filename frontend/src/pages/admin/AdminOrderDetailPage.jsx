import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/admin-order-detail.css';
import { getOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import PriceSummary from '../../components/checkout/PriceSummary';
import AdminOrderStatusActions from '../../components/admin/AdminOrderStatusActions';
import AdminCancelOrder from '../../components/admin/AdminCancelOrder';
import OrderIssues from '../../components/admin/OrderIssues';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/orderMeta';

const TXN_STATUS = { success: "Successful", failed: "Failed", pending: "Pending", refunded: "Refunded to wallet" };

// UC-34.3 Chi tiết đơn của admin: chuyển trạng thái, hủy đơn, sự cố
export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onAuthError = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await getOrder(id);
      setOrder(res.data); setError(null);
    } catch (err) {
      if (await onAuthError(err)) return;
      const notFound = err.response?.status === 404;
      setError({ notFound, message: notFound ? "This order does not exist." : (err.response?.data?.message || "Could not load order details. Please try again.") });
    } finally { setLoading(false); }
  }, [id, onAuthError]);

  useEffect(() => { setOrder(null); load(true); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/admin/orders';
  const crumb = (
    <nav className="aod-crumb" aria-label="Breadcrumb">
      <Link to="/admin">Admin</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Orders</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{order ? `#${order.orderCode}` : "Order details"}</span>
    </nav>
  );

  if (loading && !order) return <div className="aod">{crumb}<div className="aod-skeleton" aria-busy="true" aria-label="Loading order details" /></div>;

  if (error && !order) {
    return (
      <div className="aod">{crumb}
        <div className="aod-state" role="alert"><Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? "Order not found" : "Could not load the order"}</h2><p>{error.message}</p>
          <div className="aod-state-actions">
            {!error.notFound && <button type="button" className="aod-btn" onClick={() => load(true)}><Icon name="refresh" size="md" />Try again</button>}
            <Link className="aod-btn ghost" to="/admin/orders"><Icon name="arrow_back" size="md" />Back to list</Link></div></div>
      </div>
    );
  }

  const openIssues = order.issues.filter((i) => i.status === 'open').length;
  const reviewTxns = order.transactions.filter((t) => t.needsReview).length;
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const pay = PAYMENT_STATUS[order.paymentStatus];

  return (
    <div className="aod">
      {crumb}

      <header className="aod-head">
        <div>
          <div className="aod-title-row">
            <h1>Order #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
            <span className="aod-chip">{ORDER_SOURCE[order.source]}</span>
          </div>
          <p>Placed on {formatDateTime(order.createdAt)} • {itemCount} items • {formatCurrency(order.totalAmount)}</p>
        </div>
        <Link className="aod-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Back to list</Link>
      </header>

      {error && <div className="aod-warn" role="alert"><Icon name="warning" size="lg" /><span>{error.message} The information below may be out of date.</span><button type="button" onClick={() => load()}>Reload</button></div>}
      {(openIssues > 0 || reviewTxns > 0) && (
        <div className="aod-alert" role="status"><Icon name="report" size="lg" fill />
          <div><strong>This order needs attention</strong>
            <span>{openIssues > 0 && `${openIssues} unresolved issues. `}{reviewTxns > 0 && `${reviewTxns} payment transactions need review.`}</span></div>
          <a href="#issues">View issues</a></div>
      )}

      <AdminOrderStatusActions key={`${order.status}-${order.updatedAt}`} order={order} onChanged={() => load()} onAuthError={onAuthError} />
      <AdminCancelOrder order={order} onChanged={() => load()} onAuthError={onAuthError} />

      <div className="aod-grid">
        <div className="aod-col">
          <section className="aod-card">
            <h2><Icon name="shopping_basket" />Order items</h2>
            <ul className="aod-items">
              {order.items.map((it, i) => (
                <li key={`${it.sku || it.name}-${i}`}>
                  <div className="aod-thumb">{it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}</div>
                  <div className="aod-item-info"><b>{it.name}</b>
                    <span>{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}{it.sku ? ` • SKU ${it.sku}` : ''}</span>
                    {it.discountAmount > 0 && <em>Discount {formatCurrency(it.discountAmount)}</em>}</div>
                  <div className="aod-item-total">{formatCurrency(it.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <PriceSummary subtotal={order.subtotal} appliedPromotions={order.appliedPromotions} promotionDiscount={order.promotionDiscount}
              discountCode={order.discountCode} totalAmount={order.totalAmount}>
                {order.walletAmount > 0 && <div className="aod-note">Wallet payment: {formatCurrency(order.walletAmount)}. VNPay remainder: {formatCurrency(order.payableAmount || 0)}.</div>}
              {order.pointsDiscount > 0 && <div className="aod-note">Used {order.pointsUsed} points (−{formatCurrency(order.pointsDiscount)}).</div>}
            </PriceSummary>
          </section>

          <section className="aod-card" id="issues">
            <h2><Icon name="report" />Order issues {openIssues > 0 && <span className="aod-count">{openIssues}</span>}</h2>
            <OrderIssues orderId={order._id} issues={order.issues} onChanged={() => load()} onAuthError={onAuthError} />
          </section>
        </div>

        <div className="aod-col">
          <section className="aod-card">
            <h2><Icon name="person" />Customer</h2>
            {order.customer ? (
              <div className="aod-kv"><Link className="aord-customer-link" to={`/admin/customers?view=${order.customer._id}`} title="View customer details"><b>{order.customer.fullName}</b><Icon name="open_in_new" size="sm" /></Link><span>{order.customer.email}</span>{order.customer.phone && <span>{order.customer.phone}</span>}</div>
            ) : <p className="aod-muted">Walk-in customer (no account).</p>}
            {order.createdBy && <p className="aod-muted">Order created by: <b>{order.createdBy}</b></p>}
            {order.customerNote && <div className="aod-note"><Icon name="sticky_note_2" size="md" /><span>{order.customerNote}</span></div>}
            {order.store && <p className="aod-muted"><Icon name="store" size="md" />Pickup at {order.store.name}{order.store.address ? `, ${order.store.address}` : ''}</p>}
          </section>

          <section className="aod-card">
            <h2><Icon name="credit_card" />Payment</h2>
            <div className="aod-rows">
              <div><span>Method</span><b>{PAYMENT_METHOD[order.paymentMethod] || '—'}</b></div>
              <div><span>Status</span>{pay ? <b className={`aod-pay ${pay.tone}`}>{pay.label}</b> : '—'}</div>
              {order.paidAt && <div><span>Paid at</span><b>{formatDateTime(order.paidAt)}</b></div>}
              {order.readyAt && <div><span>Ready at</span><b>{formatDateTime(order.readyAt)}</b></div>}
              {order.pickedUpAt && <div><span>Collected at</span><b>{formatDateTime(order.pickedUpAt)}</b></div>}
            </div>
            <h3 className="aod-sub">Transactions ({order.transactions.length})</h3>
            {order.transactions.length === 0 && <p className="aod-muted">No transactions yet.</p>}
            <ul className="aod-txns">
              {order.transactions.map((t) => (
                <li key={t._id} className={t.needsReview ? 'review' : ''}>
                  <div><b>{PAYMENT_METHOD[t.method]}</b> • {formatCurrency(t.amount)}<span className={`aod-txn-st ${t.status}`}>{TXN_STATUS[t.status]}</span></div>
                  <small>{t.txnRef ? `Transaction reference ${t.txnRef}` : "In-store transaction"}{t.gateway?.transactionNo ? ` • Gateway reference ${t.gateway.transactionNo}` : ''}{t.processedBy ? ` • ${t.processedBy}` : ''}</small>
                  <small>{formatDateTime(t.paidAt || t.createdAt)}</small>
                  {t.failureReason && <small className="aod-fail">{t.failureReason}</small>}
                  {t.needsReview && <small className="aod-review"><Icon name="flag" size="sm" fill />Review / refund required</small>}
                </li>
              ))}
            </ul>
          </section>

          <section className="aod-card">
            <h2><Icon name="history" />Status history</h2>
            {order.statusHistory.length === 0 && <p className="aod-muted">No history yet.</p>}
            <ol className="aod-history">
              {order.statusHistory.map((h, i) => (
                <li key={`${h.status}-${i}`}>
                  <b>{ORDER_STATUS[h.status]?.label || h.status}</b>
                  <span>{formatDateTime(h.changedAt)} • {h.changedBy || "System"}</span>
                  {h.note && <em>{h.note}</em>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
