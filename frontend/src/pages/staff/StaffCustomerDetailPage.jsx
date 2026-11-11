import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-customer-detail.css';
import { getCustomer } from '../../api/customer.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import ComplaintBadge from '../../components/staff/ComplaintBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { CUSTOMER_STATUS } from '../../utils/complaintMeta';
import { PAYMENT_METHOD } from '../../utils/orderMeta';

// UC-19.2 Staff xem chi tiết khách
export default function StaffCustomerDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getCustomer(id)
      .then((res) => setC(res.data))
      .catch(async (err) => {
        if (err.response?.status === 401) { await logout(); navigate('/login', { state: { from: location }, replace: true }); return; }
        const code = err.response?.status;
        setError({ notFound: code === 404, denied: code === 403, message: code === 404 ? "This customer was not found." : code === 403 ? "You do not have permission to view customer information." : (err.response?.data?.message || "Could not load customer information. Please try again.") });
      })
      .finally(() => setLoading(false));
  }, [id, logout, navigate, location]);

  useEffect(() => { setC(null); load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/staff/customers';
  const crumb = (
    <nav className="scdt-crumb" aria-label="Breadcrumb">
      <Link to="/staff">Staff</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Customer</Link><Icon name="chevron_right" size="sm" />
      <span aria-current="page">{c ? c.fullName : "Details"}</span>
    </nav>
  );

  if (loading) return <div className="scdt">{crumb}<div className="scdt-skeleton" aria-busy="true" aria-label="Loading customer" /></div>;
  if (error) {
    return (
      <div className="scdt">{crumb}
        <div className="scdt-state" role="alert"><Icon name={error.denied ? 'lock' : error.notFound ? 'person_off' : 'cloud_off'} size="xl" />
          <h2>{error.denied ? "Access denied" : error.notFound ? "Customer not found" : "Could not load information"}</h2><p>{error.message}</p>
          <div className="scdt-actions">{!error.notFound && !error.denied && <button type="button" className="scdt-btn" onClick={load}><Icon name="refresh" size="md" />Try again</button>}
            <Link className="scdt-btn ghost" to="/staff/customers"><Icon name="arrow_back" size="md" />Back to list</Link></div></div>
      </div>
    );
  }

  return (
    <div className="scdt">
      {crumb}
      <header className="scdt-head">
        <div>
          <div className="scdt-title"><h1>{c.fullName}</h1><span className={`scdt-status ${c.status}`}>{CUSTOMER_STATUS[c.status] || c.status}</span></div>
          <p><Icon name="shield_person" size="md" />Contact details are partially masked. This page is read-only.</p>
        </div>
        <Link className="scdt-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Back to list</Link>
      </header>

      <div className="scdt-stats">
        <div><span>Orders</span><b>{c.stats.orderCount}</b></div>
        <div><span>Collected</span><b>{c.stats.completedCount}</b></div>
        <div><span>Total spent</span><b>{formatCurrency(c.stats.totalSpent)}</b></div>
        <div><span>Latest order</span><b>{c.stats.lastOrderAt ? formatDate(c.stats.lastOrderAt) : '—'}</b></div>
      </div>

      <div className="scdt-grid">
        <section className="scdt-card">
          <h2><Icon name="badge" />Customer information</h2>
          <dl className="scdt-dl">
            <dt>Email</dt><dd>{c.email || '—'}</dd>
            <dt>Phone number</dt><dd>{c.phone || '—'}</dd>
            <dt>Tham gia</dt><dd>{formatDate(c.joinedAt)}</dd>
            <dt>Membership tier</dt><dd>{c.membership.tier || '—'}</dd>
            <dt>Available points</dt><dd>{c.membership.points}</dd>
          </dl>
        </section>

        <section className="scdt-card">
          <h2><Icon name="report" />Complaints / support {c.complaints.openCount > 0 && <span className="scdt-count">{c.complaints.openCount} open</span>}</h2>
          {c.complaints.recent.length === 0 && <p className="scdt-muted">This customer has no complaints or support requests.</p>}
          <ul className="scdt-list">
            {c.complaints.recent.map((r) => (
              <li key={r._id}>
                <Link to={`/staff/complaints/${r._id}`} state={{ from: `/staff/customers/${c._id}` }}>{r.subject}</Link>
                <span><ComplaintBadge type={r.type} /> <ComplaintBadge status={r.status} /></span>
                <small>{formatDateTime(r.createdAt)}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="scdt-card wide">
          <h2><Icon name="receipt_long" />Recent orders</h2>
          {c.recentOrders.length === 0 && <p className="scdt-muted">This customer has no orders yet.</p>}
          {c.recentOrders.length > 0 && (
            <div className="scdt-table-wrap">
              <table className="scdt-table">
                <thead><tr><th>Order code</th><th>Status</th><th>Payment</th><th className="num">Total</th><th>Order date</th></tr></thead>
                <tbody>{c.recentOrders.map((o) => (
                  <tr key={o._id}><td><b>#{o.orderCode}</b></td><td><OrderStatusBadge status={o.status} /></td><td>{PAYMENT_METHOD[o.paymentMethod] || '—'}</td><td className="num">{formatCurrency(o.totalAmount)}</td><td>{formatDateTime(o.createdAt)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
