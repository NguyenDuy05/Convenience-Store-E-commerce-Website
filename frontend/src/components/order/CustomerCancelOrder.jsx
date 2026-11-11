import { useState } from 'react';
import api from '../../api/axios';
import CancelReasonPicker, { reasonText } from './CancelReasonPicker';

// Khách tự hủy đơn: chỉ khi đơn còn chờ thanh toán / vừa xác nhận (staff chưa bắt đầu chuẩn bị).
export default function CustomerCancelOrder({ order, onChanged }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState({ choice: '', other: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!['pending_payment', 'confirmed'].includes(order.status)) return null;
  const reason = reasonText(pick);
  const cancel = async (event) => {
    event.preventDefault(); if (busy) return;
    if (reason.length < 3) { setError(pick.choice ? 'Please describe the reason (at least 3 characters).' : 'Please choose a reason.'); return; }
    setBusy(true); setError('');
    try { await api.post(`/orders/my/${order._id}/cancel`, { reason }); onChanged(); }
    catch (err) { setError(err.response?.data?.message || 'Could not cancel the order. Refresh and try again.'); }
    finally { setBusy(false); }
  };
  return <section className="odetail-card customer-cancel">
    {!open ? <><p>You can cancel before staff starts preparing your order. Payments received are returned to your wallet.</p><button className="odetail-btn ghost" onClick={() => setOpen(true)}>Cancel order</button></> : <form onSubmit={cancel}>
      <h2>Cancel this order?</h2><p>Paid amounts will be returned to your wallet for a future purchase.</p>
      <CancelReasonPicker kind="customer" value={pick} onChange={(v) => { setPick(v); setError(''); }} disabled={busy} name={`cancel-${order._id}`} />
      {error && <p role="alert" style={{ color: '#ba1a1a' }}>{error}</p>}
      <div className="odetail-actions"><button className="odetail-btn" disabled={busy || reason.length < 3}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button><button type="button" className="odetail-btn ghost" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Keep order</button></div>
    </form>}
  </section>;
}
