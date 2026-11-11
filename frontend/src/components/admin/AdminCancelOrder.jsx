import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/admin-status-actions.css';
import Icon from '../common/Icon';
import { cancelOrder } from '../../api/order.api';
import CancelReasonPicker, { reasonText } from '../order/CancelReasonPicker';
import { formatCurrency, formatDateTime } from '../../utils/format';

const CANCELLABLE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
const FAULTS = [
  { id: 'customer', icon: 'person', title: 'Customer side', hint: 'Customer asked, did not pick up, wrong items…' },
  { id: 'store', icon: 'storefront', title: 'Store side', hint: 'Out of stock, cannot prepare, system problem…' },
];

// Nút + hộp hủy đơn cho staff/admin: chọn bên có lỗi (khách / cửa hàng) rồi chọn lý do; lỗi cửa hàng có thể tặng voucher
export default function AdminCancelOrder({ order, onChanged, onAuthError = async () => false, cancelFn = cancelOrder }) {
  const [open, setOpen] = useState(false);
  const [fault, setFault] = useState('');
  const [pick, setPick] = useState({ choice: '', other: '' });
  const [compensate, setCompensate] = useState(true);
  const reason = reasonText(pick);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (order.status === 'cancelled') {
    const r = order.refund;
    return (
      <div className="asa info"><Icon name="cancel" size="lg" />
        <p>Order cancelled{order.cancelledAt ? ` at ${formatDateTime(order.cancelledAt)}` : ''}
          {order.cancelFault ? ` — ${order.cancelFault === 'store' ? 'store side' : 'customer side'}` : ''}. Reason: {order.cancelReason || '—'}.
          {r && <> Refunded to wallet: {formatCurrency(r.amount)}.</>}
          {order.compensation?.code && <> Apology voucher <strong>{order.compensation.code}</strong> ({order.compensation.percent}% up to {formatCurrency(order.compensation.maxDiscount)}) was sent to the customer.</>}</p>
      </div>
    );
  }
  if (!CANCELLABLE.includes(order.status)) return null;

  const paid = order.paymentStatus === 'paid';
  const hasCustomer = !!(order.customerId || order.customer);
  const chooseFault = (f) => { setFault(f); setPick({ choice: '', other: '' }); setError(''); };
  const close = () => { setOpen(false); setFault(''); setPick({ choice: '', other: '' }); setError(''); };
  const submit = async () => {
    if (lock.current) return;
    if (!fault) { setError('Choose who caused the cancellation.'); return; }
    if (reason.length < 3) { setError(pick.choice ? 'Describe the reason (at least 3 characters).' : 'Choose a cancellation reason.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await cancelFn(order._id, { reason, fault, compensate: fault === 'store' && compensate });
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setError(err.response?.data?.message || 'Could not cancel the order. Please try again.');
      if (['STALE_STATUS', 'NOT_CANCELLABLE'].includes(err.response?.data?.code)) await onChanged();
    } finally { lock.current = false; setBusy(false); }
  };

  if (!open) {
    return <div className="asa"><button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={() => setOpen(true)}>
      <Icon name="cancel" size="md" /> Cancel order</button></div>;
  }
  const refundNote = paid ? ` This order was paid, so ${formatCurrency(order.totalAmount)} will be credited to the customer wallet.` : '';
  return (
    <div className="asa">
      <div className="asa-head"><Icon name="warning" size="lg" />
        <div><strong>Cancel order #{order.orderCode}?</strong>
          <span>Items in this order will be returned to stock.{refundNote}</span></div></div>
      <fieldset className="crp" disabled={busy}>
        <legend>Who caused the cancellation? <span>*</span></legend>
        <div className="aco-faults">
          {FAULTS.map((f) => (
            <label key={f.id} className={`aco-fault ${fault === f.id ? 'on' : ''}`}>
              <input type="radio" name={`fault-${order._id}`} checked={fault === f.id} onChange={() => chooseFault(f.id)} />
              <Icon name={f.icon} size="md" />
              <span><strong>{f.title}</strong><small>{f.hint}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      {fault && <CancelReasonPicker kind={fault === 'store' ? 'store' : 'customerSide'} legend="Reason" value={pick}
        onChange={(v) => { setPick(v); setError(''); }} disabled={busy} name={`cancel-${order._id}`} />}
      {fault === 'store' && hasCustomer && (
        <label className="asa-check"><input type="checkbox" checked={compensate} onChange={(e) => setCompensate(e.target.checked)} disabled={busy} />
          <span>Send an apology voucher: 10% off the next order, up to {formatCurrency(10000)} (1 use, valid 30 days)</span></label>
      )}
      {error && <p className="asa-error" role="alert"><Icon name="error" size="md" />{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={submit} disabled={busy || !fault || reason.length < 3}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button>
        <button type="button" className="asa-btn" style={{ background: '#fff', color: '#0c1842', border: '1px solid #c2c6d6' }} onClick={close} disabled={busy}>Keep order</button>
      </div>
    </div>
  );
}
