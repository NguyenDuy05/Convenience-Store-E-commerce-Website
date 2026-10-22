import { Link } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-history-row.css';
import Icon from '../common/Icon';
import OrderStatusBadge from './OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { paymentSummary } from '../../utils/orderMeta';

// Một dòng đơn trong lịch sử. fromPath được truyền sang trang chi tiết để nút "Quay lại" về đúng bộ lọc.
export default function OrderHistoryRow({ order, fromPath }) {
  const d = new Date(order.createdAt);
  const summary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ');
  const thumbs = order.items.slice(0, 3);

  return (
    <li className="ohrow">
      <div className="ohrow-date" aria-hidden="true">
        <b>{String(d.getDate()).padStart(2, '0')}</b>
        <span>Th{d.getMonth() + 1}/{String(d.getFullYear()).slice(2)}</span>
      </div>

      <div className="ohrow-main">
        <div className="ohrow-top">
          <Link className="ohrow-code" to={`/orders/${order._id}`} state={{ from: fromPath }}>#{order.orderCode}</Link>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="ohrow-summary" title={summary}>{summary || 'Chi tiết sản phẩm không còn được lưu'}</p>
        <p className="ohrow-meta">
          {formatDateTime(order.createdAt)} • {order.itemCount} sản phẩm • {paymentSummary(order)}
        </p>
      </div>

      <div className="ohrow-thumbs">
        {thumbs.map((it, i) => (
          <span className="ohrow-thumb" key={`${it.name}-${i}`} title={it.name}>
            {it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" />}
          </span>
        ))}
      </div>

      <div className="ohrow-side">
        <b>{formatCurrency(order.totalAmount)}</b>
        <Link className="ohrow-link" to={`/orders/${order._id}`} state={{ from: fromPath }}>
          Xem chi tiết<Icon name="arrow_forward" size="md" />
        </Link>
      </div>
    </li>
  );
}
