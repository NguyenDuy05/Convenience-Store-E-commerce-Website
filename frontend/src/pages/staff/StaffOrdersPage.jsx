import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listStaffOrders } from '../../api/order.api';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import Receipt from '../../components/staff/Receipt';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/staff-orders.css';

const TABS = [['active', 'Active'], ['confirmed', 'New'], ['preparing', 'Preparing'], ['ready_for_pickup', 'Ready'], ['pending_payment', 'Awaiting payment']];
export default function StaffOrdersPage({ history = false }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, counts: {} });
  const [query, setQuery] = useState(params.get('q') || ''), [loading, setLoading] = useState(true), [error, setError] = useState(''), [receipt, setReceipt] = useState(null), [tick, setTick] = useState(0);
  const status = history ? 'history' : params.get('status') || 'active';
  const source = history ? params.get('source') || 'all' : 'online';
  const page = Math.max(1, Number(params.get('page')) || 1), q = params.get('q') || '';
  const change = (patch) => { const next = new URLSearchParams(params); for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key); if (!Object.hasOwn(patch, 'page')) next.delete('page'); setParams(next); };
  const load = useCallback((signal) => {
    setLoading(true);
    listStaffOrders({ status, source, page, q }).then((r) => { if (!signal.aborted) { setData(r.data); setError(''); } }).catch((err) => { if (!signal.aborted) setError(err.response?.data?.message || 'Could not load orders.'); }).finally(() => { if (!signal.aborted) setLoading(false); });
  }, [status, source, page, q]);
  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    const refresh = () => { if (!document.hidden) load(controller.signal); };
    const timer = setInterval(refresh, 20000); window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, tick]);
  return <section className="staff-orders-page">
    <header className="ui-page-heading"><div><span className="ui-eyebrow">QUICK · STORE OPERATIONS</span><h1>{history ? 'Order history' : 'Customer pickup orders'}</h1><p>{history ? 'Completed counter sales and website pickup orders, with saved receipts.' : 'Prepare website orders, mark them ready and confirm collection when the customer arrives.'}</p></div><Link className="ui-button secondary" to={history ? '/staff/orders' : '/staff/orders/history'}><Icon name={history ? 'shopping_bag' : 'history'} />{history ? 'Pickup queue' : 'Order history'}</Link></header>
    {!history && <nav className="ui-tabs staff-order-tabs" aria-label="Order status">{TABS.map(([value, label]) => <button key={value} className={status === value ? 'active' : ''} onClick={() => change({ status: value })}>{label}{value !== 'active' && <span>{data.counts[value] || 0}</span>}</button>)}</nav>}
    <div className="staff-order-toolbar ui-panel"><form onSubmit={(e) => { e.preventDefault(); change({ q: query.trim() }); }}><label>Order code<input value={query} maxLength={100} placeholder="Search order code" onChange={(e) => setQuery(e.target.value)} /></label><button type="submit" className="ui-button secondary"><Icon name="search" />Search</button></form>{history && <label>Sales channel<select value={source} onChange={(e) => change({ source: e.target.value })}><option value="all">All orders</option><option value="store">Counter sales</option><option value="online">Website pickup</option></select></label>}<button className="ui-button secondary" disabled={loading} onClick={() => setTick(tick + 1)}><Icon name="refresh" />Refresh</button></div>
    {error && <div className="ui-alert error" role="alert">{error}</div>}
    {loading && !data.items.length ? <div className="ui-empty" role="status">Loading orders…</div> : !data.items.length ? <div className="ui-empty"><Icon name="receipt_long" size="xl" /><h2>{history ? 'No past orders yet' : 'No orders in this queue'}</h2><p>{history ? 'Confirmed POS sales and collected orders appear here.' : 'New website pickup orders appear here automatically.'}</p></div> : <div className="staff-order-list">{data.items.map((order) => <article className="ui-panel staff-order-card" key={order._id}><header><div><Link to={`/staff/orders/${order._id}`}><h2>{order.orderCode}</h2></Link><span>{order.source === 'store' ? 'Counter sale' : 'Website pickup'} · {formatDateTime(order.createdAt)}</span></div><OrderStatusBadge status={order.status} /></header><div className="staff-order-summary"><span><Icon name="person" size="sm" />{order.customer?.fullName || 'Walk-in customer'}</span><span>{order.itemCount} items</span><strong>{formatCurrency(order.totalAmount)}</strong><span className={order.paymentStatus === 'paid' ? 'staff-paid' : ''}>{order.paymentStatus === 'paid' ? 'Paid' : order.paymentMethod === 'cash' ? 'Cash at pickup' : 'Awaiting payment'}</span></div><p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(' · ')}</p><footer><Link className="ui-button" to={`/staff/orders/${order._id}`}>{history ? 'View details' : order.status === 'confirmed' ? 'Prepare order' : order.status === 'preparing' ? 'Open preparation' : 'View order'}<Icon name="arrow_forward" size="sm" /></Link>{order.paymentStatus === 'paid' && <button className="ui-button secondary" onClick={() => setReceipt(order._id)}><Icon name="print" size="sm" />Receipt</button>}</footer></article>)}</div>}
    {data.total > 20 && <nav className="ui-pagination" aria-label="Order pages"><button disabled={page <= 1 || loading} onClick={() => change({ page: String(page - 1) })}>Previous</button><span>Page {page} / {Math.ceil(data.total / 20)}</span><button disabled={page * 20 >= data.total || loading} onClick={() => change({ page: String(page + 1) })}>Next</button></nav>}
    {receipt && <Receipt orderId={receipt} onClose={() => setReceipt(null)} />}
  </section>;
}
