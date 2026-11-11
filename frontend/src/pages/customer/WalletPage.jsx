import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWallet, listMyWithdrawals, requestWithdrawal } from '../../api/wallet.api';
import AccountSidebar from '../../components/order/AccountSidebar';
import Icon from '../../components/common/Icon';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/wallet.css';

// Ví của khách: số dư và lịch sử cộng / trừ
export default function WalletPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    getWallet({ page }).then(r => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) setError('Could not load your wallet. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, retry]);
  return <div className="wallet-page"><AccountSidebar /><main>
    <header><h1>My wallet</h1><p>Refunds saved for your next store pickup.</p></header>
    {error && <p role="alert">{error} <button className="co-btn" onClick={() => setRetry(retry + 1)}>Retry</button></p>}
    {loading ? <p role="status">Loading wallet…</p> : data && !error && <>
      <div className="wallet-cards"><section className="wallet-balance"><Icon name="account_balance_wallet" /><span>Available balance</span><strong>{formatCurrency(data.balance)}</strong><Link to="/products">Shop products <Icon name="arrow_forward" /></Link></section>
        <section><Icon name="stars" /><span>Reward points</span><strong>{data.points.toLocaleString('en-US')}</strong><Link to="/membership">View membership</Link></section></div>
      <section className="wallet-policy"><h2>How it works</h2><p>Your wallet balance is applied first at checkout. Pay any remaining amount through VNPay. A fully covered order is confirmed immediately.</p><p>When an order is cancelled, any payment received is returned to your wallet. If the store cancels because of a problem on its side (for example an item is out of stock), you also get an apology voucher for your next order.</p><p>You can withdraw your wallet balance to a bank account (from {formatCurrency(10000)}). The store transfers it manually, usually within 1–3 working days.</p><p>Earn 1 point for every {formatCurrency(data.pointsPerVnd)} after collecting a completed order. Cancelled orders earn no points.</p></section>
      <WithdrawPanel balance={data.balance} onDone={() => { setPage(1); setRetry((n) => n + 1); }} />
      <section className="wallet-history"><h2>Wallet activity</h2>{!data.items.length ? <p>No activity yet. Refunds and wallet payments will appear here.</p> : <ul>{data.items.map(entry => <li key={entry.key}>
        <Icon name={entry.amount > 0 ? 'south_west' : 'north_east'} /><div><b>{entry.description}</b><small>{formatDateTime(entry.createdAt)}</small>{entry.orderId && <Link to={`/orders/${entry.orderId}`}>#{entry.orderCode}</Link>}</div>
        <div className={`wallet-amount ${entry.amount > 0 ? 'credit' : ''}`}><b>{entry.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(entry.amount))}</b><small>Balance {formatCurrency(entry.balanceAfter)}</small></div>
      </li>)}</ul>}
        {data.total > data.limit && <div className="wallet-paging"><button className="co-btn" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / data.limit)}</span><button className="co-btn" disabled={page * data.limit >= data.total || loading} onClick={() => setPage(page + 1)}>Next</button></div>}
      </section>
    </>}
  </main></div>;
}

const W_STATUS = { pending: 'Waiting for transfer', paid: 'Transferred', rejected: 'Rejected — money returned to wallet' };
const EMPTY = { amount: '', bankName: '', accountNumber: '', accountName: '' };

// Form rút tiền từ ví về ngân hàng + danh sách yêu cầu rút của khách
function WithdrawPanel({ balance, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [list, setList] = useState([]);
  const [tick, setTick] = useState(0);
  useEffect(() => { listMyWithdrawals().then((r) => setList(r.data.items)).catch(() => setList([])); }, [tick]);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(''); };
  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount < 10000) return setError(`The minimum withdrawal is ${formatCurrency(10000)}.`);
    if (amount > balance) return setError('The amount is higher than your wallet balance.');
    if (!/^\d{6,20}$/.test(form.accountNumber.replace(/\s/g, ''))) return setError('The account number must be 6–20 digits.');
    if (form.bankName.trim().length < 2 || form.accountName.trim().length < 2) return setError('Enter the bank name and the account holder name.');
    setBusy(true); setError('');
    try {
      await requestWithdrawal({ ...form, amount });
      setNotice(`Request sent. ${formatCurrency(amount)} is held from your wallet until the store transfers it.`);
      setForm(EMPTY); setOpen(false); setTick((n) => n + 1); onDone();
    } catch (err) { setError(err.response?.data?.message || 'Could not send the request. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="wallet-history wallet-withdraw">
    <div className="wallet-withdraw-head"><h2>Withdraw to bank</h2>
      {!open && <button className="co-btn" disabled={balance < 10000} onClick={() => { setOpen(true); setNotice(''); }}><Icon name="account_balance" />Withdraw</button>}</div>
    {balance < 10000 && !open && <p className="wallet-muted">You need at least {formatCurrency(10000)} in your wallet to withdraw.</p>}
    {notice && <p className="wallet-ok" role="status">{notice}</p>}
    {open && <form className="wallet-withdraw-form" onSubmit={submit} noValidate>
      <label>Amount (VND)<input type="number" min="10000" max={balance} step="1000" value={form.amount} onChange={set('amount')} placeholder={`10,000 – ${balance.toLocaleString('en-US')}`} disabled={busy} />
        <button type="button" className="wallet-link" onClick={() => setForm({ ...form, amount: String(balance) })} disabled={busy}>Withdraw all</button></label>
      <label>Bank<input value={form.bankName} maxLength={100} onChange={set('bankName')} placeholder="Vietcombank" disabled={busy} /></label>
      <label>Account number<input inputMode="numeric" value={form.accountNumber} maxLength={24} onChange={set('accountNumber')} placeholder="0123456789" disabled={busy} /></label>
      <label>Account holder<input value={form.accountName} maxLength={100} onChange={set('accountName')} placeholder="NGUYEN VAN A" style={{ textTransform: 'uppercase' }} disabled={busy} /></label>
      {error && <p className="wallet-err" role="alert">{error}</p>}
      <div className="wallet-withdraw-actions"><button type="submit" className="co-btn" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button><button type="button" className="co-btn ghost" onClick={() => { setOpen(false); setError(''); }} disabled={busy}>Cancel</button></div>
    </form>}
    {list.length > 0 && <ul>{list.map((w) => <li key={w._id}>
      <Icon name="account_balance" /><div><b>{w.bankName} {w.accountNumber} · {w.accountName}</b><small>{formatDateTime(w.createdAt)} · {W_STATUS[w.status] || w.status}{w.reference ? ` · Ref ${w.reference}` : ''}{w.note ? ` · ${w.note}` : ''}</small></div>
      <div className={`wallet-amount ${w.status}`}><b>{formatCurrency(w.amount)}</b></div>
    </li>)}</ul>}
  </section>;
}
