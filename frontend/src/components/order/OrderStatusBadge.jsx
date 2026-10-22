import '../../styles/qk-tokens.css';
import '../../styles/order-status-badge.css';
import Icon from '../common/Icon';
import { ORDER_STATUS } from '../../utils/orderMeta';

// Nhãn trạng thái đơn. "sẵn sàng nhận" có chấm nhấp nháy để khách chú ý.
export default function OrderStatusBadge({ status }) {
  const meta = ORDER_STATUS[status] || { label: status, icon: 'help', tone: 'neutral' };
  return (
    <span className={`obadge ${meta.tone}`}>
      {status === 'ready_for_pickup' ? <span className="obadge-dot" /> : <Icon name={meta.icon} size="sm" fill />}
      {meta.label}
    </span>
  );
}
