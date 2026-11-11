import { useState } from 'react';
import { listRefunds } from '../../api/order.api';
import { listWithdrawals, processWithdrawal } from '../../api/wallet.api';
import { Badge, Notice, Pager, Stat, Tabs, dt, money, useAction, useFetch } from '../../components/admin/kit';

const W_STATUS = { pending: ['Pending', 'warn'], paid: ['Transferred', 'ok'], rejected: ['Rejected', 'bad'] };

// Admin xem hoàn tiền đơn hủy và yêu cầu rút tiền từ ví
export default function AdminRefundsPage() {
  const [tab, setTab] = useState('refunds');
  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">FINANCE</span><h1>Refunds &amp; Withdrawals</h1>
      <p>Payments for cancelled orders are refunded to the customer wallet. Store-side cancellations can also include an apology voucher. Customers can withdraw their wallet balance to a bank account — transfer it manually, then confirm here.</p></div></header>
    <Tabs value={tab} onChange={setTab} tabs={[{ key: 'refunds', label: 'Order refunds' }, { key: 'withdrawals', label: 'Wallet withdrawals' }]} />
    {tab === 'refunds' ? <RefundsTab /> : <WithdrawalsTab />}
  </div>;
}

// Tab hoàn tiền đơn: lọc theo mã đơn, bên có lỗi, khoảng ngày; xem voucher xin lỗi đã tặng
function RefundsTab() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [fault, setFault] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(listRefunds, { q: q || undefined, fault: fault || undefined, from: from || undefined, to: to || undefined, page, limit: 10 });
  const items = data?.items || [];
  const dateError = from && to && from > to ? 'The start date must be before the end date.' : '';

  return <section className="pm-card">
    <div className="pm-search-row">
      <form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }} style={{ display: 'contents' }}>
        <label>Order code<input value={search} maxLength={50} onChange={(e) => setSearch(e.target.value)} placeholder="CM-2026..." /></label><button type="submit">Search</button>
      </form>
      <label>Cancelled by<select value={fault} onChange={(e) => { setFault(e.target.value); setPage(1); }}><option value="">All</option><option value="customer">Customer side</option><option value="store">Store side</option></select></label>
      <label>From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
      <label>To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
    </div>
    {dateError && <p className="pm-error" role="alert">{dateError}</p>}
    {loading ? <p role="status">Loading refunds...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
      <div className="pm-stats"><Stat label="Refunds" value={data.total} /><Stat label="Total refunded to wallets" value={money(data.summary.totalAmount)} tone="warn" /></div>
      {!items.length ? <div className="pm-empty"><h2>No refunds</h2><p>No refunds match these filters.</p></div> :
        <div className="pm-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Cancelled by</th><th className="pm-num">Amount</th><th>Reason</th><th>Refunded</th></tr></thead><tbody>
          {items.map((r) => <tr key={r._id}>
            <td><strong>{r.orderCode}</strong><small>{r.source}</small></td>
            <td>{r.customer ? <>{r.customer.fullName}<small>{r.customer.email}</small></> : 'Walk-in'}</td>
            <td>{r.fault === 'store' ? <Badge tone="warn">Store side</Badge> : r.fault === 'customer' ? <Badge tone="muted">Customer side</Badge> : '—'}{r.voucher && <small>Voucher {r.voucher}</small>}</td>
            <td className="pm-num">{money(r.amount)}</td>
            <td>{r.reason}</td><td>{dt(r.refundedAt)}<small>to wallet{r.refundedBy ? ` · by ${r.refundedBy}` : ''}</small></td>
          </tr>)}
        </tbody></table></div>}
      <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
    </>}
  </section>;
}

