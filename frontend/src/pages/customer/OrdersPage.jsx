import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/orders.css';
import { listMyOrders } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import AccountSidebar from '../../components/order/AccountSidebar';
import OrderFilterTabs from '../../components/order/OrderFilterTabs';
import OrderCard from '../../components/order/OrderCard';
import { ACTIVE_STATUSES, ORDER_TABS } from '../../utils/orderMeta';

const LIMIT = 10;
const VALID_STATUS = ORDER_TABS.map((t) => t.key);

// UC-09.1 View Orders (khách xem danh sách đơn của mình, lọc theo trạng thái)
export default function OrdersPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // Trạng thái lọc và trang nằm trên URL: bấm "Quay lại" từ trang chi tiết vẫn giữ nguyên bộ lọc
  const rawStatus = params.get('status') || '';
  const status = VALID_STATUS.includes(rawStatus) ? rawStatus : '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

  const [data, setData] = useState(null);       // { items, total, counts, store }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    listMyOrders({ status: status || undefined, page, limit: LIMIT })
      .then((res) => { if (!ignore) setData(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        // Hết phiên đăng nhập: không hiện dữ liệu, yêu cầu đăng nhập lại
        if (err.response?.status === 401) {
          await logout();
          navigate('/login', { state: { from: location }, replace: true });
          return;
        }
        setError(err.response?.data?.message || 'Không tải được danh sách đơn hàng. Vui lòng thử lại.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [status, page, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = useCallback((key) => {
    setParams(key ? { status: key } : {}, { replace: false });
  }, [setParams]);

  const changePage = (p) => {
    const next = {};
    if (status) next.status = status;
    if (p > 1) next.page = String(p);
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const counts = data?.counts;
  const activeCount = counts ? ACTIVE_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0) : 0;
  // Dùng limit server trả về (server có thể giới hạn khác LIMIT yêu cầu)
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const storeName = data?.store?.name;

  return (
    <div className="orders">
      <nav className="orders-crumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
        <Link to="/profile">Tài khoản</Link><Icon name="chevron_right" size="sm" />
        <span aria-current="page">Đơn hàng của tôi</span>
      </nav>

      <div className="orders-head">
        <div>
          <h1>Đơn hàng của tôi</h1>
          <p>Theo dõi đơn đang chuẩn bị và xem lại các đơn đã mua. Tất cả đơn đều nhận trực tiếp tại cửa hàng.</p>
        </div>
        {counts && (counts.ready_for_pickup > 0 || counts.preparing > 0) && (
          <div className="orders-chips">
            <span className="orders-chip ready"><i />{counts.ready_for_pickup} sẵn sàng nhận</span>
            <span className="orders-chip-sep">•</span>
            <span className="orders-chip"><Icon name="schedule" size="md" />{counts.preparing} đang chuẩn bị</span>
          </div>
        )}
      </div>

      <div className="orders-grid">
        <div className="orders-side"><AccountSidebar activeCount={activeCount} /></div>

        <section className="orders-main">
          <OrderFilterTabs active={status} counts={counts} onChange={changeStatus} />

          {loading && (
            <div className="orders-list" aria-busy="true" aria-label="Đang tải đơn hàng">
              {[0, 1, 2].map((i) => <div className="orders-skeleton" key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="orders-state error" role="alert">
              <Icon name="cloud_off" size="xl" />
              <h3>Chưa tải được đơn hàng</h3>
              <p>{error}</p>
              <button type="button" className="orders-btn" onClick={() => setReloadKey((k) => k + 1)}>
                <Icon name="refresh" size="md" />Thử lại
              </button>
            </div>
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <div className="orders-state">
              <Icon name="shopping_bag" size="xl" />
              <h3>{status ? 'Không có đơn nào ở trạng thái này' : 'Bạn chưa có đơn hàng nào'}</h3>
              <p>{status ? 'Thử chọn trạng thái khác hoặc xem tất cả đơn hàng.' : 'Đặt món đầu tiên và ghé cửa hàng nhận hàng trong ít phút.'}</p>
              {status
                ? <button type="button" className="orders-btn" onClick={() => changeStatus('')}>Xem tất cả đơn</button>
                : <Link className="orders-btn" to="/products"><Icon name="storefront" />Bắt đầu mua sắm</Link>}
            </div>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <>
              <div className="orders-list">
                {data.items.map((o) => <OrderCard key={o._id} order={o} storeName={storeName} />)}
              </div>
              {totalPages > 1 && (
                <div className="orders-pager">
                  <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                    <Icon name="chevron_left" size="md" />Trước
                  </button>
                  <span>Trang {page} / {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                    Sau<Icon name="chevron_right" size="md" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
