import { useState } from 'react';
import api from '../../api/axios';
export default function CustomerCancelOrder({ order, onChanged }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!['pending_payment', 'confirmed'].includes(order.status)) return null;
  const cancel = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await api.post(`/orders/my/${order._id}/cancel`, { reason }); onChanged(); }
    catch (err) { setError(err.response?.data?.message || 'Could not cancel the order. Refresh and try again.'); }
    finally { setBusy(false); }
  };
  return <section className="odetail-card customer-cancel">
    {!open ? <><p>You can cancel before staff starts preparing your order. Payments received are returned to your wallet.</p><button className="odetail-btn ghost" onClick={() => setOpen(true)}>Cancel order</button></> : <form onSubmit={cancel}>
      <h2>Cancel this order?</h2><p>Paid amounts will be returned to your wallet for a future purchase.</p>
      <label>Cancellation reason<input required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="odetail-actions"><button className="odetail-btn" disabled={busy}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button><button type="button" className="odetail-btn ghost" disabled={busy} onClick={() => setOpen(false)}>Keep order</button></div>
    </form>}
  </section>;
}
