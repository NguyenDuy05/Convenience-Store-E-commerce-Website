import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/order-history.css';
import { listMyOrderHistory } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import AccountSidebar from '../../components/order/AccountSidebar';
import OrderHistoryRow from '../../components/order/OrderHistoryRow';
import { HISTORY_TABS } from '../../utils/orderMeta';
import { formatCurrency } from '../../utils/format';
import { dayEndISO, dayStartISO, daysAgoYMD, monthsAgoYMD, validYMD } from '../../utils/dateRange';

const LIMIT = 10;
const VALID_STATUS = HISTORY_TABS.map((t) => t.key);

const PRESETS = [
  { key: '30d', label: '30 ngày qua', from: () => daysAgoYMD(30) },
  { key: '3m', label: '3 tháng', from: () => monthsAgoYMD(3) },
  { key: '6m', label: '6 tháng', from: () => monthsAgoYMD(6) },
  { key: 'all', label: 'Tất cả', from: () => '' },
];

// UC-09.4 View Order History (xem lại đơn đã kết thúc, lọc theo kết quả và khoảng ngày)
export default function OrderHistoryPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // Toàn bộ bộ lọc nằm trên URL để có thể quay lại / chia sẻ / tải lại mà không mất
  const rawStatus = params.get('status') || '';
  const status = VALID_STATUS.includes(rawStatus) ? rawStatus : '';
  const from = validYMD(params.get('from'));
  const to = validYMD(params.get('to'));
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const rangeInvalid = !!(from && to && from > to);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (rangeInvalid) { setLoading(false); return undefined; } // không gọi API khi khoảng ngày sai
    let ignore = false;
    setLoading(true);
    setError('');
    listMyOrderHistory({
      status: status || undefined,
      from: from ? dayStartISO(from) : undefined,
      to: to ? dayEndISO(to) : undefined,
      page,
      limit: LIMIT,
    })
      .then((res) => { if (!ignore) setData(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        if (err.response?.status === 401) {
          await logout();
          navigate('/login', { state: { from: location }, replace: true });
          return;
        }
        setError(err.response?.data?.message || 'Không tải được lịch sử đơn hàng. Vui lòng thử lại.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [status, from, to, page, rangeInvalid, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch) => {
    const next = { status, from, to, ...patch };
    const q = {};
    if (next.status) q.status = next.status;
    if (next.from) q.from = next.from;
    if (next.to) q.to = next.to;
    if (next.page > 1) q.page = String(next.page);
    setParams(q);
  };

  const activePreset = !to ? PRESETS.find((p) => p.from() === from)?.key : undefined;
  const hasFilter = !!(status || from || to);
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const fromPath = `${location.pathname}${location.search}`;

  return (
    <div className="ohist">
      <nav className="ohist-crumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" />
        <Link to="/orders">Đơn hàng của tôi</Link><Icon name="chevron_right" size="sm" />
        <span aria-current="page">Lịch sử mua hàng</span>
      </nav>

      <div className="ohist-head">
        <div>
          <h1>Lịch sử mua hàng</h1>
          <p>Xem lại các đơn đã hoàn tất hoặc không thành công. Thông tin sản phẩm và giá là bản ghi tại thời điểm bạn đặt hàng.</p>
        </div>
        <Link className="ohist-link" to="/orders"><Icon name="receipt_long" size="md" />Đơn đang xử lý</Link>
      </div>

      <div className="ohist-grid">
        <div className="ohist-side"><AccountSidebar /></div>

        <section className="ohist-main">
          <div className="ohist-filters">
            <div className="ohist-seg" role="tablist" aria-label="Lọc theo kết quả đơn">
              {HISTORY_TABS.map((t) => (
                <button key={t.key || 'all'} type="button" role="tab" aria-selected={status === t.key}
                  className={status === t.key ? 'active' : ''} onClick={() => update({ status: t.key, page: 1 })}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ohist-range">
              <div className="ohist-presets" role="group" aria-label="Khoảng thời gian nhanh">
                {PRESETS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={activePreset === p.key || (p.key === 'all' && !from && !to)}
                    className={activePreset === p.key || (p.key === 'all' && !from && !to) ? 'active' : ''}
                    onClick={() => update({ from: p.from(), to: '', page: 1 })}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ohist-dates">
                <label>Từ ngày<input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value, page: 1 })} /></label>
                <label>Đến ngày<input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value, page: 1 })} /></label>
              </div>
            </div>
            {rangeInvalid && <p className="ohist-invalid" role="alert"><Icon name="error" size="md" />Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
          </div>

          {!loading && !error && !rangeInvalid && data && (
            <div className="ohist-summary">
              <div><span>Đơn đã nhận</span><b>{data.summary.completedCount}</b></div>
              <div><span>Tổng chi tiêu</span><b>{formatCurrency(data.summary.totalSpent)}</b></div>
              <div><span>Kết quả hiển thị</span><b>{data.total} đơn</b></div>
            </div>
          )}

          {loading && !rangeInvalid && (
            <div className="ohist-list" aria-busy="true" aria-label="Đang tải lịch sử">
              {[0, 1, 2, 3].map((i) => <div className="ohist-skeleton" key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="ohist-state error" role="alert">
              <Icon name="cloud_off" size="xl" />
              <h3>Chưa tải được lịch sử</h3>
              <p>{error}</p>
              <button type="button" className="ohist-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Thử lại</button>
            </div>
          )}

          {!loading && !error && !rangeInvalid && data && data.items.length === 0 && (
            <div className="ohist-state">
              <Icon name="history" size="xl" />
              <h3>{hasFilter ? 'Không có đơn nào phù hợp bộ lọc' : 'Bạn chưa có đơn hàng nào trong lịch sử'}</h3>
              <p>{hasFilter ? 'Thử mở rộng khoảng thời gian hoặc bỏ bộ lọc kết quả.' : 'Các đơn đã nhận hàng sẽ xuất hiện ở đây.'}</p>
              {hasFilter
                ? <button type="button" className="ohist-btn" onClick={() => setParams({})}>Xóa bộ lọc</button>
                : <Link className="ohist-btn" to="/products"><Icon name="storefront" />Bắt đầu mua sắm</Link>}
            </div>
          )}

          {!loading && !error && !rangeInvalid && data && data.items.length > 0 && (
            <>
              <ul className="ohist-list">
                {data.items.map((o) => <OrderHistoryRow key={o._id} order={o} fromPath={fromPath} />)}
              </ul>
              {totalPages > 1 && (
                <div className="ohist-pager">
                  <button type="button" disabled={page <= 1} onClick={() => { update({ page: page - 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <Icon name="chevron_left" size="md" />Trước
                  </button>
                  <span>Trang {page} / {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => { update({ page: page + 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
