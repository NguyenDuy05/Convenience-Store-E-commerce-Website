import CustomerCancelOrder from '../../components/order/CustomerCancelOrder';
import '../../styles/wallet.css';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-detail.css';
import { getMyOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { PAYMENT_METHOD, PAYMENT_STATUS, SHOW_PICKUP_CODE, statusMessage } from '../../utils/orderMeta';

// Giờ mở cửa hôm nay của cửa hàng
const todayHours = (store) => {
  const h = store?.openingHours?.find((x) => x.day === new Date().getDay());
  if (!h) return '';
  return h.isClosed ? "The store is closed today" : `Today ${h.openTime} – ${h.closeTime}`;
};

// Một dòng trong bảng tổng tiền
function Row({ label, value, strong, minus }) {
  return (
    <div className={`odetail-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span>{minus ? '− ' : ''}{value}</span>
    </div>
  );
}

// UC-09.2 Chi tiết đơn của khách (hủy đơn nếu còn được)
export default function OrderDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    setOrder(null);
    getMyOrder(id)
      .then((res) => { if (!ignore) setOrder(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        const code = err.response?.status;
        if (code === 401) {
          await logout();
          navigate('/login', { state: { from: location }, replace: true });
          return;
        }
        setError({
          notFound: code === 404,
          message: code === 404 ? "This order does not exist or you do not have permission to view it." : (err.response?.data?.message || "Could not load order details. Please try again."),
        });
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const crumb = (
    <nav className="odetail-crumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">My orders</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{order ? `#${order.orderCode}` : "Order details"}</span>
    </nav>
  );

  if (loading) {
    return (
      <div className="odetail">
        {crumb}
        <div className="odetail-skeleton" aria-busy="true" aria-label="Loading order details" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="odetail">
        {crumb}
        <div className="odetail-state" role="alert">
          <Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? "Order not found" : "Could not load the order"}</h2>
          <p>{error.message}</p>
          <div className="odetail-state-actions">
            {!error.notFound && <button type="button" className="odetail-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Try again</button>}
            <Link className={`odetail-btn ${error.notFound ? '' : 'ghost'}`} to="/orders"><Icon name="arrow_back" size="md" />Back to orders</Link>
          </div>
        </div>
      </div>
    );
  }

  const banner = statusMessage(order);
  const backTo = location.state?.from || '/orders';
  const backLabel = backTo.startsWith('/orders/history') ? "Back to history" : "Back to list";
  const payStatus = PAYMENT_STATUS[order.paymentStatus];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const hours = todayHours(order.store);

  return (
    <div className="odetail">
      {crumb}

      <header className="odetail-head">
        <div>
          <div className="odetail-title-row">
            <h1>Order #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p>Placed on {formatDateTime(order.createdAt)} • {itemCount} items</p>
        </div>
        <div className="odetail-actions">
          {order.status === 'pending_payment' && <Link className="odetail-btn pay" to={`/orders/${order._id}/pay`}><Icon name="payments" size="md" />Payment</Link>}
          <Link className="odetail-btn" to={`/orders/${order._id}/tracking`}><Icon name="local_shipping" size="md" />Track orders</Link>
          <Link className="odetail-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />{backLabel}</Link>
        </div>
      </header>

      {banner && (
        <div className={`odetail-banner ${banner.tone}`}>
          <span className="odetail-banner-icon"><Icon name={banner.icon} size="lg" /></span>
          <div><strong>{banner.title}</strong><span>{banner.text}</span></div>
        </div>
      )}

      {order.status === 'confirmed' && order.pickupSchedule && !order.pickupSchedule.isOpen && <div className="odetail-banner warn"><div><strong>Scheduled preparation</strong><span>{order.pickupSchedule.notice}</span></div></div>}
      <CustomerCancelOrder order={order} onChanged={() => setReloadKey(k => k + 1)} />
      {order.refund && <div className="odetail-banner success"><div><strong>{formatCurrency(order.refund.amount)} refunded to wallet</strong><Link to="/wallet">View your wallet</Link></div></div>}
      <div className="odetail-grid">
        <section className="odetail-card odetail-items">
          <h2>Order items</h2>
          {order.items.length === 0 && (
            <p className="odetail-muted">Product details for this order are no longer available. The order total and payment information have been preserved.</p>
          )}
          <ul>
            {order.items.map((it, idx) => (
              <li key={`${it.sku || it.name}-${idx}`} className="odetail-item">
                <div className="odetail-thumb">
                  {it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}
                </div>
                <div className="odetail-item-info">
                  {it.productId
                    ? <Link to={`/products/${it.productId}`} className="odetail-item-name">{it.name}</Link>
                    : <span className="odetail-item-name">{it.name}</span>}
                  <span className="odetail-item-sub">
                    {formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}
                    {it.sku ? <> • SKU {it.sku}</> : null}
                  </span>
                  {it.discountAmount > 0 && <span className="odetail-item-disc">Discount {formatCurrency(it.discountAmount)}</span>}
                </div>
                <div className="odetail-item-total">{formatCurrency(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
        </section>

        <div className="odetail-side">
          <section className="odetail-card">
            <h2><Icon name="store" />Store pickup</h2>
            {order.store ? (
              <div className="odetail-store">
                <b>{order.store.name}</b>
                {order.store.address && <span><Icon name="location_on" size="md" />{order.store.address}</span>}
                {order.store.phone && <span><Icon name="call" size="md" />{order.store.phone}</span>}
                {hours && <span><Icon name="schedule" size="md" />{hours}</span>}
              </div>
            ) : <p className="odetail-muted">Store information is unavailable.</p>}

            {SHOW_PICKUP_CODE.includes(order.status) && (
              <div className="odetail-code">
                <span>Pickup order code</span>
                <b>{order.orderCode}</b>
              </div>
            )}

            <dl className="odetail-times">
              {order.readyAt && <><dt>Ready at</dt><dd>{formatDateTime(order.readyAt)}</dd></>}
              {order.pickedUpAt && <><dt>Collected at</dt><dd>{formatDateTime(order.pickedUpAt)}</dd></>}
            </dl>

            {order.customerNote && (
              <div className="odetail-note"><Icon name="sticky_note_2" size="md" /><span>{order.customerNote}</span></div>
            )}
          </section>

          <section className="odetail-card">
            <h2><Icon name="credit_card" />Payment</h2>
            <div className="odetail-pay">
              <Row label="Wallet applied" value={formatCurrency(order.walletAmount || 0)} />
              <Row label="VNPay amount" value={formatCurrency(order.paymentMethod === 'vnpay' ? (order.payableAmount ?? order.totalAmount) : 0)} />
              <Row label="Method" value={PAYMENT_METHOD[order.paymentMethod] || '—'} />
              <div className="odetail-row">
                <span>Status</span>
                {payStatus ? <span className={`odetail-chip ${payStatus.tone}`}>{payStatus.label}</span> : <span>—</span>}
              </div>
              {order.paidAt && <Row label="Paid at" value={formatDateTime(order.paidAt)} />}
              {order.paymentStatus === 'unpaid' && order.paymentMethod === 'cash' && (
                <p className="odetail-muted">Pay a staff member in cash when collecting your order.</p>
              )}
            </div>
          </section>

          <section className="odetail-card">
            <h2><Icon name="receipt_long" />Order summary</h2>
            <div className="odetail-sum">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              {order.appliedPromotions.map((p, i) => <Row key={`${p.name}-${i}`} label={`Promotion: ${p.name}`} value={formatCurrency(p.amount)} minus />)}
              {order.appliedPromotions.length === 0 && order.promotionDiscount > 0 && <Row label="Promotions" value={formatCurrency(order.promotionDiscount)} minus />}
              {order.discountCode && <Row label={`Discount code ${order.discountCode.code}`} value={formatCurrency(order.discountCode.amount)} minus />}
              {order.pointsDiscount > 0 && <Row label={`Use ${order.pointsUsed} points`} value={formatCurrency(order.pointsDiscount)} minus />}
              <div className="odetail-sep" />
              <Row label="Total" value={formatCurrency(order.totalAmount)} strong />
              {order.pointsEarned > 0 && <p className="odetail-earned"><Icon name="stars" size="md" fill />Earn +{order.pointsEarned} points</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
