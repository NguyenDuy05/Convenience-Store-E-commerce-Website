import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listStoreOrdersToPay, processCardPayment, processCashPayment } from '../../api/payment.api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import Receipt from '../../components/staff/Receipt';
import '../../styles/store-order.css';

const msg = (e, d) => e.response?.data?.message || d;
const QUICK = [10000, 20000, 50000, 100000, 200000, 500000];

// UC-23.1 Process Cash Payment / UC-23.2 Process Card & E-wallet Payment / Print Receipt
export default function StaffPaymentPage() {
  const [params] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(params.get('order') || '');
  const [mode, setMode] = useState('cash');
  const [received, setReceived] = useState('');
  const [card, setCard] = useState({ method: 'card', reference: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);       // { type, title, text }
  const [paid, setPaid] = useState(null);             // { orderId, orderCode, change }
  const [receiptFor, setReceiptFor] = useState('');

  const load = useCallback((term = '') => {
    setLoading(true); setListError('');
    listStoreOrdersToPay({ q: term || undefined })
      .then((res) => setOrders(res.data.items || []))
      .catch((e) => setListError(msg(e, "Could not load orders awaiting payment.")))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const order = orders.find((o) => o._id === selectedId) || null;
  const total = order?.totalAmount || 0;
  const recvNum = Number(received);
  const change = Number.isFinite(recvNum) ? recvNum - total : NaN;

  const choose = (id) => { setSelectedId(id); setMessage(null); setReceived(''); setCard({ method: 'card', reference: '' }); };

  const finish = (res) => {
    setPaid({ orderId: res.data.order._id, orderCode: res.data.order.orderCode, change: res.data.change });
    setSelectedId(''); load(q);
  };
  const fail = (e) => {
    const code = e.response?.data?.code;
    setMessage({ type: 'error', title: "Could not record payment", text: msg(e, "Something went wrong. Please try again.") });
    if (['NOT_PAYABLE', 'ORDER_EXPIRED'].includes(code)) load(q);
  };

  const payCash = () => {
    if (!order) return;
    if (!Number.isInteger(recvNum) || recvNum < total) { setMessage({ type: 'error', title: "Insufficient cash", text: `The customer must provide at least ${formatCurrency(total)}.` }); return; }
    setBusy(true); setMessage(null);
    processCashPayment({ orderId: order._id, received: recvNum }).then(finish).catch(fail).finally(() => setBusy(false));
  };
  const payCard = (outcome) => {
    if (!order) return;
    if (outcome === 'success' && !/^[A-Za-z0-9-]{4,40}$/.test(card.reference.trim())) { setMessage({ type: 'error', title: "Transaction reference required", text: "Enter an authorization / transaction reference (4–40 letters or digits)." }); return; }
    setBusy(true); setMessage(null);
    processCardPayment({ orderId: order._id, method: card.method, reference: card.reference.trim(), outcome })
      .then((res) => {
        if (outcome === 'failed') setMessage({ type: 'warn', title: "Failed transaction recorded", text: "The order is still awaiting payment. You can retry or switch to cash." });
        else finish(res);
      }).catch(fail).finally(() => setBusy(false));
  };

  return (
    <section className="sop">
      <nav className="sop-crumb" aria-label="Breadcrumb"><Link to="/staff">Staff</Link><span>›</span><span aria-current="page">Payment</span></nav>
      <div className="sop-head"><h1>Counter payments</h1><p>Select an unpaid order, collect payment and print a receipt. Unpaid orders expire after 15 minutes and their items return to stock.</p></div>

      {paid && (
        <div className="sop-banner" style={{ background: 'var(--qk-secondary-container, #b4f486)', marginBottom: 16 }} role="status">
          <strong>Payment recorded for order {paid.orderCode}</strong>
          <span>{paid.change > 0 ? `Customer change: ${formatCurrency(paid.change)}. ` : ''}The order is complete.</span>
          <div className="sop-actions"><button type="button" className="sop-btn sm" onClick={() => setReceiptFor(paid.orderId)}>Print receipt</button>
            <button type="button" className="sop-btn ghost sm" onClick={() => setPaid(null)}>Dismiss notification</button></div>
        </div>
      )}

      <div className="sop-grid">
        <div className="sop-card">
          <h2>Orders awaiting payment</h2>
          <form className="sop-search" onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}>
            <input className="sop-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order code..." maxLength={50} aria-label="Search by order code" />
            <button type="submit" className="sop-btn">Search</button>
          </form>
          {loading ? <div className="sop-state">Loading...</div> : listError ? <div className="sop-banner error" role="alert"><strong>Error</strong><span>{listError}</span></div> :
            orders.length === 0 ? <div className="sop-state">No orders are awaiting payment. <Link to="/staff/store-order">Create store order</Link></div> : (
              <ul className="sop-lines">{orders.map((o) => (
                <li key={o._id} className={`sop-line${o._id === selectedId ? ' bad' : ''}`} style={o._id === selectedId ? { borderColor: 'var(--qk-primary, #0058bc)' } : undefined}>
                  <div className="sop-line-info">
                    <span className="sop-line-name">{o.orderCode}</span>
                    <span className="sop-sub">{o.items.length} items · {formatDateTime(o.createdAt)} · expires {formatDateTime(o.expiresAt)}</span>
                  </div>
                  <span className="sop-line-total">{formatCurrency(o.totalAmount)}</span>
                  <button type="button" className="sop-btn sm" onClick={() => choose(o._id)}>{o._id === selectedId ? "Selected" : "Select"}</button>
                </li>))}</ul>
            )}
        </div>

        <div className="sop-side">
          <div className="sop-card">
            <h2>Collect payment</h2>
            {!order ? <div className="sop-state">Select an order from the list.</div> : <>
              <div className="sop-rows">
                {order.items.map((i) => <div className="sop-row" key={i.productId}><span>{i.name} × {i.quantity}</span><span>{formatCurrency(i.lineTotal)}</span></div>)}
                <div className="sop-sep" />
                {order.promotionDiscount > 0 && <div className="sop-row discount"><span>Promotions</span><span>- {formatCurrency(order.promotionDiscount)}</span></div>}
                <div className="sop-row strong"><span>Amount due</span><span>{formatCurrency(total)}</span></div>
              </div>

              <div className="sop-actions" style={{ margin: '12px 0' }}>
                <button type="button" className={`sop-btn sm${mode === 'cash' ? '' : ' ghost'}`} onClick={() => { setMode('cash'); setMessage(null); }}>Cash</button>
                <button type="button" className={`sop-btn sm${mode === 'card' ? '' : ' ghost'}`} onClick={() => { setMode('card'); setMessage(null); }}>Card / e-wallet</button>
              </div>

              {mode === 'cash' ? <>
                <label className="sop-field">Cash received
                  <input className="sop-input" type="number" min="0" step="1000" value={received} onChange={(e) => setReceived(e.target.value)} inputMode="numeric" />
                </label>
                <div className="sop-actions" style={{ flexWrap: 'wrap', margin: '8px 0' }}>
                  <button type="button" className="sop-btn ghost sm" onClick={() => setReceived(String(total))}>Exact amount</button>
                  {QUICK.filter((v) => v >= total).slice(0, 3).map((v) => <button key={v} type="button" className="sop-btn ghost sm" onClick={() => setReceived(String(v))}>{formatCurrency(v)}</button>)}
                </div>
                <div className="sop-row strong"><span>Change</span><span>{received !== '' && Number.isFinite(change) && change >= 0 ? formatCurrency(change) : '—'}</span></div>
              </> : <>
                <label className="sop-field">Method
                  <select className="sop-input" value={card.method} onChange={(e) => setCard({ ...card, method: e.target.value })}>
                    <option value="card">Card (POS terminal)</option><option value="vnpay">VNPay QR</option>
                  </select></label>
                <label className="sop-field">Transaction / authorization reference
                  <input className="sop-input" value={card.reference} maxLength={40} onChange={(e) => setCard({ ...card, reference: e.target.value })} placeholder="Example: AB123456" /></label>
                <p className="sop-sub">Complete payment on the POS terminal or customer wallet, then enter its confirmation reference.</p>
              </>}

              {message && <div className={`sop-banner ${message.type}`} role="alert"><strong>{message.title}</strong><span>{message.text}</span></div>}
              {mode === 'cash'
                ? <button type="button" className="sop-btn block" style={{ marginTop: 16 }} disabled={busy} onClick={payCash}>{busy ? "Processing..." : "Confirm payment collected"}</button>
                : <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                  <button type="button" className="sop-btn block" disabled={busy} onClick={() => payCard('success')}>{busy ? "Processing..." : "Successful transactions"}</button>
                  <button type="button" className="sop-btn ghost block" disabled={busy} onClick={() => payCard('failed')}>Transaction failed</button>
                </div>}
            </>}
          </div>
        </div>
      </div>
      {receiptFor && <Receipt orderId={receiptFor} onClose={() => setReceiptFor('')} />}
    </section>
  );
}
