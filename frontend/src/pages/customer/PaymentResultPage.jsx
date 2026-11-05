import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/payment-result.css';
import { getMyOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import { formatCurrency, formatDateTime } from '../../utils/format';

const POLL_MS = 3000;
const MAX_POLLS = 10; // chờ tối đa ~30 giây cho cổng báo kết quả

// Quyết định hiển thị chỉ dựa vào TRẠNG THÁI ĐƠN do server trả về, không tin tham số trên URL.
function resolve(order) {
  const last = order.latestPayment;
  if (order.status === 'failed') return last?.status === 'success' ? 'late' : 'expired';
  if (order.status === 'pending_payment') {
    if (last?.status === 'pending') return 'waiting';
    if (order.paymentStatus === 'failed' || last?.status === 'failed') return 'declined';
    return 'unpaid';
  }
  return order.paymentStatus === 'paid' ? 'paid' : 'cash';
}

const VIEW = {
  paid: { tone: 'ok', icon: 'check_circle', title: 'Thanh toán thành công', text: 'Cửa hàng đã nhận đơn và sẽ chuẩn bị ngay. Khi đơn sẵn sàng, bạn đến quầy và đọc mã đơn để nhận hàng.' },
  cash: { tone: 'ok', icon: 'check_circle', title: 'Đặt hàng thành công', text: 'Bạn thanh toán tiền mặt khi đến nhận hàng. Khi đơn sẵn sàng, đọc mã đơn cho nhân viên tại quầy.' },
  waiting: { tone: 'wait', icon: 'hourglass_top', title: 'Đang chờ xác nhận thanh toán', text: 'Cổng thanh toán chưa báo kết quả. Vui lòng không thanh toán lại để tránh bị trừ tiền hai lần.' },
  declined: { tone: 'bad', icon: 'cancel', title: 'Thanh toán chưa thành công', text: 'Chưa có khoản tiền nào được ghi nhận. Đơn vẫn được giữ hàng đến khi hết hạn, bạn có thể thanh toán lại hoặc chọn cổng khác.' },
  unpaid: { tone: 'wait', icon: 'payments', title: 'Đơn chưa được thanh toán', text: 'Bạn chưa hoàn tất thanh toán. Đơn vẫn được giữ hàng đến khi hết hạn.' },
  expired: { tone: 'bad', icon: 'timer_off', title: 'Đơn đã hết hạn thanh toán', text: 'Hàng đã được trả lại kho. Bạn có thể đặt lại từ giỏ hàng.' },
  late: { tone: 'wait', icon: 'support_agent', title: 'Đã nhận thanh toán nhưng đơn đã hết hạn', text: 'Cửa hàng sẽ liên hệ để xử lý hoặc hoàn tiền cho bạn. Vui lòng lưu mã đơn và liên hệ cửa hàng nếu cần hỗ trợ.' },
};

// Kết quả đặt hàng / thanh toán (UC-08.1, UC-08.2). Cổng thanh toán và tiền mặt đều dẫn về đây.
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
        setError(err.response?.status === 404 ? 'Không tìm thấy đơn hàng này.' : 'Không kiểm tra được kết quả. Vui lòng xem lại trong mục Đơn hàng của tôi.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [orderId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = order ? resolve(order) : null;

  // Đang chờ cổng báo kết quả: hỏi lại server vài lần
  useEffect(() => {
    if (state !== 'waiting' || polls >= MAX_POLLS) return undefined;
    const t = setTimeout(() => { setPolls((p) => p + 1); setTick((k) => k + 1); }, POLL_MS);
    return () => clearTimeout(t);
  }, [state, polls, tick]);

  if (!orderId || urlError) {
    return (
      <div className="pres">
        <div className="pres-card bad"><span className="pres-icon"><Icon name="gpp_maybe" size="xl" /></span>
          <h1>Không xác minh được kết quả thanh toán</h1>
          <p>Thông tin trả về từ cổng thanh toán không hợp lệ. Để chắc chắn, hãy kiểm tra trạng thái trong mục Đơn hàng của tôi trước khi thanh toán lại.</p>
          <div className="pres-actions"><Link className="pres-btn" to="/orders">Xem đơn hàng của tôi</Link></div></div>
      </div>
    );
  }

  if (loading) return <div className="pres"><div className="pres-skeleton" aria-busy="true" aria-label="Đang kiểm tra kết quả" /></div>;

  if (error) {
    return (
      <div className="pres">
        <div className="pres-card bad" role="alert"><span className="pres-icon"><Icon name="cloud_off" size="xl" /></span><h1>Chưa kiểm tra được kết quả</h1><p>{error}</p>
          <div className="pres-actions"><button type="button" className="pres-btn" onClick={() => { setLoading(true); setTick((k) => k + 1); }}><Icon name="refresh" size="md" />Thử lại</button>
            <Link className="pres-btn ghost" to="/orders">Đơn hàng của tôi</Link></div></div>
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
        {gaveUp && <p className="pres-sub">Chưa có kết quả sau {Math.round((MAX_POLLS * POLL_MS) / 1000)} giây. Kết quả sẽ tự cập nhật trong mục Đơn hàng của tôi, bạn không cần thanh toán lại.</p>}
        {stillWaiting && !gaveUp && <p className="pres-sub"><span className="pres-spin" />Đang kiểm tra…</p>}

        <dl className="pres-info">
          <dt>Mã đơn</dt><dd className="code">{order.orderCode}</dd>
          <dt>Tổng tiền</dt><dd>{formatCurrency(order.totalAmount)}</dd>
          <dt>Đặt lúc</dt><dd>{formatDateTime(order.createdAt)}</dd>
          {order.store?.name && <><dt>Nhận hàng tại</dt><dd>{order.store.name}{order.store.address ? `, ${order.store.address}` : ''}</dd></>}
        </dl>

        <div className="pres-actions">
          {(state === 'declined' || state === 'unpaid') && <Link className="pres-btn" to={`/orders/${order._id}/pay`}><Icon name="payments" size="md" />Thanh toán lại</Link>}
          {(state === 'paid' || state === 'cash') && <Link className="pres-btn" to={`/orders/${order._id}/tracking`}><Icon name="local_shipping" size="md" />Theo dõi đơn</Link>}
          <Link className={`pres-btn ${state === 'paid' || state === 'cash' || state === 'declined' || state === 'unpaid' ? 'ghost' : ''}`} to={`/orders/${order._id}`}>Xem chi tiết đơn</Link>
          {(state === 'expired' || state === 'paid' || state === 'cash') && <Link className="pres-btn ghost" to="/products">Tiếp tục mua sắm</Link>}
        </div>
      </div>
    </div>
  );
}
