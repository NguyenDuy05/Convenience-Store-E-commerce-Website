import { useRef, useState } from 'react';
import '../../styles/qk-tokens.css';
import '../../styles/admin-status-actions.css';
import Icon from '../common/Icon';
import { cancelOrder } from '../../api/order.api';
import { formatCurrency, formatDateTime } from '../../utils/format';

const CANCELLABLE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

// Admin hủy đơn chưa hoàn tất. Đơn đã thanh toán sẽ được ghi hoàn tiền (xem ở Admin > Refunds).
export default function AdminCancelOrder({ order, onChanged, onAuthError }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (order.status === 'cancelled') {
    return (
      <div className="asa info"><Icon name="cancel" size="lg" />
        <p>Đơn đã bị hủy{order.cancelledAt ? ` lúc ${formatDateTime(order.cancelledAt)}` : ''}. Lý do: {order.cancelReason || '—'}.
          {order.refund && <> Đã ghi nhận hoàn tiền {formatCurrency(order.refund.amount)}. Hãy hoàn tiền cho khách qua cùng phương thức thanh toán.</>}</p>
      </div>
    );
  }
  if (!CANCELLABLE.includes(order.status)) return null;

  const paid = order.paymentStatus === 'paid';
  const submit = async () => {
    if (lock.current) return;
    if (reason.trim().length < 3) { setError('Vui lòng nhập lý do hủy (tối thiểu 3 ký tự).'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await cancelOrder(order._id, { reason: reason.trim() });
      await onChanged();
    } catch (err) {
      if (await onAuthError(err)) return;
      setError(err.response?.data?.message || 'Không hủy được đơn. Vui lòng thử lại.');
      if (['STALE_STATUS', 'NOT_CANCELLABLE'].includes(err.response?.data?.code)) await onChanged();
    } finally { lock.current = false; setBusy(false); }
  };

  if (!open) {
    return <div className="asa"><button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={() => setOpen(true)}>
      <Icon name="cancel" size="md" /> Hủy đơn hàng</button></div>;
  }
  return (
    <div className="asa">
      <div className="asa-head"><Icon name="warning" size="lg" />
        <div><strong>Hủy đơn #{order.orderCode}?</strong>
          <span>Hàng trong đơn sẽ được hoàn lại kho.{paid ? ` Đơn đã thanh toán nên hệ thống ghi nhận hoàn tiền ${formatCurrency(order.totalAmount)}.` : ''}</span></div></div>
      <label className="asa-label" htmlFor="asa-cancel">Lý do hủy (bắt buộc)</label>
      <input id="asa-cancel" className="asa-note" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      {error && <p className="asa-error" role="alert"><Icon name="error" size="md" />{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="asa-btn" style={{ background: '#ba1a1a' }} onClick={submit} disabled={busy}>{busy ? 'Đang hủy…' : 'Xác nhận hủy đơn'}</button>
        <button type="button" className="asa-btn" style={{ background: '#fff', color: '#0c1842', border: '1px solid #c2c6d6' }} onClick={() => { setOpen(false); setError(''); }} disabled={busy}>Không hủy</button>
      </div>
    </div>
  );
}
