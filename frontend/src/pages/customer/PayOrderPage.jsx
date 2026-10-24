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

// UC-08.2 Make Payment: thanh toán (hoặc thanh toán lại) một đơn đang chờ thanh toán bằng VNPay / MoMo.
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
        if (last && ['vnpay', 'momo'].includes(last.method)) setMethod(last.method);
      })
      .catch(async (err) => {
        if (await handleAuth(err)) return;
        const notFound = err.response?.status === 404;
        setError({ notFound, message: notFound ? 'Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn này.' : (err.response?.data?.message || 'Không tải được đơn hàng. Vui lòng thử lại.') });
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
      setPayError(data.message || 'Không kết nối được cổng thanh toán. Chưa có khoản tiền nào bị trừ, bạn có thể thử lại.');
      if (data.code === 'ORDER_EXPIRED' || data.code === 'NOT_PAYABLE') load();
      payingRef.current = false; setPaying(false);
    }
  };

  const crumb = (
    <nav className="pay-crumb" aria-label="Breadcrumb">
      <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">Đơn hàng của tôi</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Thanh toán</span>
    </nav>
  );

  if (loading && !order) return <div className="pay">{crumb}<div className="pay-skeleton" aria-busy="true" aria-label="Đang tải đơn hàng" /></div>;

  if (error) {
    return (
      <div className="pay">{crumb}
        <div className="pay-state" role="alert"><Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" /><h2>{error.notFound ? 'Không tìm thấy đơn hàng' : 'Chưa tải được đơn hàng'}</h2><p>{error.message}</p>
          <div className="pay-actions">{!error.notFound && <button type="button" className="pay-btn" onClick={load}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className="pay-btn ghost" to="/orders">Về danh sách đơn</Link></div></div>
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
          <h2>{expired ? 'Đơn đã hết hạn thanh toán' : paid ? 'Đơn này không cần thanh toán thêm' : 'Không thể thanh toán đơn này'}</h2>
          <p>{expired ? 'Hàng đã được trả lại kho. Bạn có thể đặt lại từ giỏ hàng.' : 'Bạn có thể xem chi tiết hoặc theo dõi trạng thái đơn hàng.'}</p>
          <div className="pay-actions">
            <Link className="pay-btn" to={`/orders/${order._id}`}>Xem đơn #{order.orderCode}</Link>
            {expired && <Link className="pay-btn ghost" to="/products">Tiếp tục mua sắm</Link>}
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
      <h1 className="pay-title">Thanh toán đơn #{order.orderCode}</h1>

      <div className="pay-grid">
        <section className="pay-card">
          <div className="pay-timer" role="timer" aria-live="off">
            <Icon name="timer" size="lg" />
            <div><strong>Còn {mm}:{ss} để thanh toán</strong><span>Hàng được giữ đến {formatTime(order.expiresAt)}. Quá hạn đơn sẽ tự hủy và hàng trả về kho.</span></div>
          </div>

          {lastFailed && !pendingMethod && (
            <div className="pay-alert warn" role="status"><Icon name="warning" size="lg" /><span>Lần thanh toán gần nhất chưa thành công. Bạn có thể thử lại hoặc chọn cổng khác.</span></div>
          )}
          {pendingMethod && (
            <div className="pay-alert warn" role="status"><Icon name="hourglass_top" size="lg" />
              <span>Đang có một giao dịch {pendingMethod === 'vnpay' ? 'VNPay' : 'MoMo'} chờ kết quả. Để tránh bị trừ tiền hai lần, bạn chỉ tiếp tục được với cổng này (cùng một giao dịch) hoặc đợi hết hạn.</span></div>
          )}

          <h2>Chọn cổng thanh toán</h2>
          <PaymentMethodPicker methods={ONLINE_METHODS} value={method} onChange={setMethod} disabled={paying}
            disabledKeys={pendingMethod ? ONLINE_METHODS.map((m) => m.key).filter((k) => k !== pendingMethod) : []} />

          {payError && <p className="pay-error" role="alert"><Icon name="error" size="md" />{payError}</p>}
          <button type="button" className="pay-btn block" onClick={pay} disabled={paying || left <= 0}>
            {paying ? 'Đang chuyển tới cổng thanh toán…' : `Thanh toán ${formatCurrency(order.totalAmount)}`}
            {!paying && <Icon name="arrow_forward" size="md" />}
          </button>
        </section>

        <aside className="pay-side">
          <h2>Đơn hàng</h2>
          <ul>
            {order.items.map((it, i) => <li key={`${it.name}-${i}`}><span>{it.name} × {it.quantity}</span><b>{formatCurrency(it.lineTotal)}</b></li>)}
          </ul>
          <div className="pay-total"><span>Tổng thanh toán</span><b>{formatCurrency(order.totalAmount)}</b></div>
          <Link className="pay-link" to={`/orders/${order._id}`}>Xem chi tiết đơn</Link>
        </aside>
      </div>
    </div>
  );
}
