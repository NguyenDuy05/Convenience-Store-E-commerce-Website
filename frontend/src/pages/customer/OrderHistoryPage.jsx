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
  { key: '30d', label: "Last 30 days", from: () => daysAgoYMD(30) },
  { key: '3m', label: "3 months", from: () => monthsAgoYMD(3) },
  { key: '6m', label: "6 months", from: () => monthsAgoYMD(6) },
  { key: 'all', label: "All", from: () => '' },
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
        setError(err.response?.data?.message || "Could not load order history. Please try again.");
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
        <Link to="/">Home</Link><Icon name="chevron_right" size="sm" />
        <Link to="/orders">My orders</Link><Icon name="chevron_right" size="sm" />
        <span aria-current="page">Order history</span>
      </nav>

      <div className="ohist-head">
        <div>
          <h1>Order history</h1>
          <p>Review completed and unsuccessful orders. Product details and prices reflect the time each order was placed.</p>
        </div>
        <Link className="ohist-link" to="/orders"><Icon name="receipt_long" size="md" />Active orders</Link>
      </div>

      <div className="ohist-grid">
        <div className="ohist-side"><AccountSidebar /></div>

        <section className="ohist-main">
          <div className="ohist-filters">
            <div className="ohist-seg" role="tablist" aria-label="Filter by order outcome">
              {HISTORY_TABS.map((t) => (
                <button key={t.key || 'all'} type="button" role="tab" aria-selected={status === t.key}
                  className={status === t.key ? 'active' : ''} onClick={() => update({ status: t.key, page: 1 })}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ohist-range">
              <div className="ohist-presets" role="group" aria-label="Quick date range">
                {PRESETS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={activePreset === p.key || (p.key === 'all' && !from && !to)}
                    className={activePreset === p.key || (p.key === 'all' && !from && !to) ? 'active' : ''}
                    onClick={() => update({ from: p.from(), to: '', page: 1 })}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ohist-dates">
                <label>From date<input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value, page: 1 })} /></label>
                <label>To date<input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value, page: 1 })} /></label>
              </div>
            </div>
            {rangeInvalid && <p className="ohist-invalid" role="alert"><Icon name="error" size="md" />The start date must be on or before the end date.</p>}
          </div>

          {!loading && !error && !rangeInvalid && data && (
            <div className="ohist-summary">
              <div><span>Collected orders</span><b>{data.summary.completedCount}</b></div>
              <div><span>Total spent</span><b>{formatCurrency(data.summary.totalSpent)}</b></div>
              <div><span>Results</span><b>{data.total} orders</b></div>
            </div>
          )}

          {loading && !rangeInvalid && (
            <div className="ohist-list" aria-busy="true" aria-label="Loading history">
              {[0, 1, 2, 3].map((i) => <div className="ohist-skeleton" key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="ohist-state error" role="alert">
              <Icon name="cloud_off" size="xl" />
              <h3>Could not load history</h3>
              <p>{error}</p>
              <button type="button" className="ohist-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Try again</button>
            </div>
          )}

          {!loading && !error && !rangeInvalid && data && data.items.length === 0 && (
            <div className="ohist-state">
              <Icon name="history" size="xl" />
              <h3>{hasFilter ? "No orders match these filters" : "You have no past orders yet"}</h3>
              <p>{hasFilter ? "Try a wider date range or clear the outcome filter." : "Collected orders will appear here."}</p>
              {hasFilter
                ? <button type="button" className="ohist-btn" onClick={() => setParams({})}>Clear filters</button>
                : <Link className="ohist-btn" to="/products"><Icon name="storefront" />Start shopping</Link>}
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
                    <Icon name="chevron_left" size="md" />Previous
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
