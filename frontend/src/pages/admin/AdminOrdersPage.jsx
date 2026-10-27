import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/admin-orders.css';
import { listOrders } from '../../api/order.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { dayEndISO, dayStartISO, validYMD } from '../../utils/dateRange';
import { ORDER_SOURCE, ORDER_TABS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/orderMeta';

const LIMIT = 20;
const SORTS = [['newest', 'Mới nhất'], ['oldest', 'Cũ nhất'], ['total_desc', 'Tổng tiền cao → thấp'], ['total_asc', 'Tổng tiền thấp → cao']];
const pickOf = (value, allowed) => (allowed.includes(value) ? value : '');

// UC-34.1 View Orders + UC-34.2 Search Orders (Admin)
export default function AdminOrdersPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // Mọi bộ lọc nằm trên URL: tải lại / quay lại từ trang chi tiết vẫn giữ nguyên
  const q = (params.get('q') || '').slice(0, 100);
  const status = pickOf(params.get('status') || '', ORDER_TABS.map((t) => t.key));
  const source = pickOf(params.get('source') || '', Object.keys(ORDER_SOURCE));
  const paymentStatus = pickOf(params.get('paymentStatus') || '', Object.keys(PAYMENT_STATUS));
  const paymentMethod = pickOf(params.get('paymentMethod') || '', Object.keys(PAYMENT_METHOD));
  const from = validYMD(params.get('from'));
  const to = validYMD(params.get('to'));
  const hasIssue = params.get('hasIssue') === '1';
  const sort = pickOf(params.get('sort') || '', SORTS.map((s) => s[0])) || 'newest';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const rangeInvalid = !!(from && to && from > to);

  const [qInput, setQInput] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const update = useCallback((patch) => {
    const next = { q, status, source, paymentStatus, paymentMethod, from, to, hasIssue: hasIssue ? '1' : '', sort, page: 1, ...patch };
    const out = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === false || (k === 'sort' && v === 'newest') || (k === 'page' && v <= 1)) return;
      out[k] = String(v);
    });
    setParams(out);
  }, [q, status, source, paymentStatus, paymentMethod, from, to, hasIssue, sort, setParams]);

  // Gõ tìm kiếm: chờ 400ms sau lần gõ cuối rồi mới đưa lên URL (Enter tìm ngay)
  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => {
    if (qInput.trim() === q) return undefined;
    const t = setTimeout(() => update({ q: qInput.trim() }), 400);
    return () => clearTimeout(t);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rangeInvalid) { setLoading(false); return undefined; }
    let ignore = false;
    setLoading(true); setError('');
    listOrders({
      q: q || undefined, status: status || undefined, source: source || undefined, paymentStatus: paymentStatus || undefined,
      paymentMethod: paymentMethod || undefined, from: from ? dayStartISO(from) : undefined, to: to ? dayEndISO(to) : undefined,
      hasIssue: hasIssue ? '1' : undefined, sort, page, limit: LIMIT,
    })
      .then((res) => { if (!ignore) setData(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        if (err.response?.status === 401) { await logout(); navigate('/login', { state: { from: location }, replace: true }); return; }
        setError(err.response?.data?.message || 'Không tải được danh sách đơn hàng. Vui lòng thử lại.');
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [q, status, source, paymentStatus, paymentMethod, from, to, hasIssue, sort, page, rangeInvalid, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilter = !!(q || status || source || paymentStatus || paymentMethod || from || to || hasIssue);
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const counts = data?.counts;
  const fromPath = `${location.pathname}${location.search}`;

  return (
    <div className="aord">
      <div className="aord-head">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>Tìm kiếm, lọc và xử lý tất cả đơn hàng (online và tại quầy).</p>
        </div>
        {data && data.openIssueTotal > 0 && (
          <button type="button" className={`aord-issue-chip ${hasIssue ? 'on' : ''}`} onClick={() => update({ hasIssue: hasIssue ? '' : '1' })}>
            <Icon name="report" size="md" fill />{data.openIssueTotal} đơn có sự cố chưa xử lý
          </button>
        )}
      </div>

      <div className="aord-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {ORDER_TABS.map((t) => (
          <button key={t.key || 'all'} type="button" role="tab" aria-selected={status === t.key} className={status === t.key ? 'active' : ''} onClick={() => update({ status: t.key })}>
            {t.label}{counts && <span>{counts[t.key || 'all'] ?? 0}</span>}
          </button>
        ))}
      </div>

      <form className="aord-filters" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }} role="search">
        <div className="aord-search">
          <Icon name="search" size="md" />
          <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100}
            placeholder="Tìm mã đơn, tên / email / SĐT khách, tên sản phẩm…" aria-label="Tìm đơn hàng" />
        </div>
        <label>Nguồn
          <select value={source} onChange={(e) => update({ source: e.target.value })}>
            <option value="">Tất cả</option>{Object.entries(ORDER_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label>Thanh toán
          <select value={paymentStatus} onChange={(e) => update({ paymentStatus: e.target.value })}>
            <option value="">Tất cả</option>{Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></label>
        <label>Phương thức
          <select value={paymentMethod} onChange={(e) => update({ paymentMethod: e.target.value })}>
            <option value="">Tất cả</option>{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label>Từ ngày<input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} /></label>
        <label>Đến ngày<input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} /></label>
        <label>Sắp xếp
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}>{SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="aord-check"><input type="checkbox" checked={hasIssue} onChange={(e) => update({ hasIssue: e.target.checked ? '1' : '' })} />Có sự cố</label>
        {hasFilter && <button type="button" className="aord-clear" onClick={() => { setQInput(''); setParams({}); }}>Xóa bộ lọc</button>}
      </form>
      {rangeInvalid && <p className="aord-invalid" role="alert"><Icon name="error" size="md" />Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}

      {loading && !rangeInvalid && <div className="aord-skeleton" aria-busy="true" aria-label="Đang tải đơn hàng" />}

      {!loading && error && (
        <div className="aord-state" role="alert"><Icon name="cloud_off" size="xl" /><h3>Chưa tải được đơn hàng</h3><p>{error}</p>
          <button type="button" className="aord-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Thử lại</button></div>
      )}

      {!loading && !error && !rangeInvalid && data && data.items.length === 0 && (
        <div className="aord-state"><Icon name="search_off" size="xl" />
          <h3>{hasFilter ? 'Không tìm thấy đơn nào phù hợp' : 'Chưa có đơn hàng nào'}</h3>
          <p>{hasFilter ? 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.' : 'Đơn hàng sẽ xuất hiện ở đây khi khách đặt hàng.'}</p>
          {hasFilter && <button type="button" className="aord-btn" onClick={() => { setQInput(''); setParams({}); }}>Xóa bộ lọc</button>}</div>
      )}

      {!loading && !error && !rangeInvalid && data && data.items.length > 0 && (
        <>
          <p className="aord-count">Tìm thấy <b>{data.total}</b> đơn</p>
          <div className="aord-table-wrap">
            <table className="aord-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Nguồn</th><th>Trạng thái</th><th>Thanh toán</th><th className="num">Tổng tiền</th><th>Ngày đặt</th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link className="aord-code" to={`/admin/orders/${o._id}`} state={{ from: fromPath }}>#{o.orderCode}</Link>
                      {o.openIssues > 0 && <span className="aord-issue" title="Sự cố chưa xử lý"><Icon name="report" size="sm" fill />{o.openIssues}</span>}
                      <small>{o.itemCount} sản phẩm</small>
                    </td>
                    <td>{o.customer ? <><b>{o.customer.fullName}</b><small>{o.customer.email}{o.customer.phone ? ` • ${o.customer.phone}` : ''}</small></> : <span className="aord-muted">Khách tại quầy</span>}</td>
                    <td>{ORDER_SOURCE[o.source]}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td><span className={`aord-pay ${o.paymentStatus}`}>{PAYMENT_STATUS[o.paymentStatus]?.label}</span><small>{PAYMENT_METHOD[o.paymentMethod] || '—'}</small></td>
                    <td className="num">{formatCurrency(o.totalAmount)}</td>
                    <td>{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="aord-pager">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}><Icon name="chevron_left" size="md" />Trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>Sau<Icon name="chevron_right" size="md" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
