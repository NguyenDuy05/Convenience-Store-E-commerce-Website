import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { submitSupportRequest, listMySupportRequests, getSupportRequest } from '../../api/support.api';
const COMPLAINT_STATUS = { open: { label: 'Open' }, in_progress: { label: 'In progress' }, resolved: { label: 'Resolved' } };
const COMPLAINT_TYPE = { support: 'Support', complaint: 'Complaint' };
import '../../styles/support.css';

const emptyForm = { type: 'support', subject: '', message: '' };
const date = (value) => new Date(value).toLocaleString('en-US');
const errorMessage = (err) => {
  if (err.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (err.response?.status === 403) return 'You do not have permission to access this resource.';
  return err.response?.data?.message || 'Unable to connect. Please try again.';
};

export default function SupportPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const id = params.get('id');
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDetail(null);
    const request = id ? getSupportRequest(id) : listMySupportRequests({ status, page, limit: 10 });
    request.then(({ data: result }) => {
      if (active) { if (id) setDetail(result); else setData(result); }
    }).catch((err) => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, status, page, reload]);

  const navigate = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSubmitError(''); setSuccess('');
    if (!form.subject.trim() || !form.message.trim()) {
      setSubmitError('Please enter a subject and message.'); return;
    }
    setSending(true);
    try {
      await submitSupportRequest(form);
      setForm(emptyForm); setSuccess('Your request has been submitted. You can track responses below.');
      setParams({}); setReload((n) => n + 1);
    } catch (err) { setSubmitError(errorMessage(err)); }
    finally { setSending(false); }
  };
  const field = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const pages = Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 10)));
  const badge = (value) => <span className={`support-status support-status-${value}`}>{COMPLAINT_STATUS[value]?.label || value}</span>;

  return <main className="support-page">
    <Link to="/profile">← Account</Link>
    <h1>Support Center</h1>
    <p>Submit a question or complaint and track responses from our store.</p>
    <section className="support-panel" aria-labelledby="support-submit-title">
      <h2 id="support-submit-title">Submit Support Request</h2>
      <form onSubmit={submit}>
        <fieldset disabled={sending}>
          <label>Request type<select name="type" value={form.type} onChange={field}>
            {Object.entries(COMPLAINT_TYPE).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>Subject<input name="subject" value={form.subject} onChange={field} required maxLength={200} placeholder="How can we help you?" /></label>
          <label>Message<textarea name="message" value={form.message} onChange={field} required maxLength={5000} rows={5} placeholder="Describe your issue in detail…" /></label>
          <small>{form.message.length}/5000 characters</small>
          <button type="submit">{sending ? 'Submitting…' : 'Submit request'}</button>
        </fieldset>
      </form>
      {submitError && <p role="alert" className="support-error">{submitError}</p>}
      {success && <p role="status" className="support-success">{success}</p>}
    </section>
    <section className="support-panel" aria-labelledby="support-list-title">
      <div className="support-toolbar"><h2 id="support-list-title">My Support Requests</h2>
        <button type="button" disabled={loading} onClick={() => setReload((n) => n + 1)}>Refresh</button>
      </div>
      {id ? <button type="button" onClick={() => navigate({ id: '' })}>← Back to requests</button> :
        <label>Filter by status<select value={status} onChange={(event) => navigate({ status: event.target.value, page: '' })}>
          <option value="">All</option>
          {Object.entries(COMPLAINT_STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select></label>}
      {loading ? <p role="status">Loading requests…</p> : error ? <p role="alert" className="support-error">{error}</p> : id && detail ?
        <article className="support-detail">
          <div className="support-toolbar"><h3>{detail.subject}</h3>{badge(detail.status)}</div>
          <p>{COMPLAINT_TYPE[detail.type]} · Submitted on {date(detail.createdAt)}</p>
          {detail.order && <p>Order: <Link to={`/orders/${detail.order._id}`}>{detail.order.orderCode}</Link></p>}
          <p className="support-message">{detail.message}</p>
          <h3>Store responses</h3>
          {detail.responses.length === 0 ? <p>No responses yet. Our team will review your request.</p> : detail.responses.map((response) =>
            <div className="support-response" key={response._id}><strong>{response.responder || 'Support team'}</strong><small>{date(response.createdAt)}</small><p className="support-message">{response.message}</p></div>)}
          {detail.resolvedAt && <p>Resolved on {date(detail.resolvedAt)}</p>}
        </article> : <>
          {!data?.items.length ? <p>No matching requests found.</p> : <ul className="support-list">
            {data.items.map((item) => <li key={item._id}>
              <div><button className="support-subject" type="button" onClick={() => navigate({ id: item._id })}>{item.subject}</button>
                <small>{COMPLAINT_TYPE[item.type]} · {date(item.createdAt)}</small></div>{badge(item.status)}
            </li>)}
          </ul>}
          {pages > 1 && <nav className="support-pagination" aria-label="Request pagination">
            <button disabled={page <= 1} onClick={() => navigate({ page: String(page - 1) })}>Previous</button>
            <span>Page {page}/{pages}</span>
            <button disabled={page >= pages} onClick={() => navigate({ page: String(page + 1) })}>Next</button>
          </nav>}
        </>}
    </section>
  </main>;
}
