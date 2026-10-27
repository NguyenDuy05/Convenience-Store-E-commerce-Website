import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import useAuth from '../../hooks/useAuth';
import { getMyMembership, getMyPointHistory } from '../../api/membership.api';
import '../../styles/membership.css';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const number = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);
const types = { earn: 'Earned', redeem: 'Redeemed', adjust: 'Adjustment' };
const messageOf = (error) => error.response?.data?.message || 'Unable to load data. Please try again.';

export default function MembershipPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [membership, setMembership] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0, pages: 0 });
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [memberStatus, setMemberStatus] = useState({ loading: true, error: '' });
  const [historyStatus, setHistoryStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let current = true;
    setMemberStatus({ loading: true, error: '' });
    getMyMembership().then(({ data }) => {
      if (current) { setMembership(data); setMemberStatus({ loading: false, error: '' }); }
    }).catch((error) => { if (current) setMemberStatus({ loading: false, error: messageOf(error) }); });
    return () => { current = false; };
  }, [reload]);

  useEffect(() => {
    let current = true;
    setHistoryStatus({ loading: true, error: '' });
    getMyPointHistory({ page, limit: 10, type }).then(({ data }) => {
      if (current) { setHistory(data); setHistoryStatus({ loading: false, error: '' }); }
    }).catch((error) => { if (current) setHistoryStatus({ loading: false, error: messageOf(error) }); });
    return () => { current = false; };
  }, [page, type, reload]);

  const retry = () => setReload((value) => value + 1);
  const progress = membership?.nextTier ? Math.min(100, Math.max(0, membership.lifetimePoints / membership.nextTier.minPoints * 100)) : 100;

  const name = membership?.fullName || user?.fullName || 'Member';
  const initials = name.trim().split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase();
  const accountLinks = [
    ['/profile', 'person', 'Profile'], ['/orders', 'inventory_2', 'My Orders'],
    ['/reviews', 'rate_review', 'My Reviews'], ['/membership', 'loyalty', 'Membership & Points'],
    ['/addresses', 'location_on', 'Addresses'], ['/support', 'help_center', 'Support & FAQ'],
  ];
  const onLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return <div className="membership-page">
    <nav className="membership-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron_right" /><Link to="/profile">My Account</Link><Icon name="chevron_right" /><span>QUICK Membership</span></nav>
    <header className="membership-heading"><div><h1>QUICK Membership</h1><p>Your points, your perks. Keep track of every reward.</p></div><span className="membership-ready"><Icon name="bolt" /> Your membership at a glance</span></header>
    <div className="membership-grid">
      <aside className="membership-sidebar">
        <div className="membership-profile"><div className="membership-avatar">{initials}</div><div><strong>{name}</strong><small><i /> QUICK MEMBER{membership && <> &bull; {number(membership.points)} PTS</>}</small></div></div>
        <nav className="membership-account-nav" aria-label="Account navigation">
          {accountLinks.map(([to, icon, label]) => <NavLink key={to} to={to} end className={({ isActive }) => isActive ? 'active' : ''}><Icon name={icon} /><span>{label}</span>{to === '/membership' ? <i /> : <Icon name="chevron_right" />}</NavLink>)}
          <button className="membership-logout" onClick={onLogout}><Icon name="logout" />Log Out</button>
        </nav>
        <div className="membership-counter-pass"><div><strong>EXPRESS COUNTER PASS</strong><span>Coming soon</span></div><div className="membership-pass-placeholder"><Icon name="barcode" /><span>Digital member pass</span></div><p><Icon name="qr_code_scanner" /> In-store scanning is not available yet.</p></div>
      </aside>
      <div className="membership-content">
        {memberStatus.loading ? <div className="membership-panel" role="status">Loading membership...</div> : memberStatus.error ? <div className="membership-error" role="alert">{memberStatus.error} <button onClick={retry}>Try again</button></div> : membership && <>
          <section className="membership-card" aria-label="Membership card">
            <div className="membership-card-top"><strong><span className="membership-chip"><Icon name="grid_view" /></span> QUICK MEMBER <Icon name="contactless" /></strong><span className="membership-tier-badge"><Icon name="stars" />{membership.tier?.name || 'Member'}</span></div>
            <div className="membership-card-middle"><div><p>AVAILABLE LOYALTY POINTS</p><div className="membership-balance">{number(membership.points)} <small>pts</small></div></div><div className="membership-card-name"><strong>{name}</strong><small>Lifetime points: {number(membership.lifetimePoints)}</small></div></div>
            <div className="membership-card-bottom"><div className="membership-pass-actions"><button disabled title="Digital member codes are not available yet"><Icon name="qr_code_2" /> Show QR Code</button><button disabled title="Phone wallet integration is not available yet"><Icon name="wallet" /> Save to Phone Wallet</button></div><a href="#point-history">View point activity <Icon name="arrow_forward" /></a></div>
          </section>
          <section className="membership-panel membership-tier">
            <div className="membership-tier-heading"><span className="membership-icon gold"><Icon name="workspace_premium" /></span><div><h2>{membership.tier?.name || 'Membership'} Tier Progress</h2><p>Based on your lifetime qualifying points</p></div><div className="membership-tier-total"><strong>{number(membership.lifetimePoints)}</strong>{membership.nextTier && <small> / {number(membership.nextTier.minPoints)} pts</small>}</div></div>
            {membership.nextTier ? <><progress aria-label={'Progress to ' + membership.nextTier.name} value={progress} max="100" /><div className="membership-progress-caption"><span><Icon name="arrow_circle_up" />{number(membership.pointsToNextTier)} pts to reach {membership.nextTier.name}</span><small>Next tier: {number(membership.nextTier.discountPercent)}% tier discount</small></div></> : <p className="membership-tier-empty">{membership.tier ? 'No higher tier is currently configured.' : 'Your account has not been assigned a membership tier yet.'}</p>}
          </section>
          <section className="membership-perks-section"><div className="membership-section-title"><h2>Core Member Perks</h2><small>YOUR MEMBERSHIP</small></div><div className="membership-perks">
            <article><span className="membership-icon blue"><Icon name="sell" /></span><div><h3>Member tier benefits</h3><p>{membership.tier ? membership.tier.description || membership.tier.name + ' membership with a ' + number(membership.tier.discountPercent) + '% tier discount.' : 'Your membership benefits will appear once a tier is assigned.'}</p></div></article>
            <article><span className="membership-icon green"><Icon name="add_task" /></span><div><h3>Lifetime progress</h3><p>{number(membership.lifetimePoints)} lifetime points recorded toward your membership tier.</p></div></article>
            <article><span className="membership-icon gold"><Icon name="account_balance_wallet" /></span><div><h3>Available points</h3><p>{number(membership.points)} points in your current balance. Keep track of every balance change below.</p></div></article>
            <article><span className="membership-icon blue"><Icon name="history" /></span><div><h3>Point activity</h3><p>Review earned, redeemed and adjusted points, with your balance after each transaction.</p></div></article>
          </div></section>
        </>}
        <section className="membership-rewards"><div className="membership-section-title"><div><h2>Redeem Points Catalog</h2><p>Rewards will be available here when point redemption launches.</p></div>{membership && <small>{number(membership.points)} Pts Available</small>}</div><div className="membership-reward-grid">{[['confirmation_number', 'Order vouchers', 'Use points toward savings on your next order.'], ['local_cafe', 'Drink rewards', 'Discover refreshments to redeem with your points.'], ['percent', 'Member discounts', 'Explore offers designed for loyalty members.'], ['redeem', 'Store rewards', 'Find more ways to enjoy your membership.']].map(([icon, title, text]) => <article key={title}><div><span className="membership-reward-badge">Coming soon</span><Icon name={icon} /></div><h3>{title}</h3><p>{text}</p><button disabled>Not available yet</button></article>)}</div></section>
        <section className="membership-panel membership-history" id="point-history" aria-busy={historyStatus.loading}>
          <div className="membership-section-title"><h2>Recent Point Activity</h2><button className="membership-refresh" onClick={retry} disabled={memberStatus.loading || historyStatus.loading}><Icon name="refresh" /> Refresh</button></div>
          <div className="membership-filters" role="group" aria-label="Filter point activity">{[['', 'All Activity'], ...Object.entries(types)].map(([value, label]) => <button key={value} aria-pressed={type === value} className={type === value ? 'active' : ''} onClick={() => { setType(value); setPage(1); }}>{label}</button>)}</div>
          {historyStatus.loading ? <p className="membership-empty" role="status">Loading point history...</p> : historyStatus.error ? <div className="membership-error" role="alert">{historyStatus.error} <button onClick={retry}>Try again</button></div> : history.items.length === 0 ? <div className="membership-empty"><Icon name="history" /><h3>{type ? 'No matching activity' : 'No point activity yet'}</h3><p>{type ? 'Try another filter to see your point transactions.' : 'Your earned, redeemed and adjusted points will appear here.'}</p></div> : <ul className="membership-activity-list">{history.items.map((item) => <li key={item._id}><span className={'membership-icon ' + (item.type === 'earn' ? 'green' : item.type === 'redeem' ? 'blue' : 'gold')}><Icon name={item.type === 'earn' ? 'shopping_basket' : item.type === 'redeem' ? 'sell' : 'tune'} /></span><div className="membership-activity-description"><h3>{item.reason || (item.orderId?.orderCode ? 'Order #' + item.orderId.orderCode : types[item.type] + ' points')}</h3><p>{formatDateTime(item.createdAt)}{item.reason && item.orderId?.orderCode && <> &bull; Order #{item.orderId.orderCode}</>}</p></div><div className="membership-activity-points"><strong className={item.points >= 0 ? 'membership-positive' : 'membership-negative'}>{item.points > 0 ? '+' : ''}{number(item.points)} pts</strong><small>Balance: {number(item.balanceAfter)} pts</small><small>{types[item.type]}</small></div></li>)}</ul>}
          {!historyStatus.loading && !historyStatus.error && history.total > 0 && <nav className="membership-pagination" aria-label="Point history pagination"><span>{number(history.total)} transactions &bull; Page {page}/{Math.max(1, history.pages)}</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={page >= history.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div></nav>}
        </section>
        <div className="membership-bottom-note"><span className="membership-icon green"><Icon name="card_membership" /></span><div><h3>Your membership, always within reach</h3><p>Available points are your current balance. Lifetime points track your tier progress.</p></div><Link to="/products">Explore products <Icon name="arrow_forward" /></Link></div>
      </div>
    </div>
  </div>;
}
