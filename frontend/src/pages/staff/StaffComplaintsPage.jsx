import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-complaints.css';
import { listSupportRequests } from '../../api/support.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import ComplaintBadge from '../../components/staff/ComplaintBadge';
import { formatDateTime } from '../../utils/format';
import { COMPLAINT_TABS, COMPLAINT_TYPE } from '../../utils/complaintMeta';

const LIMIT = 20;

// UC-19.3 Handle Customer Complaint (Staff): danh sách khiếu nại / yêu cầu hỗ trợ, lọc theo trạng thái và loại
export default function StaffComplaintsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const q = (params.get('q') || '').slice(0, 100);
  const status = ['open', 'in_progress', 'resolved'].includes(params.get('status')) ? params.get('status') : '';
  const type = Object.keys(COMPLAINT_TYPE).includes(params.get('type')) ? params.get('type') : '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

  const [qInput, setQInput] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const update = useCallback((patch) => {
    const next = { q, status, type, page: 1, ...patch };
    const out = {};
    Object.entries(next).forEach(([k, v]) => { if (v === '' || v === undefined || (k === 'page' && v <= 1)) return; out[k] = String(v); });
    setParams(out);
  }, [q, status, type, setParams]);

  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => {
    if (qInput.trim() === q) return undefined;
    const t = setTimeout(() => update({ q: qInput.trim() }), 400);
    return () => clearTimeout(t);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ignore = false;
    setLoading(true); setError('');
    listSupportRequests({ q: q || undefined, status: status || undefined, type: type || undefined, page, limit: LIMIT })
      .then((res) => { if (!ignore) setData(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        if (err.response?.status === 401) { await logout(); navigate('/login', { state: { from: location }, replace: true }); return; }
        setError(err.response?.status === 403 ? 'Bạn không có quyền xử lý khiếu nại.' : (err.response?.data?.message || 'Không tải được danh sách khiếu nại. Vui lòng thử lại.'));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [q, status, type, page, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilter = !!(q || status || type);
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const counts = data?.counts;
  const fromPath = `${location.pathname}${location.search}`;
  const denied = error.includes('quyền');

  return (
    <div className="scmp">
      <div className="scmp-head"><h1>Khiếu nại &amp; hỗ trợ</h1><p>Xem và xử lý các khiếu nại, yêu cầu hỗ trợ của khách hàng.</p></div>

      <div className="scmp-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {COMPLAINT_TABS.map((t) => (
          <button key={t.key || 'all'} type="button" role="tab" aria-selected={status === t.key} className={status === t.key ? 'active' : ''} onClick={() => update({ status: t.key })}>
            {t.label}{counts && <span>{counts[t.key || 'all'] ?? 0}</span>}
          </button>
        ))}
      </div>

      <form className="scmp-filters" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }} role="search">
        <div className="scmp-search"><Icon name="search" size="md" />
          <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder="Tìm theo tiêu đề, nội dung hoặc tên khách…" aria-label="Tìm khiếu nại" /></div>
        <label>Loại
          <select value={type} onChange={(e) => update({ type: e.target.value })}><option value="">Tất cả</option>{Object.entries(COMPLAINT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {hasFilter && <button type="button" className="scmp-clear" onClick={() => { setQInput(''); setParams({}); }}>Xóa bộ lọc</button>}
      </form>

      {loading && <div className="scmp-skeleton" aria-busy="true" aria-label="Đang tải khiếu nại" />}
      {!loading && error && (
        <div className="scmp-state" role="alert"><Icon name={denied ? 'lock' : 'cloud_off'} size="xl" /><h3>{denied ? 'Không có quyền truy cập' : 'Chưa tải được danh sách'}</h3><p>{error}</p>
          {!denied && <button type="button" className="scmp-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Thử lại</button>}</div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="scmp-state"><Icon name="inbox" size="xl" /><h3>{hasFilter ? 'Không có yêu cầu nào phù hợp' : 'Chưa có khiếu nại nào'}</h3>
          <p>{hasFilter ? 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.' : 'Khi khách gửi khiếu nại hoặc yêu cầu hỗ trợ, chúng sẽ xuất hiện ở đây.'}</p>
          {hasFilter && <button type="button" className="scmp-btn" onClick={() => { setQInput(''); setParams({}); }}>Xóa bộ lọc</button>}</div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <p className="scmp-count">Có <b>{data.total}</b> yêu cầu</p>
          <div className="scmp-table-wrap">
            <table className="scmp-table">
              <thead><tr><th>Nội dung</th><th>Khách hàng</th><th>Đơn hàng</th><th>Trạng thái</th><th className="num">Phản hồi</th><th>Gửi lúc</th><th>Người xử lý</th></tr></thead>
              <tbody>{data.items.map((r) => (
                <tr key={r._id}>
                  <td><Link className="scmp-subject" to={`/staff/complaints/${r._id}`} state={{ from: fromPath }}>{r.subject}</Link><span><ComplaintBadge type={r.type} /></span></td>
                  <td>{r.customer ? r.customer.fullName : <span className="scmp-muted">—</span>}</td>
                  <td>{r.orderCode ? `#${r.orderCode}` : <span className="scmp-muted">—</span>}</td>
                  <td><ComplaintBadge status={r.status} /></td>
                  <td className="num">{r.responseCount}</td>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.handledBy || <span className="scmp-muted">Chưa có</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="scmp-pager">
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
