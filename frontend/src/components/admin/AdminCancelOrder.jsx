import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/admin-status-actions.css';
import Icon from '../common/Icon';
import { cancelOrder } from '../../api/order.api';
import CancelReasonPicker, { reasonText } from '../order/CancelReasonPicker';
import { formatCurrency, formatDateTime } from '../../utils/format';

const CANCELLABLE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

// Nút + hộp hủy đơn cho staff/admin (chọn lý do; đơn đã trả thì hoàn tiền vào ví)
export default function AdminCancelOrder({ order, onChanged, onAuthError = async () => false, cancelFn = cancelOrder }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState({ choice: '', other: '' });
  const reason = reasonText(pick);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (order.status === 'cancelled') {
    return (
      <div className="asa info"><Icon name="cancel" size="lg" />
        <p>Order cancelled{order.cancelledAt ? ` at ${formatDateTime(order.cancelledAt)}` : ''}. Reason: {order.cancelReason || '—'}.
          {order.refund && <> Refunded to wallet: {formatCurrency(order.refund.amount)}. The customer can use this balance on a future purchase.</>}</p>
      </div>
    );
  }
  if (!CANCELLABLE.includes(order.status)) return null;

  const paid = order.paymentStatus === 'paid';
  const submit = async () => {
    if (lock.current) return;
    if (reason.length < 3) { setError(pick.choice ? "Describe the reason (at least 3 characters)." : "Choose a cancellation reason."); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await cancelFn(order._id, { reason });
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setError(err.response?.data?.message || "Could not cancel the order. Please try again.");
      if (['STALE_STATUS', 'NOT_CANCELLABLE'].includes(err.response?.data?.code)) await onChanged();
    } finally { lock.current = false; setBusy(false); }
  };

  if (!open) {
    return <div className="asa"><button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={() => setOpen(true)}>
      <Icon name="cancel" size="md" /> Cancel order</button></div>;
  }
  return (
    <div className="asa">
      <div className="asa-head"><Icon name="warning" size="lg" />
        <div><strong>Cancel order #{order.orderCode}?</strong>
          <span>Items in this order will be returned to stock.{paid ? ` This order was paid, so the customer wallet will be credited ${formatCurrency(order.totalAmount)}.` : ''}</span></div></div>
      <CancelReasonPicker kind="store" value={pick} onChange={(v) => { setPick(v); setError(''); }} disabled={busy} name={`cancel-${order._id}`} />
      {error && <p className="asa-error" role="alert"><Icon name="error" size="md" />{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={submit} disabled={busy || reason.length < 3}>{busy ? "Cancelling…" : "Confirm cancellation"}</button>
        <button type="button" className="asa-btn" style={{ background: '#fff', color: '#0c1842', border: '1px solid #c2c6d6' }} onClick={() => { setOpen(false); setError(''); }} disabled={busy}>Keep order</button>
      </div>
    </div>
  );
}
