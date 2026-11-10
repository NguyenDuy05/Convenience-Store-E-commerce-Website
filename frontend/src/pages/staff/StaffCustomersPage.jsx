import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-customers.css';
import { listCustomers } from '../../api/customer.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import { formatDate } from '../../utils/format';
import { CUSTOMER_STATUS } from '../../utils/complaintMeta';
import MemberCodeLookup from '../../components/membership/MemberCodeLookup';

const LIMIT = 20;

// UC-19.1 View Customers (Staff): chỉ xem, thông tin liên hệ được che bớt
export default function StaffCustomersPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const q = (params.get('q') || '').slice(0, 100);
  const status = ['active', 'locked'].includes(params.get('status')) ? params.get('status') : '';
  const hasComplaint = params.get('hasComplaint') === '1';
  const sort = params.get('sort') === 'name' ? 'name' : 'newest';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

  const [qInput, setQInput] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const update = useCallback((patch) => {
    const next = { q, status, hasComplaint: hasComplaint ? '1' : '', sort, page: 1, ...patch };
    const out = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === false || (k === 'sort' && v === 'newest') || (k === 'page' && v <= 1)) return;
      out[k] = String(v);
    });
    setParams(out);
  }, [q, status, hasComplaint, sort, setParams]);

  useEffect(() => { setQInput(q); }, [q]);
  // Chờ 400ms sau lần gõ cuối mới tìm; từ khóa cần tối thiểu 2 ký tự (hoặc để trống để xem tất cả)
  useEffect(() => {
    const t = qInput.trim();
    if (t === q || t.length === 1) return undefined;
    const timer = setTimeout(() => update({ q: t }), 400);
    return () => clearTimeout(timer);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ignore = false;
    setLoading(true); setError('');
    listCustomers({ q: q || undefined, status: status || undefined, hasComplaint: hasComplaint ? '1' : undefined, sort, page, limit: LIMIT })
      .then((res) => { if (!ignore) setData(res.data); })
      .catch(async (err) => {
        if (ignore) return;
        if (err.response?.status === 401) { await logout(); navigate('/login', { state: { from: location }, replace: true }); return; }
        setError(err.response?.status === 403 ? "You do not have permission to view the customer list." : (err.response?.data?.message || "Could not load customers. Please try again."));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [q, status, hasComplaint, sort, page, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilter = !!(q || status || hasComplaint);
  const totalPages = Math.max(Math.ceil((data?.total || 0) / (data?.limit || LIMIT)), 1);
  const fromPath = `${location.pathname}${location.search}`;
  const shortQuery = qInput.trim().length === 1;

  return (
    <div className="scus">
      <MemberCodeLookup />
      <div className="scus-head">
        <h1>Customer</h1>
        <p><Icon name="shield_person" size="md" />Contact details are partially masked for customer privacy. This information is read-only.</p>
      </div>

      <form className="scus-filters" onSubmit={(e) => { e.preventDefault(); if (qInput.trim().length !== 1) update({ q: qInput.trim() }); }} role="search">
        <div className="scus-search">
          <Icon name="search" size="md" />
          <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} maxLength={100} placeholder="Search by name, email or phone…" aria-label="Search customers" />
        </div>
        <label>Status
          <select value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All</option><option value="active">Active</option><option value="locked">Locked</option>
          </select></label>
        <label>Sort
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}><option value="newest">Newest members</option><option value="name">Name A to Z</option></select></label>
        <label className="scus-check"><input type="checkbox" checked={hasComplaint} onChange={(e) => update({ hasComplaint: e.target.checked ? '1' : '' })} />Has open complaints</label>
        {hasFilter && <button type="button" className="scus-clear" onClick={() => { setQInput(''); setParams({}); }}>Clear filters</button>}
      </form>
      {shortQuery && <p className="scus-hint"><Icon name="info" size="md" />Enter at least 2 characters to search.</p>}

      {loading && <div className="scus-skeleton" aria-busy="true" aria-label="Loading customer" />}

      {!loading && error && (
        <div className="scus-state" role="alert"><Icon name={error.includes("permission") ? 'lock' : 'cloud_off'} size="xl" /><h3>{error.includes("permission") ? "Access denied" : "Could not load the list"}</h3><p>{error}</p>
          {!error.includes("permission") && <button type="button" className="scus-btn" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size="md" />Try again</button>}</div>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="scus-state"><Icon name="person_search" size="xl" />
          <h3>{hasFilter ? "No matching customers" : "No customers yet"}</h3>
          <p>{hasFilter ? "Try another keyword or remove some filters." : "Customers appear here after signing up."}</p>
          {hasFilter && <button type="button" className="scus-btn" onClick={() => { setQInput(''); setParams({}); }}>Clear filters</button>}</div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <p className="scus-count">There are <b>{data.total}</b> customers</p>
          <div className="scus-table-wrap">
            <table className="scus-table">
              <thead><tr><th>Customer</th><th>Tier</th><th className="num">Orders</th><th>Open complaints</th><th>Tham gia</th><th>Status</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id}>
                    <td><Link className="scus-name" to={`/staff/customers/${c._id}`} state={{ from: fromPath }}>{c.fullName}</Link>
                      <small>{c.email}{c.phone ? ` • ${c.phone}` : ''}</small></td>
                    <td>{c.tier || <span className="scus-muted">—</span>}</td>
                    <td className="num">{c.orderCount}</td>
                    <td>{c.openComplaints > 0 ? <span className="scus-open"><Icon name="report" size="sm" fill />{c.openComplaints}</span> : <span className="scus-muted">0</span>}</td>
                    <td>{formatDate(c.joinedAt)}</td>
                    <td><span className={`scus-status ${c.status}`}>{CUSTOMER_STATUS[c.status] || c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="scus-pager">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}><Icon name="chevron_left" size="md" />Previous</button>
              <span>Trang {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => update({ page: page + 1 })}>Sau<Icon name="chevron_right" size="md" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
