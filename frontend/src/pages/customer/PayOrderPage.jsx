import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/pay-order.css';
import { getMyOrder } from '../../api/order.api';
import { createOnlinePayment } from '../../api/payment.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import PaymentMethodPicker from '../../components/checkout/PaymentMethodPicker';
import { formatCurrency, formatTime } from '../../utils/format';
import { CHECKOUT_METHODS } from '../../utils/orderMeta';

const ONLINE_METHODS = CHECKOUT_METHODS.filter((m) => m.key !== 'cash');

// UC-08.2 Make Payment: thanh toán (hoặc thanh toán lại) một đơn đang chờ thanh toán bằng VNPay.
export default function PayOrderPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState('vnpay');
  const [payError, setPayError] = useState(location.state?.error || '');
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const [now, setNow] = useState(Date.now());

  const handleAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getMyOrder(id)
      .then((res) => {
        setOrder(res.data);
        const last = res.data.latestPayment;
        if (last && ['vnpay'].includes(last.method)) setMethod(last.method);
      })
      .catch(async (err) => {
        if (await handleAuth(err)) return;
        const notFound = err.response?.status === 404;
        setError({ notFound, message: notFound ? "This order does not exist or you do not have permission to view it." : (err.response?.data?.message || "Could not load the order. Please try again.") });
      })
      .finally(() => setLoading(false));
  }, [id, handleAuth]);

  useEffect(() => { load(); }, [load]);

  // Đếm ngược thời gian giữ hàng; hết hạn thì tải lại để hiển thị đúng trạng thái
  useEffect(() => {
    if (!order?.expiresAt) return undefined;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= new Date(order.expiresAt).getTime()) { clearInterval(t); load(); }
    }, 1000);
    return () => clearInterval(t);
  }, [order?.expiresAt, load]);

  const pay = async () => {
    if (payingRef.current) return;
    payingRef.current = true; setPaying(true); setPayError('');
    try {
      const res = await createOnlinePayment({ orderId: order._id, method });
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      if (await handleAuth(err)) return;
      const data = err.response?.data || {};
      setPayError(data.message || "Could not connect to the payment gateway. No payment was charged; you can try again.");
      if (data.code === 'ORDER_EXPIRED' || data.code === 'NOT_PAYABLE') load();
      payingRef.current = false; setPaying(false);
    }
  };

  const crumb = (
    <nav className="pay-crumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">My orders</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Payment</span>
    </nav>
  );

  if (loading && !order) return <div className="pay">{crumb}<div className="pay-skeleton" aria-busy="true" aria-label="Loading orders" /></div>;

  if (error) {
    return (
      <div className="pay">{crumb}
        <div className="pay-state" role="alert"><Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" /><h2>{error.notFound ? "Order not found" : "Could not load the order"}</h2><p>{error.message}</p>
          <div className="pay-actions">{!error.notFound && <button type="button" className="pay-btn" onClick={load}><Icon name="refresh" size="md" />Try again</button>}
            <Link className="pay-btn ghost" to="/orders">Back to orders</Link></div></div>
      </div>
    );
  }

  const payable = order.status === 'pending_payment' && order.paymentStatus !== 'paid';
  if (!payable) {
    const expired = order.status === 'failed';
    const paid = order.paymentStatus === 'paid' || order.status !== 'pending_payment';
    return (
      <div className="pay">{crumb}
        <div className="pay-state">
          <Icon name={expired ? 'timer_off' : 'check_circle'} size="xl" />
          <h2>{expired ? "Order payment expired" : paid ? "This order does not need another payment" : "This order cannot be paid"}</h2>
          <p>{expired ? "The items have been returned to stock. You can place another order from your cart." : "You can view the details or track this order."}</p>
          <div className="pay-actions">
            <Link className="pay-btn" to={`/orders/${order._id}`}>View order #{order.orderCode}</Link>
            {expired && <Link className="pay-btn ghost" to="/products">Continue shopping</Link>}
          </div>
        </div>
      </div>
    );
  }

  const left = order.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const pendingMethod = order.latestPayment?.status === 'pending' ? order.latestPayment.method : null;
  const lastFailed = order.latestPayment?.status === 'failed';

  return (
    <div className="pay">
      {crumb}
      <h1 className="pay-title">Pay for order #{order.orderCode}</h1>

      <div className="pay-grid">
        <section className="pay-card">
          <div className="pay-timer" role="timer" aria-live="off">
            <Icon name="timer" size="lg" />
            <div><strong>Available: {mm}:{ss} to pay</strong><span>Items are reserved until {formatTime(order.expiresAt)}. After this time, the order expires and items return to stock.</span></div>
          </div>

          {lastFailed && !pendingMethod && (
            <div className="pay-alert warn" role="status"><Icon name="warning" size="lg" /><span>Your last payment was unsuccessful. You can retry your VNPay payment.</span></div>
          )}
          {pendingMethod && (
            <div className="pay-alert warn" role="status"><Icon name="hourglass_top" size="lg" />
              <span>There is already a {'VNPay'} transaction awaiting a result. Continue with the same gateway and transaction or wait until it expires to avoid a duplicate charge.</span></div>
          )}

          <h2>Pay with VNPay</h2>
          <PaymentMethodPicker methods={ONLINE_METHODS} value={method} onChange={setMethod} disabled={paying}
            disabledKeys={pendingMethod ? ONLINE_METHODS.map((m) => m.key).filter((k) => k !== pendingMethod) : []} />

          {payError && <p className="pay-error" role="alert"><Icon name="error" size="md" />{payError}</p>}
          <button type="button" className="pay-btn block" onClick={pay} disabled={paying || left <= 0}>
            {paying ? "Redirecting to payment gateway…" : `Payment ${formatCurrency(order.payableAmount ?? order.totalAmount)}`}
            {!paying && <Icon name="arrow_forward" size="md" />}
          </button>
        </section>

        <aside className="pay-side">
          <h2>Orders</h2>
          <ul>
            {order.items.map((it, i) => <li key={`${it.name}-${i}`}><span>{it.name} × {it.quantity}</span><b>{formatCurrency(it.lineTotal)}</b></li>)}
          </ul>
          <div className="pay-total"><span>Remaining via VNPay</span><b>{formatCurrency(order.totalAmount)}</b></div>
          {order.walletAmount > 0 && <p>Wallet applied: {formatCurrency(order.walletAmount)}</p>}
          <Link className="pay-link" to={`/orders/${order._id}`}>View order details</Link>
        </aside>
      </div>
    </div>
  );
}
