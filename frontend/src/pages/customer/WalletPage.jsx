import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import AccountSidebar from '../../components/order/AccountSidebar';
import Icon from '../../components/common/Icon';
import { formatCurrency, formatDateTime } from '../../utils/format';
import '../../styles/wallet.css';

export default function WalletPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    api.get('/wallet', { params: { page } }).then(r => { if (!cancelled) setData(r.data); })
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
      <section className="wallet-policy"><h2>How it works</h2><p>Your wallet balance is applied first at checkout. Pay any remaining amount through VNPay. A fully covered order is confirmed immediately.</p><p>Cancel before staff starts preparing your order. Payments received are returned to your wallet. Contact the store for cancellations after preparation begins.</p><p>Earn 1 point for every {formatCurrency(data.pointsPerVnd)} after collecting a completed order. Cancelled orders earn no points.</p></section>
      <section className="wallet-history"><h2>Wallet activity</h2>{!data.items.length ? <p>No activity yet. Refunds and wallet payments will appear here.</p> : <ul>{data.items.map(entry => <li key={entry.key}>
        <Icon name={entry.amount > 0 ? 'south_west' : 'north_east'} /><div><b>{entry.description}</b><small>{formatDateTime(entry.createdAt)}</small>{entry.orderId && <Link to={`/orders/${entry.orderId}`}>#{entry.orderCode}</Link>}</div>
        <div className={`wallet-amount ${entry.amount > 0 ? 'credit' : ''}`}><b>{entry.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(entry.amount))}</b><small>Balance {formatCurrency(entry.balanceAfter)}</small></div>
      </li>)}</ul>}
        {data.total > data.limit && <div className="wallet-paging"><button className="co-btn" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / data.limit)}</span><button className="co-btn" disabled={page * data.limit >= data.total || loading} onClick={() => setPage(page + 1)}>Next</button></div>}
      </section>
    </>}
  </main></div>;
}
