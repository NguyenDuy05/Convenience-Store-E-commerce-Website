import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/payment-result.css';
import { getMyOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import { formatCurrency, formatDateTime } from '../../utils/format';

const POLL_MS = 3000;
const MAX_POLLS = 10;

// Quyết định kết quả hiển thị từ trạng thái đơn do server trả về (không tin URL)
function resolve(order) {
  const last = order.latestPayment;
  if (order.paymentStatus === 'refunded') return 'refunded';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.status === 'failed') return last?.status === 'success' ? 'late' : 'expired';
  if (order.status === 'pending_payment') {
    if (last?.status === 'pending') return 'waiting';
    if (order.paymentStatus === 'failed' || last?.status === 'failed') return 'declined';
    return 'unpaid';
  }
  return order.paymentStatus === 'paid' ? 'paid' : 'cash';
}

const VIEW = {
  refunded: { tone: 'ok', icon: 'account_balance_wallet', title: 'Payment returned to wallet', text: 'Payments received for this closed order have been credited to your wallet. Use the balance on your next purchase.' },
  cancelled: { tone: 'bad', icon: 'cancel', title: 'Order cancelled', text: 'This order has been cancelled. Any payment received later will be returned to your wallet.' },
  paid: { tone: 'ok', icon: 'check_circle', title: "Payment successful", text: "The store has received your order and will prepare it shortly. When it is ready, visit the counter and provide your order code." },
  cash: { tone: 'ok', icon: 'check_circle', title: "Order placed successfully", text: "Pay in cash at pickup. When your order is ready, give the order code to a staff member at the counter." },
  waiting: { tone: 'wait', icon: 'hourglass_top', title: "Awaiting payment confirmation", text: "The payment gateway has not returned a result. Do not pay again to avoid a duplicate charge." },
  declined: { tone: 'bad', icon: 'cancel', title: "Payment not completed", text: "No payment has been recorded. Your items are reserved until the deadline; you can retry with VNPay." },
  unpaid: { tone: 'wait', icon: 'payments', title: "Order not yet paid", text: "You have not completed payment. Your items are reserved until the payment deadline." },
  expired: { tone: 'bad', icon: 'timer_off', title: "Order payment expired", text: "The items have been returned to stock. You can place another order from your cart." },
  late: { tone: 'wait', icon: 'support_agent', title: "Payment received after the order expired", text: "The payment has been returned to your wallet. Open your wallet to see the credit." },
};

// Trang kết quả đặt hàng / thanh toán
export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const urlError = params.get('error');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState('');
  const [polls, setPolls] = useState(0);
  const [tick, setTick] = useState(0);

  const handleAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  useEffect(() => {
    if (!orderId) return undefined;
    let ignore = false;
    getMyOrder(orderId)
      .then((res) => { if (!ignore) { setOrder(res.data); setError(''); } })
      .catch(async (err) => {
        if (ignore || (await handleAuth(err))) return;
        setError(err.response?.status === 404 ? "This order was not found." : "Could not verify the result. Please check My orders.");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [orderId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = order ? resolve(order) : null;

  useEffect(() => {
    if (state !== 'waiting' || polls >= MAX_POLLS) return undefined;
    const t = setTimeout(() => { setPolls((p) => p + 1); setTick((k) => k + 1); }, POLL_MS);
    return () => clearTimeout(t);
  }, [state, polls, tick]);

  if (!orderId || urlError) {
    return (
      <div className="pres">
        <div className="pres-card bad"><span className="pres-icon"><Icon name="gpp_maybe" size="xl" /></span>
          <h1>Could not verify the payment result</h1>
          <p>The payment gateway returned invalid information. Check My orders before paying again.</p>
          <div className="pres-actions"><Link className="pres-btn" to="/orders">View my orders</Link></div></div>
      </div>
    );
  }

  if (loading) return <div className="pres"><div className="pres-skeleton" aria-busy="true" aria-label="Checking payment result" /></div>;

  if (error) {
    return (
      <div className="pres">
        <div className="pres-card bad" role="alert"><span className="pres-icon"><Icon name="cloud_off" size="xl" /></span><h1>Could not check the result</h1><p>{error}</p>
          <div className="pres-actions"><button type="button" className="pres-btn" onClick={() => { setLoading(true); setTick((k) => k + 1); }}><Icon name="refresh" size="md" />Try again</button>
            <Link className="pres-btn ghost" to="/orders">My orders</Link></div></div>
      </div>
    );
  }

  const v = VIEW[state];
  const stillWaiting = state === 'waiting';
  const gaveUp = stillWaiting && polls >= MAX_POLLS;

  return (
    <div className="pres">
      <div className={`pres-card ${v.tone}`}>
        <span className="pres-icon"><Icon name={v.icon} size="xl" fill /></span>
        <h1>{v.title}</h1>
        <p>{v.text}</p>
        {state === 'paid' && order.pickupSchedule && !order.pickupSchedule.isOpen && <p className="pres-sub">{order.pickupSchedule.notice}</p>}
        {gaveUp && <p className="pres-sub">No result after {Math.round((MAX_POLLS * POLL_MS) / 1000)} seconds. My orders will update automatically; you do not need to pay again.</p>}
        {stillWaiting && !gaveUp && <p className="pres-sub"><span className="pres-spin" />Checking…</p>}

        <dl className="pres-info">
          <dt>Order code</dt><dd className="code">{order.orderCode}</dd>
          <dt>Total</dt><dd>{formatCurrency(order.totalAmount)}</dd>
          <dt>Placed on</dt><dd>{formatDateTime(order.createdAt)}</dd>
          {order.store?.name && <><dt>Pickup at</dt><dd>{order.store.name}{order.store.address ? `, ${order.store.address}` : ''}</dd></>}
        </dl>

        <div className="pres-actions">
          {state === 'refunded' && <Link className="pres-btn" to="/wallet">View wallet</Link>}
          {(state === 'declined' || state === 'unpaid') && <Link className="pres-btn" to={`/orders/${order._id}/pay`}><Icon name="payments" size="md" />Retry payment</Link>}
          {(state === 'paid' || state === 'cash') && <Link className="pres-btn" to={`/orders/${order._id}/tracking`}><Icon name="local_shipping" size="md" />Track orders</Link>}
          <Link className={`pres-btn ${state === 'paid' || state === 'cash' || state === 'declined' || state === 'unpaid' ? 'ghost' : ''}`} to={`/orders/${order._id}`}>View order details</Link>
          {(state === 'expired' || state === 'paid' || state === 'cash') && <Link className="pres-btn ghost" to="/products">Continue shopping</Link>}
        </div>
      </div>
    </div>
  );
}
