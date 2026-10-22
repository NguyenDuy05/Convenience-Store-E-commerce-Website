import { Link } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-card.css';
import Icon from '../common/Icon';
import OrderStatusBadge from './OrderStatusBadge';
import { formatCurrency, formatDateTime, formatTime } from '../../utils/format';
import { ACTIVE_STATUSES, paymentSummary } from '../../utils/orderMeta';

const MAX_THUMBS = 4;

// Khối nổi bật theo trạng thái (chỉ cho đơn đang xử lý / lỗi)
function Callout({ order }) {
  switch (order.status) {
    case 'ready_for_pickup':
      return (
        <div className="ocard-callout ready">
          <span className="ocard-callout-icon"><Icon name="storefront" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Đơn đã sẵn sàng, mời bạn đến cửa hàng nhận</strong>
            <span>{order.readyAt ? `Sẵn sàng từ ${formatTime(order.readyAt)}. ` : ''}Đọc mã đơn cho nhân viên khi nhận hàng.</span>
          </div>
          <div className="ocard-code"><span>Mã đơn</span><b>{order.orderCode}</b></div>
        </div>
      );
    case 'preparing':
      return (
        <div className="ocard-callout info">
          <span className="ocard-callout-icon"><Icon name="inventory_2" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Nhân viên đang chuẩn bị đơn hàng</strong>
            <span>Bạn sẽ thấy trạng thái đổi sang “Sẵn sàng nhận hàng” khi đơn xong.</span>
          </div>
          <div className="ocard-progress" aria-hidden="true"><i /></div>
        </div>
      );
    case 'confirmed':
      return (
        <div className="ocard-callout info">
          <span className="ocard-callout-icon"><Icon name="task_alt" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Cửa hàng đã xác nhận đơn</strong>
            <span>Đơn sẽ được chuẩn bị trong ít phút.</span>
          </div>
        </div>
      );
    case 'pending_payment':
      return (
        <div className="ocard-callout warn">
          <span className="ocard-callout-icon"><Icon name="payments" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Đơn đang chờ thanh toán</strong>
            <span>Cửa hàng chỉ chuẩn bị đơn sau khi thanh toán thành công.</span>
          </div>
        </div>
      );
    case 'failed':
      return (
        <div className="ocard-callout error">
          <span className="ocard-callout-icon"><Icon name="error" size="lg" /></span>
          <div className="ocard-callout-text">
            <strong>Thanh toán không thành công</strong>
            <span>Đơn chưa được xác nhận. Bạn có thể đặt lại từ giỏ hàng.</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Một đơn trong danh sách (UC-09.1). Bấm "Xem chi tiết" -> /orders/:id (UC-09.2).
export default function OrderCard({ order, storeName }) {
  const shown = order.items.slice(0, MAX_THUMBS);
  const more = order.items.length - shown.length;
  const summary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ');

  return (
    <article className="ocard">
      <header className="ocard-head">
        <div className="ocard-title-row">
          <h3 className="ocard-title">Đơn #{order.orderCode}</h3>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="ocard-meta">
          <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
          {order.status === 'completed' && order.pickedUpAt && <><span>•</span><span>Nhận lúc {formatTime(order.pickedUpAt)}</span></>}
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
            <span className="ocard-sub">{order.itemCount} sản phẩm • {paymentSummary(order)}</span>
          </div>
        </div>
      </div>

      <footer className="ocard-foot">
        <span className="ocard-foot-note">
          {order.status === 'ready_for_pickup' && <><Icon name="verified" size="md" />Đã đóng gói tại cửa hàng</>}
          {order.status === 'completed' && <><Icon name="check_circle" size="md" />Hoàn tất</>}
        </span>
        <div className="ocard-actions">
          {ACTIVE_STATUSES.includes(order.status) && (
            <Link className="ocard-btn ghost" to={`/orders/${order._id}/tracking`}>
              <Icon name="local_shipping" size="md" />Theo dõi
            </Link>
          )}
          <Link className="ocard-btn" to={`/orders/${order._id}`}>
            Xem chi tiết <Icon name="arrow_forward" size="md" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
