import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-tracking.css';
import { trackMyOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import OrderTimeline from '../../components/order/OrderTimeline';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ACTIVE_STATUSES, SHOW_PICKUP_CODE, paymentSummary, statusMessage } from '../../utils/orderMeta';

const REFRESH_MS = 30000;

// UC-09.3 Theo dõi trạng thái đơn (tự làm mới)
export default function OrderTrackingPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [staleError, setStaleError] = useState('');
  const [checkedAt, setCheckedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const orderRef = useRef(null);

  useEffect(() => { orderRef.current = null; setOrder(null); setLoading(true); setError(null); setStaleError(''); }, [id]);

  useEffect(() => {
    let ignore = false;
    const hasData = !!orderRef.current;
    if (hasData) setRefreshing(true);
    trackMyOrder(id)
      .then((res) => {
        if (ignore) return;
        orderRef.current = res.data;
        setOrder(res.data);
        setCheckedAt(res.data.serverTime || new Date().toISOString());
        setError(null);
        setStaleError('');
      })
      .catch(async (err) => {
        if (ignore) return;
        const code = err.response?.status;
        if (code === 401) {
          await logout();
          navigate('/login', { state: { from: location }, replace: true });
          return;
        }
        if (code === 404) { orderRef.current = null; setOrder(null); setError({ notFound: true, message: "This order does not exist or you do not have permission to view it." }); return; }
        const message = err.response?.data?.message || "Could not connect to the order service.";
        if (orderRef.current) setStaleError(message);
        else setError({ notFound: false, message });
      })
      .finally(() => { if (!ignore) { setLoading(false); setRefreshing(false); } });
    return () => { ignore = true; };
  }, [id, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = order?.status;
  useEffect(() => {
    if (!status || !ACTIVE_STATUSES.includes(status)) return undefined;
    const timer = setInterval(() => { if (!document.hidden) setTick((k) => k + 1); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [status]);

  const crumb = (
    <nav className="otrack-crumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">My orders</Link><Icon name="chevron_right" size="sm" />
      {order ? <Link to={`/orders/${order._id}`}>#{order.orderCode}</Link> : <span>Order</span>}
      <Icon name="chevron_right" size="sm" />
      <span aria-current="page">Track order</span>
    </nav>
  );

  if (loading) {
    return <div className="otrack">{crumb}<div className="otrack-skeleton" aria-busy="true" aria-label="Loading order status" /></div>;
  }

  if (error) {
    return (
      <div className="otrack">
        {crumb}
        <div className="otrack-state" role="alert">
          <Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? "Order not found" : "Could not load order status"}</h2>
          <p>{error.message}</p>
          <div className="otrack-state-actions">
            {!error.notFound && <button type="button" className="otrack-btn" onClick={() => { setLoading(true); setTick((k) => k + 1); }}><Icon name="refresh" size="md" />Try again</button>}
            <Link className={`otrack-btn ${error.notFound ? '' : 'ghost'}`} to="/orders"><Icon name="arrow_back" size="md" />Back to orders</Link>
          </div>
        </div>
      </div>
    );
  }

  const msg = statusMessage(order);
  const live = ACTIVE_STATUSES.includes(order.status);

  return (
    <div className="otrack">
      {crumb}

      <header className="otrack-head">
        <div>
          <div className="otrack-title-row">
            <h1>Track order #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p>Placed on {formatDateTime(order.createdAt)} • {formatCurrency(order.totalAmount)} • {paymentSummary(order)}</p>
        </div>
        <Link className="otrack-btn ghost" to={`/orders/${order._id}`}><Icon name="receipt_long" size="md" />View order details</Link>
      </header>

      {staleError && (
        <div className="otrack-warn" role="alert">
          <Icon name="warning" size="lg" />
          <div>
            <strong>Could not refresh the status</strong>
            <span>{staleError} Showing the status recorded at {formatDateTime(order.updatedAt)}, which may be out of date.</span>
          </div>
          <button type="button" className="otrack-btn small" onClick={() => setTick((k) => k + 1)} disabled={refreshing}>Try again</button>
        </div>
      )}

      {msg && (
        <div className={`otrack-banner ${msg.tone}`}>
          <span className="otrack-banner-icon"><Icon name={msg.icon} size="lg" /></span>
          <div><strong>{msg.title}</strong><span>{msg.text}</span></div>
        </div>
      )}

      <div className="otrack-grid">
        <section className="otrack-card">
          <div className="otrack-card-head">
            <h2><Icon name="timeline" />Order progress</h2>
            <button type="button" className="otrack-refresh" onClick={() => setTick((k) => k + 1)} disabled={refreshing} aria-label="Refresh status">
              <Icon name="refresh" size="md" />{refreshing ? "Updating…" : "Refresh"}
            </button>
          </div>
          <p className="otrack-meta">
            Status recorded at <b>{formatDateTime(order.updatedAt)}</b>
            {checkedAt && <> • checked at <b>{formatDateTime(checkedAt)}</b></>}
            {live && !staleError && <> • refreshes every 30 seconds</>}
          </p>
          <OrderTimeline order={order} />
        </section>

        <div className="otrack-side">
          <section className="otrack-card">
            <h2><Icon name="store" />Collection method</h2>
            <p className="otrack-text"><b>Store pickup.</b> This order is collected in store. The timeline shows its progress at the store; no delivery tracking number is needed.</p>
            {order.store && (
              <div className="otrack-store">
                <b>{order.store.name}</b>
                {order.store.address && <span><Icon name="location_on" size="md" />{order.store.address}</span>}
                {order.store.phone && <span><Icon name="call" size="md" />{order.store.phone}</span>}
              </div>
            )}
            {SHOW_PICKUP_CODE.includes(order.status) && (
              <div className="otrack-code"><span>Pickup order code</span><b>{order.orderCode}</b></div>
            )}
            <dl className="otrack-times">
              {order.readyAt && <><dt>Ready at</dt><dd>{formatDateTime(order.readyAt)}</dd></>}
              {order.pickedUpAt && <><dt>Collected at</dt><dd>{formatDateTime(order.pickedUpAt)}</dd></>}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
