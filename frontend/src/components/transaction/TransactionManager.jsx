import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTransactions, getTransaction } from '../../api/transaction.api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import Receipt from '../staff/Receipt';
import '../../styles/admin-transactions.css';

const LIMIT = 10;
const STATUS_LABEL = { pending: "Pending", success: "Successful", failed: "Failed", refunded: "Refunded" };
const METHOD_LABEL = { cash: "Cash", card: "Card", vnpay: 'VNPay', wallet: 'Wallet' };
// Định dạng ngày giờ
const dt = (d) => (d ? new Date(d).toLocaleString('en-GB') : '—');
const EMPTY = { q: '', status: '', method: '', from: '', to: '' };

// Nhãn trạng thái giao dịch
const Badge = ({ status }) => <span className={`atx-chip ${status}`}>{STATUS_LABEL[status] || status}</span>;
// Một dòng thông tin trong chi tiết giao dịch
const Row = ({ k, v }) => <div className="atx-row"><span>{k}</span><span>{v}</span></div>;

// Trang giao dịch dùng chung staff / admin: tìm, lọc, xem chi tiết, in hóa đơn
export default function TransactionManager({ homePath, homeLabel, subtitle }) {
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [receiptFor, setReceiptFor] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: LIMIT };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    listTransactions(params)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load transactions. Please try again."))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const onSearch = (e) => { e.preventDefault(); setPage(1); setFilters(form); };
  const onReset = () => { setForm(EMPTY); setFilters(EMPTY); setPage(1); };

  const openDetail = (id) => {
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    getTransaction(id)
      .then((res) => setDetail(res.data))
      .catch((err) => setDetailError(err.response?.data?.message || "Could not load transaction details"))
      .finally(() => setDetailLoading(false));
  };

  const totalPages = Math.max(Math.ceil(data.total / LIMIT), 1);

  return (
    <section className="atx">
      <nav className="atx-crumb" aria-label="Breadcrumb">
        <Link to={homePath}>{homeLabel}</Link><span>›</span><span aria-current="page">Transactions</span>
      </nav>
      <div className="atx-head">
        <div>
          <h1>Transactions</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <form className="atx-filters" onSubmit={onSearch}>
        <label className="atx-q">Transaction / order reference
          <input value={form.q} onChange={set('q')} placeholder="VD: CM-20261021-0001" maxLength={100} />
        </label>
        <label>Status
          <select value={form.status} onChange={set('status')}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Method
          <select value={form.method} onChange={set('method')}>
            <option value="">All</option>
            {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>From date<input type="date" value={form.from} onChange={set('from')} /></label>
        <label>To date<input type="date" value={form.to} onChange={set('to')} /></label>
        <button type="submit" className="atx-btn">Search</button>
        <button type="button" className="atx-btn ghost" onClick={onReset}>Clear filters</button>
      </form>

      {loading ? <div className="atx-skeleton" /> : error ? (
        <div className="atx-card atx-state">
          <h3>Could not load data</h3>
          <p>{error}</p>
          <button type="button" className="atx-btn" onClick={load}>Try again</button>
        </div>
      ) : (
        <>
          {data.summary && (
            <div className="atx-banner">
              <div><strong>{data.total}</strong><span>Total transactions</span></div>
              <div><strong>{data.summary.successCount}</strong><span>Successful transactions</span></div>
              {data.summary.successAmount !== undefined && <div><strong>{formatCurrency(data.summary.successAmount)}</strong><span>Successful payment total</span></div>}
              {data.summary.today && <div><strong>{formatCurrency(data.summary.today.amount)}</strong><span>Collected today ({data.summary.today.count} payment{data.summary.today.count === 1 ? '' : 's'}) · resets at 00:00</span></div>}
            </div>
          )}
          <div className="atx-card atx-table-wrap">
            {data.items.length === 0 ? (
              <div className="atx-state"><h3>No matching transactions</h3><p>Try changing your search criteria.</p></div>
            ) : (
              <table className="atx-table">
                <thead>
                  <tr><th>Time</th><th>Order code</th><th>Reference</th><th>Customer</th><th>Method</th><th className="atx-num">Amount</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t._id}>
                      <td>{dt(t.createdAt)}</td>
                      <td className="atx-mono">{t.order?.orderCode || '—'}</td>
                      <td>{t.txnRef || '—'}</td>
                      <td>{t.customer?.fullName || "Walk-in customer"}</td>
                      <td>{METHOD_LABEL[t.method] || t.method}</td>
                      <td className="atx-num">{formatCurrency(t.amount)}</td>
                      <td><Badge status={t.status} /></td>
                      <td><button type="button" className="atx-btn ghost sm" onClick={() => openDetail(t._id)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="atx-pager">
            <button type="button" className="atx-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Trang {page} / {totalPages}</span>
            <button type="button" className="atx-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        </>
      )}

      {detailLoading && <div className="atx-skeleton atx-detail" />}
      {detailError && <div className="atx-banner error atx-detail"><div><strong>Could not load details</strong><span>{detailError}</span></div></div>}
      {detail && (
        <div className="atx-detail">
          <div className="atx-detail-head">
            <h2>Transaction details <Badge status={detail.status} /></h2>
            <div>
              {detail.status === 'success' && detail.orderId && <button type="button" className="atx-btn" onClick={() => setReceiptFor(String(detail.orderId))}>Print receipt</button>}{' '}
              <button type="button" className="atx-btn ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
          {detail.status === 'refunded' && detail.refund && (
            <p className="atx-refund-note">Refunded {formatCurrency(detail.refund.amount)} to the customer's wallet on {formatDateTime(detail.refund.refundedAt)}{detail.refund.reason ? ` · Reason: ${detail.refund.reason}` : ''}.</p>
          )}
          {detail.status === 'failed' && detail.failureReason && (
            <div className="atx-banner error"><div><strong>Payment failed</strong><span>{detail.failureReason}</span></div></div>
          )}
          <div className="atx-grid">
            <div className="atx-card">
              <h2>Transaction information</h2>
              <div className="atx-rows">
                <Row k="Reference" v={detail.txnRef || '—'} />
                <Row k="Method" v={METHOD_LABEL[detail.method] || detail.method} />
                <Row k="Customer" v={detail.customer ? `${detail.customer.fullName} (${detail.customer.email})` : "Walk-in customer"} />
                <Row k="Processed by" v={detail.processedBy?.fullName || '—'} />
                <Row k="Created at" v={dt(detail.createdAt)} />
                <Row k="Paid at" v={dt(detail.paidAt)} />
                {detail.gateway?.provider && <>
                  <div className="atx-sep" />
                  <Row k="Payment gateway" v={detail.gateway.provider} />
                  <Row k="Gateway transaction reference" v={detail.gateway.transactionNo || '—'} />
                  <Row k="Response code" v={detail.gateway.responseCode || '—'} />
                  <Row k="Bank" v={detail.gateway.bankCode || '—'} />
                </>}
                {detail.cash && detail.cash.received != null && <>
                  <div className="atx-sep" />
                  <Row k="Cash received" v={formatCurrency(detail.cash.received)} />
                  <Row k="Change" v={formatCurrency(detail.cash.change)} />
                </>}
              </div>
              <h2 style={{ marginTop: 20 }}>Transaction history</h2>
              <ul className="atx-timeline">
                {detail.timeline.map((s, i) => (
                  <li key={i}><b>{s.label}</b><small>{dt(s.at)}{s.note ? ` · ${s.note}` : ''}</small></li>
                ))}
              </ul>
            </div>

            <div className="atx-side">
              <div className="atx-card">
                <h2>Related order</h2>
                <div className="atx-rows">
                  <Row k="Order code" v={detail.order?.orderCode || '—'} />
                  <Row k="Order status" v={detail.order?.status || '—'} />
                  <Row k="Order payment" v={detail.order?.paymentStatus || '—'} />
                  <div className="atx-sep" />
                  <div className="atx-row strong"><span>Transaction amount</span><span>{formatCurrency(detail.amount)}</span></div>
                  {detail.order && <Row k="Order total" v={formatCurrency(detail.order.totalAmount)} />}
                </div>
              </div>
              {detail.relatedTransactions?.length > 0 && (
                <div className="atx-card">
                  <h2>Other transactions for this order</h2>
                  <ul className="atx-related">
                    {detail.relatedTransactions.map((r) => (
                      <li key={r._id}>
                        <button type="button" className="atx-btn ghost sm" onClick={() => openDetail(r._id)}>{r.txnRef || 'Xem'}</button>
                        {METHOD_LABEL[r.method] || r.method} · {formatCurrency(r.amount)} <Badge status={r.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {receiptFor && <Receipt orderId={receiptFor} onClose={() => setReceiptFor('')} />}
    </section>
  );
}
