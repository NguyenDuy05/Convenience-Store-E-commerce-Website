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
import { ACTIVE_STATUSES, ORDER_STATUS_MESSAGE, SHOW_PICKUP_CODE, paymentSummary } from '../../utils/orderMeta';

const REFRESH_MS = 30000; // tự làm mới mỗi 30 giây khi đơn còn đang xử lý

// UC-09.3 Track Order Status (chỉ xem; không đổi trạng thái đơn)
export default function OrderTrackingPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);      // lỗi khi chưa có dữ liệu: { notFound, message }
  const [staleError, setStaleError] = useState(''); // lỗi khi làm mới nhưng đã có dữ liệu cũ
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
        if (code === 404) { orderRef.current = null; setOrder(null); setError({ notFound: true, message: 'Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn này.' }); return; }
        const message = err.response?.data?.message || 'Không kết nối được tới hệ thống đơn hàng.';
        // Còn dữ liệu cũ: giữ lại nhưng ghi rõ là chưa cập nhật được; chưa có gì: báo lỗi để thử lại
        if (orderRef.current) setStaleError(message);
        else setError({ notFound: false, message });
      })
      .finally(() => { if (!ignore) { setLoading(false); setRefreshing(false); } });
    return () => { ignore = true; };
  }, [id, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tự làm mới khi đơn còn đang xử lý và tab đang mở
  const status = order?.status;
  useEffect(() => {
    if (!status || !ACTIVE_STATUSES.includes(status)) return undefined;
    const timer = setInterval(() => { if (!document.hidden) setTick((k) => k + 1); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [status]);

  const crumb = (
    <nav className="otrack-crumb" aria-label="Breadcrumb">
      <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">Đơn hàng của tôi</Link><Icon name="chevron_right" size="sm" />
      {order ? <Link to={`/orders/${order._id}`}>#{order.orderCode}</Link> : <span>Đơn</span>}
      <Icon name="chevron_right" size="sm" />
      <span aria-current="page">Theo dõi</span>
    </nav>
  );

  if (loading) {
    return <div className="otrack">{crumb}<div className="otrack-skeleton" aria-busy="true" aria-label="Đang tải trạng thái đơn" /></div>;
  }

  if (error) {
    return (
      <div className="otrack">
        {crumb}
        <div className="otrack-state" role="alert">
          <Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? 'Không tìm thấy đơn hàng' : 'Chưa tải được trạng thái đơn'}</h2>
          <p>{error.message}</p>
          <div className="otrack-state-actions">
            {!error.notFound && <button type="button" className="otrack-btn" onClick={() => { setLoading(true); setTick((k) => k + 1); }}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className={`otrack-btn ${error.notFound ? '' : 'ghost'}`} to="/orders"><Icon name="arrow_back" size="md" />Về danh sách đơn</Link>
          </div>
        </div>
      </div>
    );
  }

  const msg = ORDER_STATUS_MESSAGE[order.status];
  const live = ACTIVE_STATUSES.includes(order.status);

  return (
    <div className="otrack">
      {crumb}

      <header className="otrack-head">
        <div>
          <div className="otrack-title-row">
            <h1>Theo dõi đơn #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p>Đặt lúc {formatDateTime(order.createdAt)} • {formatCurrency(order.totalAmount)} • {paymentSummary(order)}</p>
        </div>
        <Link className="otrack-btn ghost" to={`/orders/${order._id}`}><Icon name="receipt_long" size="md" />Xem chi tiết đơn</Link>
      </header>

      {staleError && (
        <div className="otrack-warn" role="alert">
          <Icon name="warning" size="lg" />
          <div>
            <strong>Chưa cập nhật được trạng thái mới</strong>
            <span>{staleError} Đang hiển thị trạng thái ghi nhận lúc {formatDateTime(order.updatedAt)}, có thể đã cũ.</span>
          </div>
          <button type="button" className="otrack-btn small" onClick={() => setTick((k) => k + 1)} disabled={refreshing}>Thử lại</button>
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
            <h2><Icon name="timeline" />Tiến trình đơn hàng</h2>
            <button type="button" className="otrack-refresh" onClick={() => setTick((k) => k + 1)} disabled={refreshing} aria-label="Làm mới trạng thái">
              <Icon name="refresh" size="md" />{refreshing ? 'Đang cập nhật…' : 'Làm mới'}
            </button>
          </div>
          <p className="otrack-meta">
            Trạng thái ghi nhận lúc <b>{formatDateTime(order.updatedAt)}</b>
            {checkedAt && <> • kiểm tra lúc <b>{formatDateTime(checkedAt)}</b></>}
            {live && !staleError && <> • tự làm mới mỗi 30 giây</>}
          </p>
          <OrderTimeline order={order} />
        </section>

        <div className="otrack-side">
          <section className="otrack-card">
            <h2><Icon name="store" />Hình thức nhận hàng</h2>
            <p className="otrack-text"><b>Nhận tại cửa hàng.</b> Đơn này không giao qua đơn vị vận chuyển nên không có mã vận đơn; tiến trình bên cạnh là thông tin theo dõi của cửa hàng.</p>
            {order.store && (
              <div className="otrack-store">
                <b>{order.store.name}</b>
                {order.store.address && <span><Icon name="location_on" size="md" />{order.store.address}</span>}
                {order.store.phone && <span><Icon name="call" size="md" />{order.store.phone}</span>}
              </div>
            )}
            {SHOW_PICKUP_CODE.includes(order.status) && (
              <div className="otrack-code"><span>Mã đơn khi nhận hàng</span><b>{order.orderCode}</b></div>
            )}
            <dl className="otrack-times">
              {order.readyAt && <><dt>Sẵn sàng lúc</dt><dd>{formatDateTime(order.readyAt)}</dd></>}
              {order.pickedUpAt && <><dt>Đã nhận lúc</dt><dd>{formatDateTime(order.pickedUpAt)}</dd></>}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
