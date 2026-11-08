import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/staff-complaint-detail.css';
import { getSupportRequest, handleComplaint } from '../../api/support.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import ComplaintBadge from '../../components/staff/ComplaintBadge';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { newIdempotencyKey } from '../../utils/idempotency';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { COMPLAINT_STATUS, STATUS_ACTION } from '../../utils/complaintMeta';

// UC-19.3 Handle Customer Complaint (Staff): view complaints, respond to customers, and follow allowed status transitions
export default function StaffComplaintDetailPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('');            // '' = keep the current status and send a response only
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(null);              // { replayed }
  const lock = useRef(false);
  const keyRef = useRef(newIdempotencyKey());          // reuse after network errors; replace after a successful save or a definitive failure

  const onAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout(); navigate('/login', { state: { from: location }, replace: true }); return true;
  }, [logout, navigate, location]);

  const load = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try { const res = await getSupportRequest(id); setR(res.data); setError(null); }
    catch (err) {
      if (await onAuth(err)) return;
      const code = err.response?.status;
      setError({ notFound: code === 404, denied: code === 403, message: code === 404 ? 'This request was not found.' : code === 403 ? 'You do not have permission to handle complaints.' : (err.response?.data?.message || 'Unable to load the request. Please try again.') });
    } finally { setLoading(false); }
  }, [id, onAuth]);

  useEffect(() => { setR(null); load(true); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const backTo = location.state?.from || '/staff/complaints';
  const crumb = (
    <nav className="cmpd-crumb" aria-label="Breadcrumb">
      <Link to="/staff">Staff</Link><Icon name="chevron_right" size="sm" />
      <Link to={backTo}>Complaints</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">{r ? r.subject : 'Details'}</span>
    </nav>
  );

  if (loading && !r) return <div className="cmpd">{crumb}<div className="cmpd-skeleton" aria-busy="true" aria-label="Loading request" /></div>;
  if (error && !r) {
    return (
      <div className="cmpd">{crumb}
        <div className="cmpd-state" role="alert"><Icon name={error.denied ? 'lock' : error.notFound ? 'search_off' : 'cloud_off'} size="xl" /><h2>{error.denied ? 'Access denied' : error.notFound ? 'Request not found' : 'Unable to load request'}</h2><p>{error.message}</p>
          <div className="cmpd-actions">{!error.notFound && !error.denied && <button type="button" className="cmpd-btn" onClick={() => load(true)}><Icon name="refresh" size="md" />Try again</button>}
            <Link className="cmpd-btn ghost" to="/staff/complaints"><Icon name="arrow_back" size="md" />Back to requests</Link></div></div>
      </div>
    );
  }

  const closed = r.allowedStatuses.length === 0 && r.status === 'resolved';
  const needMsg = target === 'resolved';
  const canSubmit = !saving && (message.trim().length > 0 || (target && target !== r.status)) && !(needMsg && message.trim().length === 0);

  const submit = async (e) => {
    e.preventDefault();
    if (lock.current || !canSubmit) return;
    lock.current = true; setSaving(true); setFormError(''); setDone(null);
    try {
      const res = await handleComplaint(id, { message: message.trim() || undefined, status: target || undefined }, keyRef.current);
      setR(res.data); setDone({ replayed: res.data.replayed });
      setMessage(''); setTarget(''); keyRef.current = newIdempotencyKey();
    } catch (err) {
      if (await onAuth(err)) return;
      const st = err.response?.status; const data = err.response?.data || {};
      if (!err.response || st >= 500) {
        // Save status is unknown: retain the key so a retry cannot duplicate the response
        setFormError('The server response was not received, so the save status is unknown. You can retry without creating a duplicate response.');
      } else {
        keyRef.current = newIdempotencyKey();
        setFormError(data.message || 'Unable to save. Please try again.');
        if (['INVALID_TRANSITION', 'STALE_STATUS', 'CLOSED'].includes(data.code)) { setTarget(''); await load(); }   // refresh the allowed transitions
      }
    } finally { lock.current = false; setSaving(false); }
  };

  return (
    <div className="cmpd">
      {crumb}
      <header className="cmpd-head">
        <div>
          <div className="cmpd-title"><h1>{r.subject}</h1><ComplaintBadge type={r.type} /><ComplaintBadge status={r.status} /></div>
          <p>Submitted {formatDateTime(r.createdAt)}{r.handledBy ? ` • Handled by: ${r.handledBy}` : ''}{r.resolvedAt ? ` • Closed ${formatDateTime(r.resolvedAt)}` : ''}</p>
        </div>
        <Link className="cmpd-btn ghost" to={backTo}><Icon name="arrow_back" size="md" />Back</Link>
      </header>

      <div className="cmpd-grid">
        <div className="cmpd-col">
          <section className="cmpd-card">
            <h2><Icon name="forum" />Conversation</h2>
            <ol className="cmpd-thread">
              <li className="cust"><div className="cmpd-who"><b>{r.customer ? r.customer.fullName : 'Customer'}</b><span>{formatDateTime(r.createdAt)}</span></div><p>{r.message}</p></li>
              {r.responses.map((x) => (
                <li className="staff" key={x._id}><div className="cmpd-who"><b>{x.responder || 'Staff'}</b><span>{formatDateTime(x.createdAt)}</span></div><p>{x.message}</p></li>
              ))}
            </ol>
            {r.responses.length === 0 && <p className="cmpd-muted">No responses to this request yet.</p>}
          </section>

          <section className="cmpd-card">
            <h2><Icon name="reply" />Handle request</h2>
            {done && <div className="cmpd-ok" role="status"><Icon name="check_circle" size="lg" fill /><div><b>{done.replayed ? 'This response was already saved. No duplicate was created.' : 'Request updated.'}</b><span>Your update has been saved. The customer can view it in their support request.</span></div></div>}
            {closed ? (
              <p className="cmpd-muted"><Icon name="lock" size="md" />This request is resolved and closed. No further updates are allowed.</p>
            ) : (
              <form className="cmpd-form" onSubmit={submit}>
                <label htmlFor="cmpd-msg">Response to customer</label>
                <textarea id="cmpd-msg" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter your response to the customer..." />
                <small>{message.length}/2000</small>
                <fieldset>
                  <legend>Status after saving</legend>
                  <label className="cmpd-radio"><input type="radio" name="st" checked={target === ''} onChange={() => setTarget('')} />Keep current status ({COMPLAINT_STATUS[r.status].label}), send response only</label>
                  {r.allowedStatuses.map((s) => (
                    <label className="cmpd-radio" key={s}><input type="radio" name="st" checked={target === s} onChange={() => setTarget(s)} /><span><b>{STATUS_ACTION[s].label}</b><small>{STATUS_ACTION[s].hint}</small></span></label>
                  ))}
                </fieldset>
                {needMsg && message.trim().length === 0 && <p className="cmpd-warn"><Icon name="info" size="md" />A response is required to mark the request as resolved.</p>}
                {formError && <p className="cmpd-error" role="alert"><Icon name="error" size="md" />{formError}</p>}
                <button type="submit" className="cmpd-btn" disabled={!canSubmit}>{saving ? 'Saving...' : 'Save update'}</button>
              </form>
            )}
          </section>
        </div>

        <div className="cmpd-col">
          <section className="cmpd-card">
            <h2><Icon name="person" />Customer</h2>
            {r.customer ? (<div className="cmpd-kv"><b>{r.customer.fullName}</b><span>{r.customer.email}</span>
              <Link to={`/staff/customers/${r.customer._id}`} state={{ from: `/staff/complaints/${r._id}` }}>View customer profile</Link></div>) : <p className="cmpd-muted">Customer information is unavailable.</p>}
          </section>
          <section className="cmpd-card">
            <h2><Icon name="receipt_long" />Related order</h2>
            {r.order ? (<div className="cmpd-kv"><b>#{r.order.orderCode}</b><span><OrderStatusBadge status={r.order.status} /></span><span>{formatCurrency(r.order.totalAmount)} • {formatDateTime(r.order.createdAt)}</span></div>)
              : <p className="cmpd-muted">{r.type === 'complaint' ? 'This complaint is not linked to an order. For product issues, ask the customer for their order code.' : 'This request is not linked to an order.'}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
