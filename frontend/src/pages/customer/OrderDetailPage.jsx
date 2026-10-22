import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-detail.css';
import { getMyOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_STATUS_MESSAGE, PAYMENT_METHOD, PAYMENT_STATUS, SHOW_PICKUP_CODE } from '../../utils/orderMeta';

const todayHours = (store) => {
  const h = store?.openingHours?.find((x) => x.day === new Date().getDay());
  if (!h) return '';
  return h.isClosed ? 'Hôm nay cửa hàng nghỉ' : `Hôm nay ${h.openTime} – ${h.closeTime}`;
};

function Row({ label, value, strong, minus }) {
  return (
    <div className={`odetail-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <span>{minus ? '− ' : ''}{value}</span>
    </div>
  );
}

// UC-09.2 View Order Details (chỉ xem, không sửa đơn)
export default function OrderDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);       // { notFound, message }
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    setOrder(null);
    getMyOrder(id)
      .then((res) => { if (!ignore) setOrder(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        const code = err.response?.status;
        if (code === 401) {
          await logout();
          navigate('/login', { state: { from: location }, replace: true });
          return;
        }
        setError({
          notFound: code === 404,
          message: code === 404 ? 'Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn này.' : (err.response?.data?.message || 'Không tải được chi tiết đơn hàng. Vui lòng thử lại.'),
        });
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const crumb = (
    <nav className="odetail-crumb" aria-label="Breadcrumb">
      <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
      <Link to="/orders">Đơn hàng của tôi</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{order ? `#${order.orderCode}` : 'Chi tiết đơn'}</span>
    </nav>
  );

  if (loading) {
    return (
      <div className="odetail">
        {crumb}
        <div className="odetail-skeleton" aria-busy="true" aria-label="Đang tải chi tiết đơn" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="odetail">
        {crumb}
        <div className="odetail-state" role="alert">
          <Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? 'Không tìm thấy đơn hàng' : 'Chưa tải được đơn hàng'}</h2>
          <p>{error.message}</p>
          <div className="odetail-state-actions">
            {!error.notFound && <button type="button" className="odetail-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className={`odetail-btn ${error.notFound ? '' : 'ghost'}`} to="/orders"><Icon name="arrow_back" size="md" />Về danh sách đơn</Link>
          </div>
        </div>
      </div>
    );
  }

  const banner = ORDER_STATUS_MESSAGE[order.status];
  // Quay lại đúng nơi khách đến (danh sách hoặc lịch sử)
  const backTo = location.state?.from || '/orders';
  const backLabel = backTo.startsWith('/orders/history') ? 'Quay lại lịch sử' : 'Quay lại danh sách';
  const payStatus = PAYMENT_STATUS[order.paymentStatus];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const hours = todayHours(order.store);

  return (
    <div className="odetail">
      {crumb}

      <header className="odetail-head">
        <div>
          <div className="odetail-title-row">
            <h1>Đơn #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p>Đặt lúc {formatDateTime(order.createdAt)} • {itemCount} sản phẩm</p>
        </div>
        <div className="odetail-actions">
          <Link className="odetail-btn" to={`/orders/${order._id}/tracking`}><Icon name="local_shipping" size="md" />Theo dõi đơn</Link>
          <Link className="odetail-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />{backLabel}</Link>
        </div>
      </header>

      {banner && (
        <div className={`odetail-banner ${banner.tone}`}>
          <span className="odetail-banner-icon"><Icon name={banner.icon} size="lg" /></span>
          <div><strong>{banner.title}</strong><span>{banner.text}</span></div>
        </div>
      )}

      <div className="odetail-grid">
        <section className="odetail-card odetail-items">
          <h2>Sản phẩm trong đơn</h2>
          {order.items.length === 0 && (
            <p className="odetail-muted">Chi tiết sản phẩm của đơn này không còn được lưu nên không thể hiển thị. Tổng tiền và thông tin thanh toán vẫn được giữ nguyên.</p>
          )}
          <ul>
            {order.items.map((it, idx) => (
              <li key={`${it.sku || it.name}-${idx}`} className="odetail-item">
                <div className="odetail-thumb">
                  {it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}
                </div>
                <div className="odetail-item-info">
                  {it.productId
                    ? <Link to={`/products/${it.productId}`} className="odetail-item-name">{it.name}</Link>
                    : <span className="odetail-item-name">{it.name}</span>}
                  <span className="odetail-item-sub">
                    {formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}
                    {it.sku ? <> • SKU {it.sku}</> : null}
                  </span>
                  {it.discountAmount > 0 && <span className="odetail-item-disc">Giảm {formatCurrency(it.discountAmount)}</span>}
                </div>
                <div className="odetail-item-total">{formatCurrency(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
        </section>

        <div className="odetail-side">
          <section className="odetail-card">
            <h2><Icon name="store" />Nhận hàng tại cửa hàng</h2>
            {order.store ? (
              <div className="odetail-store">
                <b>{order.store.name}</b>
                {order.store.address && <span><Icon name="location_on" size="md" />{order.store.address}</span>}
                {order.store.phone && <span><Icon name="call" size="md" />{order.store.phone}</span>}
                {hours && <span><Icon name="schedule" size="md" />{hours}</span>}
              </div>
            ) : <p className="odetail-muted">Chưa có thông tin cửa hàng.</p>}

            {SHOW_PICKUP_CODE.includes(order.status) && (
              <div className="odetail-code">
                <span>Mã đơn khi nhận hàng</span>
                <b>{order.orderCode}</b>
              </div>
            )}

            <dl className="odetail-times">
              {order.readyAt && <><dt>Sẵn sàng lúc</dt><dd>{formatDateTime(order.readyAt)}</dd></>}
              {order.pickedUpAt && <><dt>Đã nhận lúc</dt><dd>{formatDateTime(order.pickedUpAt)}</dd></>}
            </dl>

            {order.customerNote && (
              <div className="odetail-note"><Icon name="sticky_note_2" size="md" /><span>{order.customerNote}</span></div>
            )}
          </section>

          <section className="odetail-card">
            <h2><Icon name="credit_card" />Thanh toán</h2>
            <div className="odetail-pay">
              <Row label="Phương thức" value={PAYMENT_METHOD[order.paymentMethod] || '—'} />
              <div className="odetail-row">
                <span>Trạng thái</span>
                {payStatus ? <span className={`odetail-chip ${payStatus.tone}`}>{payStatus.label}</span> : <span>—</span>}
              </div>
              {order.paidAt && <Row label="Thanh toán lúc" value={formatDateTime(order.paidAt)} />}
              {order.paymentStatus === 'unpaid' && order.paymentMethod === 'cash' && (
                <p className="odetail-muted">Bạn thanh toán tiền mặt cho nhân viên khi nhận hàng.</p>
              )}
            </div>
          </section>

          <section className="odetail-card">
            <h2><Icon name="receipt_long" />Tổng kết đơn</h2>
            <div className="odetail-sum">
              <Row label="Tạm tính" value={formatCurrency(order.subtotal)} />
              {order.appliedPromotions.map((p, i) => <Row key={`${p.name}-${i}`} label={`Khuyến mãi: ${p.name}`} value={formatCurrency(p.amount)} minus />)}
              {order.appliedPromotions.length === 0 && order.promotionDiscount > 0 && <Row label="Khuyến mãi" value={formatCurrency(order.promotionDiscount)} minus />}
              {order.discountCode && <Row label={`Mã giảm giá ${order.discountCode.code}`} value={formatCurrency(order.discountCode.amount)} minus />}
              {order.pointsDiscount > 0 && <Row label={`Dùng ${order.pointsUsed} điểm`} value={formatCurrency(order.pointsDiscount)} minus />}
              <div className="odetail-sep" />
              <Row label="Tổng thanh toán" value={formatCurrency(order.totalAmount)} strong />
              {order.pointsEarned > 0 && <p className="odetail-earned"><Icon name="stars" size="md" fill />Tích lũy +{order.pointsEarned} điểm</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