// Tab rút tiền: admin chuyển khoản thủ công rồi xác nhận, hoặc từ chối (tiền trả lại ví)
function WithdrawalsTab() {
  const [status, setStatus] = useState('pending');
  const [doing, setDoing] = useState(null);
  const [text, setText] = useState('');
  const { data, loading, error, reload } = useFetch(listWithdrawals, { status: status || undefined });
  const act = useAction(reload);
  const items = data?.items || [];
  const submit = async () => {
    if (text.trim().length < 3) { act.setError(doing.action === 'paid' ? 'Enter the transfer reference (at least 3 characters).' : 'Enter the reason (at least 3 characters).'); return; }
    const body = doing.action === 'paid' ? { action: 'paid', reference: text.trim() } : { action: 'rejected', note: text.trim() };
    if (await act.run(() => processWithdrawal(doing.w._id, body), doing.action === 'paid' ? 'Withdrawal marked as transferred.' : 'Withdrawal rejected. The money is back in the customer wallet.')) { setDoing(null); setText(''); }
  };
  const start = (w, action) => { setDoing({ w, action }); setText(''); act.setError(''); act.setSuccess(''); };

  return <section className="pm-card">
    <div className="pm-search-row">
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Pending</option><option value="paid">Transferred</option><option value="rejected">Rejected</option><option value="">All</option></select></label>
    </div>
    <Notice success={act.success} error={doing ? '' : act.error} />
    {loading ? <p role="status">Loading withdrawals...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
      <div className="pm-stats"><Stat label="Pending requests" value={data.pendingCount} tone={data.pendingCount ? 'warn' : ''} /></div>
      {doing && <section className="pm-card pm-confirm" aria-labelledby="wd-title">
        <h2 id="wd-title">{doing.action === 'paid' ? 'Confirm transfer' : 'Reject request'} — {money(doing.w.amount)} to {doing.w.accountName}</h2>
        {doing.action === 'paid'
          ? <p>Transfer {money(doing.w.amount)} to <b>{doing.w.bankName} {doing.w.accountNumber}</b> ({doing.w.accountName}) from the store bank account, then enter the transfer reference.</p>
          : <p>The {money(doing.w.amount)} held for this request goes back to the customer wallet.</p>}
        <label className="pm-field">{doing.action === 'paid' ? 'Transfer reference' : 'Reason shown to the customer'}<input value={text} maxLength={doing.action === 'paid' ? 100 : 300} autoFocus onChange={(e) => setText(e.target.value)} placeholder={doing.action === 'paid' ? 'FT2631...' : 'Account holder name does not match'} /></label>
        {act.error && <p className="pm-error" role="alert">{act.error}</p>}
        <div className="pm-actions"><button className={doing.action === 'paid' ? 'pm-primary' : 'pm-danger'} disabled={act.busy} onClick={submit}>{act.busy ? 'Saving...' : doing.action === 'paid' ? 'Mark as transferred' : 'Reject'}</button><button disabled={act.busy} onClick={() => { setDoing(null); act.setError(''); }}>Cancel</button></div>
      </section>}
      {!items.length ? <div className="pm-empty"><h2>No requests</h2><p>No withdrawal requests with this status.</p></div> :
        <div className="pm-table-wrap"><table><thead><tr><th>Requested</th><th>Customer</th><th>Bank account</th><th className="pm-num">Amount</th><th>Status</th><th></th></tr></thead><tbody>
          {items.map((w) => <tr key={w._id}>
            <td>{dt(w.createdAt)}</td>
            <td>{w.customer ? <>{w.customer.fullName}<small>{w.customer.email}</small></> : '—'}</td>
            <td><strong>{w.bankName}</strong><small>{w.accountNumber} · {w.accountName}</small></td>
            <td className="pm-num">{money(w.amount)}</td>
            <td><Badge tone={W_STATUS[w.status]?.[1]}>{W_STATUS[w.status]?.[0] || w.status}</Badge>{w.reference && <small>Ref {w.reference}</small>}{w.note && <small>{w.note}</small>}{w.processedAt && <small>{dt(w.processedAt)}</small>}</td>
            <td>{w.status === 'pending' && <div className="pm-actions" style={{ margin: 0 }}><button className="pm-primary" onClick={() => start(w, 'paid')}>Transferred</button><button className="pm-danger" onClick={() => start(w, 'rejected')}>Reject</button></div>}</td>
          </tr>)}
        </tbody></table></div>}
    </>}
  </section>;
}
