import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStaffOrder, updateStaffOrder } from '../../api/order.api';
import { useNotifications } from '../../context/NotificationContext';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import OrderTimeline from '../../components/order/OrderTimeline';
import Receipt from '../../components/staff/Receipt';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/staff-orders.css';

const NEXT = { preparing: 'Start preparing', ready_for_pickup: 'Done', completed: 'Confirm pickup' };
export default function StaffOrderDetailPage() {
  const { id } = useParams();
  const { refresh } = useNotifications();
  const [order, setOrder] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [cash, setCash] = useState(false), [received, setReceived] = useState(''), [receipt, setReceipt] = useState(false);
  const load = useCallback(async (signal) => {
    try { const r = await getStaffOrder(id); if (!signal?.aborted) { setOrder(r.data); setError(''); } }
    catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || 'Could not load this order.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [id]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setOrder(null); setNotice(''); setCash(false); setReceived(''); load(controller.signal);
    const timer = setInterval(() => { if (!document.hidden) load(controller.signal); }, 20000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load]);
  const advance = async () => {
    if (busy || !order.nextTransition) return;
    setBusy(true); setError('');
    const target = order.nextTransition.to;
    try {
      await updateStaffOrder(id, { status: target, ...(order.nextTransition.needsCashConfirm ? { cashCollected: cash, received: received === '' ? order.totalAmount : Number(received) } : {}) });
      setNotice(target === 'ready_for_pickup' ? 'Preparation done. The order is ready for the customer to collect.' : target === 'completed' ? 'Pickup confirmed. The order is saved in history.' : 'Order preparation started.');
      await Promise.all([load(), refresh()]); setCash(false);
    } catch (err) { await load(); setError(err.response?.data?.message || 'Could not update this order. Refresh and try again.'); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="ui-empty" role="status">Loading order…</div>;
  if (!order) return <div className="ui-empty"><h1>Order unavailable</h1><p role="alert">{error}</p><button className="ui-button" onClick={() => load()}>Try again</button><Link to="/staff/orders">Back to orders</Link></div>;
  const next = order.nextTransition;
  return <section className="staff-orders-page"><Link className="staff-order-back" to={order.source === 'store' || ['completed', 'cancelled', 'failed'].includes(order.status) ? '/staff/orders/history' : '/staff/orders'}><Icon name="arrow_back" size="sm" />Back to orders</Link>
    <header className="ui-page-heading"><div><span className="ui-eyebrow">{order.source === 'store' ? 'COUNTER SALE' : 'WEBSITE · STORE PICKUP'}</span><h1>{order.orderCode}<OrderStatusBadge status={order.status} /></h1><p>Placed {formatDateTime(order.createdAt)} · {order.customer?.fullName || 'Walk-in customer'}{order.customer?.phone ? ` · ${order.customer.phone}` : ''}</p></div>{order.paymentStatus === 'paid' && <button className="ui-button secondary" onClick={() => setReceipt(true)}><Icon name="print" />Receipt</button>}</header>
    {error && <div className="ui-alert error" role="alert">{error}</div>}{notice && <div className="ui-alert success" role="status">{notice}</div>}
    <div className="staff-detail-grid"><div><section className="ui-panel staff-pick-items"><h2>Items to prepare</h2>{order.items.map((item, index) => <article key={item.productId || index}><span className="staff-item-qty">{item.quantity}×</span><div><b>{item.name}</b><small>{item.sku} · {formatCurrency(item.unitPrice)} / {item.unit}</small></div><strong>{formatCurrency(item.lineTotal)}</strong></article>)}{order.customerNote && <div className="staff-customer-note"><b>Customer note</b><p>{order.customerNote}</p></div>}<div className="pos-totals"><div><span>Subtotal</span><b>{formatCurrency(order.subtotal)}</b></div>{order.promotionDiscount > 0 && <div><span>Promotions</span><b>− {formatCurrency(order.promotionDiscount)}</b></div>}<div className="pos-grand-total"><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div></div></section><section className="ui-panel staff-timeline"><h2>Order timeline</h2><OrderTimeline order={order} /></section></div>
      <aside><section className="ui-panel staff-fulfillment"><h2>Pickup workflow</h2>{order.status === 'confirmed' && order.pickupSchedule && !order.pickupSchedule.isOpen && <p role="status">{order.pickupSchedule.notice}</p>}<p className="staff-payment-status">{order.paymentStatus === 'paid' ? 'Payment received' : order.paymentMethod === 'cash' ? 'Cash due at pickup' : 'Waiting for online payment'}</p>{order.status === 'pending_payment' && <p>Preparation starts after the online payment is confirmed.</p>}{order.status === 'preparing' && <p>Finish picking and packing all items, then select <b>Done</b>. The system marks this order ready and sends the customer a pickup notification.</p>}{order.status === 'ready_for_pickup' && <div className="staff-ready-note"><Icon name="storefront" /><p>Ready for pickup. Verify the customer's order code before handing over the items.</p><strong>{order.orderCode}</strong></div>}{next?.needsCashConfirm && <div className="staff-cash-pickup"><label>Cash received (VND)<input type="number" min={order.totalAmount} step="1" max="1000000000" value={received} placeholder={String(order.totalAmount)} onChange={(e) => setReceived(e.target.value)} disabled={busy} /></label><span>Change: {formatCurrency(Math.max(0, (received === '' ? order.totalAmount : Number(received)) - order.totalAmount))}</span><label className="staff-cash-check"><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} disabled={busy} />I have collected the full cash payment.</label></div>}{next && <button className="ui-button staff-next" disabled={busy || (next.to === 'preparing' && order.pickupSchedule?.isOpen === false) || (next.needsCashConfirm && (!cash || (received !== '' && Number(received) < order.totalAmount)))} onClick={advance}><Icon name={next.to === 'ready_for_pickup' ? 'done' : next.to === 'completed' ? 'verified' : 'inventory_2'} />{busy ? 'Updating…' : NEXT[next.to]}</button>}{order.status === 'completed' && <p>Items collected. This order is complete.</p>}<div className="staff-pickup-location"><b>Pickup location</b><p>{order.store?.name}</p><p>{order.store?.address}</p><p>{order.store?.phone}</p><small>Store pickup only · No delivery</small></div></section></aside></div>
    {receipt && <Receipt orderId={id} onClose={() => setReceipt(false)} />}
  </section>;
}
