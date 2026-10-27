import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/admin-order-detail.css';
import { getOrder } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import PriceSummary from '../../components/checkout/PriceSummary';
import AdminOrderStatusActions from '../../components/admin/AdminOrderStatusActions';
import OrderIssues from '../../components/admin/OrderIssues';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/orderMeta';

const TXN_STATUS = { success: 'Thành công', failed: 'Thất bại', pending: 'Đang chờ' };

// UC-34.3 View Order Details (Admin) + thao tác chuyển trạng thái và xử lý sự cố (UC-34.4)
export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onAuthError = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  // Tải (hoặc tải lại sau mỗi thao tác) đơn hàng. showSpinner=false khi tải lại để trang không nhấp nháy.
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await getOrder(id);
      setOrder(res.data); setError(null);
    } catch (err) {
      if (await onAuthError(err)) return;
      const notFound = err.response?.status === 404;
      setError({ notFound, message: notFound ? 'Đơn hàng không tồn tại.' : (err.response?.data?.message || 'Không tải được chi tiết đơn hàng. Vui lòng thử lại.') });
    } finally { setLoading(false); }
  }, [id, onAuthError]);

  useEffect(() => { setOrder(null); load(true); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/admin/orders';
  const crumb = (
    <nav className="aod-crumb" aria-label="Breadcrumb">
      <Link to="/admin">Quản trị</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Đơn hàng</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{order ? `#${order.orderCode}` : 'Chi tiết đơn'}</span>
    </nav>
  );

  if (loading && !order) return <div className="aod">{crumb}<div className="aod-skeleton" aria-busy="true" aria-label="Đang tải chi tiết đơn" /></div>;

  if (error && !order) {
    return (
      <div className="aod">{crumb}
        <div className="aod-state" role="alert"><Icon name={error.notFound ? 'search_off' : 'cloud_off'} size="xl" />
          <h2>{error.notFound ? 'Không tìm thấy đơn hàng' : 'Chưa tải được đơn hàng'}</h2><p>{error.message}</p>
          <div className="aod-state-actions">
            {!error.notFound && <button type="button" className="aod-btn" onClick={() => load(true)}><Icon name="refresh" size="md" />Thử lại</button>}
            <Link className="aod-btn ghost" to="/admin/orders"><Icon name="arrow_back" size="md" />Về danh sách</Link></div></div>
      </div>
    );
  }

  const openIssues = order.issues.filter((i) => i.status === 'open').length;
  const reviewTxns = order.transactions.filter((t) => t.needsReview).length;
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const pay = PAYMENT_STATUS[order.paymentStatus];

  return (
    <div className="aod">
      {crumb}

      <header className="aod-head">
        <div>
          <div className="aod-title-row">
            <h1>Đơn #{order.orderCode}</h1>
            <OrderStatusBadge status={order.status} />
            <span className="aod-chip">{ORDER_SOURCE[order.source]}</span>
          </div>
          <p>Đặt lúc {formatDateTime(order.createdAt)} • {itemCount} sản phẩm • {formatCurrency(order.totalAmount)}</p>
        </div>
        <Link className="aod-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Quay lại danh sách</Link>
      </header>

      {error && <div className="aod-warn" role="alert"><Icon name="warning" size="lg" /><span>{error.message} Dữ liệu bên dưới có thể chưa mới nhất.</span><button type="button" onClick={() => load()}>Tải lại</button></div>}
      {(openIssues > 0 || reviewTxns > 0) && (
        <div className="aod-alert" role="status"><Icon name="report" size="lg" fill />
          <div><strong>Đơn này cần xử lý</strong>
            <span>{openIssues > 0 && `${openIssues} sự cố chưa xử lý. `}{reviewTxns > 0 && `${reviewTxns} giao dịch thanh toán cần rà soát.`}</span></div>
          <a href="#issues">Xem sự cố</a></div>
      )}

      <AdminOrderStatusActions key={`${order.status}-${order.updatedAt}`} order={order} onChanged={() => load()} onAuthError={onAuthError} />

      <div className="aod-grid">
        <div className="aod-col">
          <section className="aod-card">
            <h2><Icon name="shopping_basket" />Sản phẩm trong đơn</h2>
            <ul className="aod-items">
              {order.items.map((it, i) => (
                <li key={`${it.sku || it.name}-${i}`}>
                  <div className="aod-thumb">{it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}</div>
                  <div className="aod-item-info"><b>{it.name}</b>
                    <span>{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''} × {it.quantity}{it.sku ? ` • SKU ${it.sku}` : ''}</span>
                    {it.discountAmount > 0 && <em>Giảm {formatCurrency(it.discountAmount)}</em>}</div>
                  <div className="aod-item-total">{formatCurrency(it.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <PriceSummary subtotal={order.subtotal} appliedPromotions={order.appliedPromotions} promotionDiscount={order.promotionDiscount}
              discountCode={order.discountCode} totalAmount={order.totalAmount}>
              {order.pointsDiscount > 0 && <div className="aod-note">Đã dùng {order.pointsUsed} điểm (−{formatCurrency(order.pointsDiscount)}).</div>}
            </PriceSummary>
          </section>

          <section className="aod-card" id="issues">
            <h2><Icon name="report" />Sự cố của đơn {openIssues > 0 && <span className="aod-count">{openIssues}</span>}</h2>
            <OrderIssues orderId={order._id} issues={order.issues} onChanged={() => load()} onAuthError={onAuthError} />
          </section>
        </div>

        <div className="aod-col">
          <section className="aod-card">
            <h2><Icon name="person" />Khách hàng</h2>
            {order.customer ? (
              <div className="aod-kv"><b>{order.customer.fullName}</b><span>{order.customer.email}</span>{order.customer.phone && <span>{order.customer.phone}</span>}</div>
            ) : <p className="aod-muted">Khách mua tại quầy (không có tài khoản).</p>}
            {order.createdBy && <p className="aod-muted">Nhân viên tạo đơn: <b>{order.createdBy}</b></p>}
            {order.customerNote && <div className="aod-note"><Icon name="sticky_note_2" size="md" /><span>{order.customerNote}</span></div>}
            {order.store && <p className="aod-muted"><Icon name="store" size="md" />Nhận tại {order.store.name}{order.store.address ? `, ${order.store.address}` : ''}</p>}
          </section>

          <section className="aod-card">
            <h2><Icon name="credit_card" />Thanh toán</h2>
            <div className="aod-rows">
              <div><span>Phương thức</span><b>{PAYMENT_METHOD[order.paymentMethod] || '—'}</b></div>
              <div><span>Trạng thái</span>{pay ? <b className={`aod-pay ${pay.tone}`}>{pay.label}</b> : '—'}</div>
              {order.paidAt && <div><span>Thanh toán lúc</span><b>{formatDateTime(order.paidAt)}</b></div>}
              {order.readyAt && <div><span>Sẵn sàng lúc</span><b>{formatDateTime(order.readyAt)}</b></div>}
              {order.pickedUpAt && <div><span>Đã nhận lúc</span><b>{formatDateTime(order.pickedUpAt)}</b></div>}
            </div>
            <h3 className="aod-sub">Giao dịch ({order.transactions.length})</h3>
            {order.transactions.length === 0 && <p className="aod-muted">Chưa có giao dịch nào.</p>}
            <ul className="aod-txns">
              {order.transactions.map((t) => (
                <li key={t._id} className={t.needsReview ? 'review' : ''}>
                  <div><b>{PAYMENT_METHOD[t.method]}</b> • {formatCurrency(t.amount)}<span className={`aod-txn-st ${t.status}`}>{TXN_STATUS[t.status]}</span></div>
                  <small>{t.txnRef ? `Mã GD ${t.txnRef}` : 'Giao dịch tại quầy'}{t.gateway?.transactionNo ? ` • Số GD cổng ${t.gateway.transactionNo}` : ''}{t.processedBy ? ` • ${t.processedBy}` : ''}</small>
                  <small>{formatDateTime(t.paidAt || t.createdAt)}</small>
                  {t.failureReason && <small className="aod-fail">{t.failureReason}</small>}
                  {t.needsReview && <small className="aod-review"><Icon name="flag" size="sm" fill />Cần rà soát / hoàn tiền</small>}
                </li>
              ))}
            </ul>
          </section>

          <section className="aod-card">
            <h2><Icon name="history" />Lịch sử trạng thái</h2>
            {order.statusHistory.length === 0 && <p className="aod-muted">Chưa có lịch sử.</p>}
            <ol className="aod-history">
              {order.statusHistory.map((h, i) => (
                <li key={`${h.status}-${i}`}>
                  <b>{ORDER_STATUS[h.status]?.label || h.status}</b>
                  <span>{formatDateTime(h.changedAt)} • {h.changedBy || 'Hệ thống'}</span>
                  {h.note && <em>{h.note}</em>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
