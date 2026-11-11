import { Link } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-card.css';
import Icon from '../common/Icon';
import OrderStatusBadge from './OrderStatusBadge';
import { formatCurrency, formatDateTime, formatTime } from '../../utils/format';
import { ACTIVE_STATUSES, paymentSummary } from '../../utils/orderMeta';

const MAX_THUMBS = 4;

// Khối nhắc nổi bật theo trạng thái đơn
function Callout({ order }) {
  switch (order.status) {
    case 'ready_for_pickup':
      return (
        <div className="ocard-callout ready">
          <span className="ocard-callout-icon"><Icon name="storefront" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Your order is ready for pickup</strong>
            <span>{order.readyAt ? `Ready since ${formatTime(order.readyAt)}. ` : ''}Give your order code to a staff member at pickup.</span>
          </div>
          <div className="ocard-code"><span>Order code</span><b>{order.orderCode}</b></div>
        </div>
      );
    case 'preparing':
      return (
        <div className="ocard-callout info">
          <span className="ocard-callout-icon"><Icon name="inventory_2" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Your order is being prepared</strong>
            <span>The status will change to “Ready for pickup” when your order is ready.</span>
          </div>
          <div className="ocard-progress" aria-hidden="true"><i /></div>
        </div>
      );
    case 'confirmed':
      return (
        <div className="ocard-callout info">
          <span className="ocard-callout-icon"><Icon name="task_alt" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>The store has confirmed your order</strong>
            <span>Your order will be prepared shortly.</span>
          </div>
        </div>
      );
    case 'pending_payment':
      return (
        <div className="ocard-callout warn">
          <span className="ocard-callout-icon"><Icon name="payments" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>{order.paymentStatus === 'failed' ? "Payment not completed" : "Awaiting payment"}</strong>
            <span>{order.paymentStatus === 'failed'
              ? "Items are reserved until the payment deadline. You can try paying again."
              : "The store starts preparing your order after successful payment."}</span>
          </div>
        </div>
      );
    case 'failed':
      return (
        <div className="ocard-callout error">
          <span className="ocard-callout-icon"><Icon name="error" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Payment unsuccessful</strong>
            <span>This order was not confirmed. You can place a new order from your cart.</span>
          </div>
        </div>
      );
    case 'cancelled':
      return (
        <div className="ocard-callout error">
          <span className="ocard-callout-icon"><Icon name="cancel" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Order cancelled</strong>
            <span>If you have paid, your payment will be refunded.</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Thẻ một đơn trong danh sách đơn của khách
export default function OrderCard({ order, storeName }) {
  const shown = order.items.slice(0, MAX_THUMBS);
  const more = order.items.length - shown.length;
  const summary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ');

  return (
    <article className="ocard">
      <header className="ocard-head">
        <div className="ocard-title-row">
          <h3 className="ocard-title">Order #{order.orderCode}</h3>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="ocard-meta">
          <span>Placed on {formatDateTime(order.createdAt)}</span>
          {order.status === 'completed' && order.pickedUpAt && <><span>•</span><span>Collected on {formatTime(order.pickedUpAt)}</span></>}
          {storeName && <><span>•</span><span className="ocard-store"><Icon name="store" size="md" />{storeName}</span></>}
        </div>
      </header>

      <div className="ocard-body">
        <Callout order={order} />

        <div className="ocard-items-row">
          <div className="ocard-items">
            <div className="ocard-thumbs">
              {shown.map((it, idx) => (
                <div className="ocard-thumb" key={`${it.productId || it.name}-${idx}`} title={`${it.name} ×${it.quantity}`}>
                  {it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}
                  <span className="ocard-qty">{it.quantity}</span>
                </div>
              ))}
              {more > 0 && <div className="ocard-thumb more">+{more}</div>}
            </div>
            <p className="ocard-summary" title={summary}>{summary}</p>
          </div>
          <div className="ocard-total">
            <span className="ocard-price">{formatCurrency(order.totalAmount)}</span>
            <span className="ocard-sub">{order.itemCount} items • {paymentSummary(order)}</span>
          </div>
        </div>
      </div>

      <footer className="ocard-foot">
        <span className="ocard-foot-note">
          {order.status === 'ready_for_pickup' && <><Icon name="verified" size="md" />Packed at the store</>}
          {order.status === 'completed' && <><Icon name="check_circle" size="md" />Completed</>}
        </span>
        <div className="ocard-actions">
          {order.status === 'pending_payment' && (
            <Link className="ocard-btn pay" to={`/orders/${order._id}/pay`}>
              <Icon name="payments" size="md" />Payment
            </Link>
          )}
          {ACTIVE_STATUSES.includes(order.status) && (
            <Link className="ocard-btn ghost" to={`/orders/${order._id}/tracking`}>
              <Icon name="local_shipping" size="md" />Track order
            </Link>
          )}
          <Link className="ocard-btn" to={`/orders/${order._id}`}>
            View details <Icon name="arrow_forward" size="md" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
