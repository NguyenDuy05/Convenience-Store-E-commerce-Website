import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/admin-status-actions.css';
import Icon from '../common/Icon';
import { updateOrderStatus } from '../../api/order.api';
import { ORDER_STATUS, TRANSITION_LABEL } from '../../utils/orderMeta';

const WAIT_TEXT = {
  pending_payment: "Waiting for the customer's online payment. The order is confirmed after a successful payment or closed when it expires.",
  completed: "This order is complete. Its status can no longer be changed.",
  cancelled: "This order was cancelled and cannot be processed.",
  failed: "This order failed or expired and cannot be processed. If money was charged, record an issue for review.",
};

// Chuyển đơn sang bước kế tiếp. order.nextTransition = { to, needsCashConfirm } từ server (null nếu không còn bước nào).
export default function AdminOrderStatusActions({ order, onChanged, onAuthError }) {
  const next = order.nextTransition;
  const [note, setNote] = useState('');
  const [cash, setCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (!next) {
    return <div className="asa info"><Icon name="info" size="lg" /><p>{WAIT_TEXT[order.status] || "No status changes are available for this order."}</p></div>;
  }

  const go = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await updateOrderStatus(order._id, { status: next.to, note: note.trim() || undefined, cashCollected: next.needsCashConfirm ? cash : undefined });
      setNote(''); setCash(false);
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setError(err.response?.data?.message || "Could not update the status. Please try again.");
      if (['STALE_STATUS', 'INVALID_TRANSITION'].includes(err.response?.data?.code)) await onChanged();   // người khác vừa đổi: tải lại
    } finally { lock.current = false; setBusy(false); }
  };

  return (
    <div className="asa">
      {next.to === 'preparing' && order.pickupSchedule?.isOpen === false && <p role="status">{order.pickupSchedule.notice}</p>}
      <div className="asa-head">
        <Icon name="swap_horiz" size="lg" />
        <div><strong>Next step: {ORDER_STATUS[next.to].label}</strong><span>The customer can track this status on their order page.</span></div>
      </div>
      {next.needsCashConfirm && (
        <label className="asa-check"><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />
          I have collected the full cash amount. A cash transaction will be recorded for this order.</label>
      )}
      <label className="asa-label" htmlFor="asa-note">Note (optional, saved to order history)</label>
      <input id="asa-note" className="asa-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="asa-error" role="alert"><Icon name="error" size="md" />{error}</p>}
      <button type="button" className="asa-btn" onClick={go} disabled={busy || (next.to === 'preparing' && order.pickupSchedule?.isOpen === false) || (next.needsCashConfirm && !cash)}>
        {busy ? "Updating…" : TRANSITION_LABEL[next.to]}
      </button>
    </div>
  );
}
