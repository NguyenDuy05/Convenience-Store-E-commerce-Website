import { useState } from 'react';
import { listRefunds } from '../../api/order.api';
import { Pager, Stat, dt, money, useFetch } from '../../components/admin/kit';

const METHOD = { cash: 'Cash', card: 'Card', vnpay: 'VNPay', momo: 'MoMo' };

export default function AdminRefundsPage() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(listRefunds, { q: q || undefined, from: from || undefined, to: to || undefined, page, limit: 10 });
  const items = data?.items || [];
  const dateError = from && to && from > to ? 'The start date must be before the end date.' : '';

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">FINANCE</span><h1>Refund History</h1><p>Refunds are created when a paid order is cancelled. Cancel an order from its details page.</p></div></header>
    <section className="pm-card">
      <div className="pm-search-row">
        <form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }} style={{ display: 'contents' }}>
          <label>Order code<input value={search} maxLength={50} onChange={(e) => setSearch(e.target.value)} placeholder="CM-2026..." /></label><button type="submit">Search</button>
        </form>
        <label>From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label>To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>
      {dateError && <p className="pm-error" role="alert">{dateError}</p>}
      {loading ? <p role="status">Loading refunds...</p> : error ? <p className="pm-error" role="alert">{error}</p> : <>
        <div className="pm-stats"><Stat label="Refunds" value={data.total} /><Stat label="Total refunded" value={money(data.summary.totalAmount)} tone="warn" /></div>
        {!items.length ? <div className="pm-empty"><h2>No refunds</h2><p>No refunds match these filters.</p></div> :
          <div className="pm-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Method</th><th className="pm-num">Amount</th><th>Reason</th><th>Refunded</th></tr></thead><tbody>
            {items.map((r) => <tr key={r._id}>
              <td><strong>{r.orderCode}</strong><small>{r.source}</small></td>
              <td>{r.customer ? <>{r.customer.fullName}<small>{r.customer.email}</small></> : 'Walk-in'}</td>
              <td>{METHOD[r.method] || '—'}</td><td className="pm-num">{money(r.amount)}</td>
              <td>{r.reason}</td><td>{dt(r.refundedAt)}<small>by {r.refundedBy || '—'}</small></td>
            </tr>)}
          </tbody></table></div>}
        <Pager page={page} total={data.total} limit={data.limit} onPage={setPage} />
      </>}
    </section>
  </div>;
}
