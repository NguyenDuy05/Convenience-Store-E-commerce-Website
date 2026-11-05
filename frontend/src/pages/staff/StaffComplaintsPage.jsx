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

// UC-19.3 Handle Customer Complaint (Staff): list complaints and support requests, filtered by status and type
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
        setError(err.response?.status === 403 ? 'You do not have permission to handle complaints.' : (err.response?.data?.message || 'Unable to load complaints. Please try again.'));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [q, status, type, page, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilter = !!(q || status || type);
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const counts = data?.counts;
  const fromPath = `${location.pathname}${location.search}`;
  const denied = error.includes('permission');

  return (
    <div className="scmp">
      <div className="scmp-head"><h1>Complaints &amp; Support</h1><p>View and handle customer complaints and support requests.</p></div>

      <div className="scmp-tabs" role="tablist" aria-label="Filter by status">
        {COMPLAINT_TABS.map((t) => (
          <button key={t.key || 'all'} type="button" role="tab" aria-selected={status === t.key} className={status === t.key ? 'active' : ''} onClick={() => update({ status: t.key })}>
            {t.label}{counts && <span>{counts[t.key || 'all'] ?? 0}</span>}
          </button>
        ))}
      </div>

      <form className="scmp-filters" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }} role="search">
        <div className="scmp-search"><Icon name="search" size="md" />
          <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder="Search by subject, message, or customer name..." aria-label="Search complaints" /></div>
        <label>Type
          <select value={type} onChange={(e) => update({ type: e.target.value })}><option value="">All</option>{Object.entries(COMPLAINT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {hasFilter && <button type="button" className="scmp-clear" onClick={() => { setQInput(''); setParams({}); }}>Clear filters</button>}
      </form>

      {loading && <div className="scmp-skeleton" aria-busy="true" aria-label="Loading complaints" />}
      {!loading && error && (
        <div className="scmp-state" role="alert"><Icon name={denied ? 'lock' : 'cloud_off'} size="xl" /><h3>{denied ? 'Access denied' : 'Unable to load requests'}</h3><p>{error}</p>
          {!denied && <button type="button" className="scmp-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Try again</button>}</div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="scmp-state"><Icon name="inbox" size="xl" /><h3>{hasFilter ? 'No matching requests' : 'No complaints yet'}</h3>
          <p>{hasFilter ? 'Try a different search or clear some filters.' : 'Customer complaints and support requests will appear here.'}</p>
          {hasFilter && <button type="button" className="scmp-btn" onClick={() => { setQInput(''); setParams({}); }}>Clear filters</button>}</div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <p className="scmp-count"><b>{data.total}</b> requests</p>
          <div className="scmp-table-wrap">
            <table className="scmp-table">
              <thead><tr><th>Subject</th><th>Customer</th><th>Order</th><th>Status</th><th className="num">Responses</th><th>Submitted</th><th>Handled by</th></tr></thead>
              <tbody>{data.items.map((r) => (
                <tr key={r._id}>
                  <td><Link className="scmp-subject" to={`/staff/complaints/${r._id}`} state={{ from: fromPath }}>{r.subject}</Link><span><ComplaintBadge type={r.type} /></span></td>
                  <td>{r.customer ? r.customer.fullName : <span className="scmp-muted">—</span>}</td>
                  <td>{r.orderCode ? `#${r.orderCode}` : <span className="scmp-muted">—</span>}</td>
                  <td><ComplaintBadge status={r.status} /></td>
                  <td className="num">{r.responseCount}</td>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.handledBy || <span className="scmp-muted">Unassigned</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="scmp-pager">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}><Icon name="chevron_left" size="md" />Previous</button>
              <span>Page {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>Next<Icon name="chevron_right" size="md" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
