import { useState } from 'react';
import { handlePaymentError, listFailedPayments, listPayments, listPendingPayments } from '../../api/payment.api';
import { Badge, Notice, Pager, STATUS_TONE, Stat, Tabs, dt, money, useAction, useFetch } from '../../components/admin/kit';

const TABS = [{ key: 'all', label: 'All payments', fn: listPayments }, { key: 'failed', label: 'Failed', fn: listFailedPayments }, { key: 'pending', label: 'Pending', fn: listPendingPayments }];
const METHOD = { cash: 'Cash', card: 'Card', vnpay: 'VNPay', wallet: 'Wallet' };
const ACTIONS = {
  confirm_paid: 'Confirm payment received',
  mark_failed: 'Mark as failed',
  dismiss: 'Dismiss (reviewed, no action)',
};

function ResolvePanel({ txn, busy, error, onSave, onCancel }) {
  const allowed = txn.status === 'pending' ? ['confirm_paid', 'mark_failed'] : txn.status === 'failed' ? ['confirm_paid', 'dismiss'] : ['dismiss'];
  const [action, setAction] = useState(allowed[0]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => { e.preventDefault(); if (note.trim().length < 3) return setErr('Please add a note of at least 3 characters.'); setErr(''); onSave({ action, note: note.trim() }); };
  return <section className="pm-card" aria-labelledby="pay-resolve">
    <h2 id="pay-resolve">Handle payment error</h2>
    <p><strong>{txn.order?.orderCode || 'Order'}</strong> · {METHOD[txn.method]} · {money(txn.amount)} · <Badge tone={STATUS_TONE[txn.status]}>{txn.status}</Badge></p>
    {txn.failureReason && <p className="pm-note">{txn.failureReason}</p>}
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Resolution<select value={action} onChange={(e) => setAction(e.target.value)}>{allowed.map((a) => <option key={a} value={a}>{ACTIONS[a]}</option>)}</select></label>
        <label className="pm-wide">Note<textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you verify and decide?" /></label>
      </div>
      {action === 'confirm_paid' && <p className="pm-note">Only confirm after checking the payment gateway or bank statement. A pending order will be confirmed.</p>}
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save resolution'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState('all');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState(null);
  const fn = TABS.find((t) => t.key === tab).fn;
  const { data, loading, error, reload } = useFetch(fn, { tab, method: method || undefined, status: tab === 'all' ? status || undefined : undefined, q: q || undefined, page, limit: 10 });
  const act = useAction(reload);
  const items = data?.items || [];
  const save = async (body) => { if (await act.run(() => handlePaymentError(resolving._id, body), 'Payment resolution saved.')) setResolving(null); };

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">FINANCE</span><h1>Manage Payments</h1><p>Monitor payment transactions and resolve failed or stuck payments.</p></div></header>
    <Notice success={act.success} error={!resolving ? act.error : ''} />
    {resolving && <ResolvePanel txn={resolving} busy={act.busy} error={act.error} onCancel={() => setResolving(null)} onSave={save} />}
    <section className="pm-card">
      <Tabs tabs={TABS} value={tab} onChange={(k) => { setTab(k); setPage(1); setStatus(''); }} />
      <div className="pm-search-row">
        <form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }} style={{ display: 'contents' }}>
          <label>Search<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Order code or transaction reference" /></label>
          <button type="submit">Search</button>
        </form>
        <label>Method<select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}><option value="">All methods</option>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {tab === 'all' && <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></label>}
      </div>
      {loading ? <p role="status">Loading payments...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
        <div className="pm-stats"><Stat label="Transactions" value={data.total} /><Stat label="Collected" value={money(data.summary?.collectedAmount)} /><Stat label="Refunded to wallets" value={money(data.summary?.refundedAmount)} /><Stat label="Net received" value={money(data.summary?.netAmount)} /></div>
        {!items.length ? <div className="pm-empty"><h2>No payments found</h2><p>Nothing matches these filters.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Order</th><th>Method</th><th className="pm-num">Amount</th><th>Reference</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {items.map((t) => <tr key={t._id}>
              <td><strong>{t.order?.orderCode || '—'}</strong><small>{t.customer?.fullName || (t.processedBy ? `Counter · ${t.processedBy}` : 'Walk-in')}</small></td>
              <td>{METHOD[t.method]}</td><td className="pm-num">{money(t.amount)}</td>
              <td>{t.txnRef || t.gateway?.transactionNo || '—'}</td><td>{dt(t.createdAt)}</td>
              <td><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>{t.failureReason && <small>{t.failureReason}</small>}{t.errorHandling?.handledAt && <small>Handled: {t.errorHandling.resolution}</small>}</td>
              <td>{t.needsReview ? <button onClick={() => { act.setError(''); act.setSuccess(''); setResolving(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Handle error</button> : '—'}</td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} busy={act.busy} />
      </>}
    </section>
  </div>;
}
