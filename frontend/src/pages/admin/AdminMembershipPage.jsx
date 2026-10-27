import { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import Icon from '../../components/common/Icon';
import * as api from '../../api/membership.api';
import '../../styles/admin-membership.css';

const num = (n) => new Intl.NumberFormat('en-US').format(n ?? 0);
const date = (d) => d ? new Date(d).toLocaleString('en-US') : '-';
const emptyTier = { name: '', minPoints: 0, discountPercent: 0, description: '', sortOrder: 0 };
const message = (e) => e.response?.data?.message || 'Unable to complete this request. Please try again.';

export default function AdminMembershipPage() {
  const [tab, setTab] = useState('overview');
  const [tiers, setTiers] = useState([]);
  const [members, setMembers] = useState({ items: [], total: 0, pages: 0 });
  const [ledger, setLedger] = useState({ items: [], total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [tierForm, setTierForm] = useState(emptyTier);
  const [adjustment, setAdjustment] = useState({ points: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const refresh = () => setRevision((n) => n + 1);

  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    const load = async () => {
      const tierResult = await api.listTiers();
      const result = tab === 'overview' || tab === 'members'
        ? await api.listMembers({ page: tab === 'overview' ? 1 : page, limit: 10, q: tab === 'members' ? q : '' })
        : await (tab === 'redemptions' ? api.listRedemptions : api.listPointHistory)({ page, limit: 10, type, userId: memberFilter || undefined });
      if (!current) return;
      setTiers(tierResult.data);
      if (tab === 'overview' || tab === 'members') setMembers(result.data); else setLedger(result.data);
    };
    load().catch((e) => { if (current) setError(message(e)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [tab, page, q, type, memberFilter, revision]);

  const openMember = useCallback(async (id) => {
    setModal('member'); setSelected(null); setDetailError(''); setDetailLoading(true);
    try { setSelected((await api.getMember(id)).data); }
    catch (e) { setDetailError(message(e)); }
    finally { setDetailLoading(false); }
  }, []);
  const changeTab = (value) => { setTab(value); setPage(1); setMemberFilter(''); setType(''); };
  const saveTier = async (event) => {
    event.preventDefault(); setBusy(true); setDetailError('');
    try {
      const data = { ...tierForm, minPoints: Number(tierForm.minPoints), discountPercent: Number(tierForm.discountPercent), sortOrder: Number(tierForm.sortOrder) };
      if (modal.id) await api.updateTier(modal.id, data); else await api.createTier(data);
      setModal(null); setNotice('Membership tier saved.'); refresh();
    } catch (e) { setDetailError(message(e)); } finally { setBusy(false); }
  };
  const removeTier = async () => {
    setBusy(true); setDetailError('');
    try { await api.deleteTier(modal.id); setModal(null); setNotice('Membership tier deleted.'); refresh(); }
    catch (e) { setDetailError(message(e)); } finally { setBusy(false); }
  };
  const saveAdjustment = async (event) => {
    event.preventDefault(); setBusy(true); setDetailError('');
    try {
      await api.adjustPoints(selected._id, { points: Number(adjustment.points), reason: adjustment.reason });
      setModal(null); setNotice('Points adjusted and an audit entry recorded.'); refresh();
    } catch (e) { setDetailError(message(e)); } finally { setBusy(false); }
  };
  const openTier = (tier) => { setTierForm(tier ? { name: tier.name, minPoints: tier.minPoints, discountPercent: tier.discountPercent, description: tier.description || '', sortOrder: tier.sortOrder || 0 } : emptyTier); setDetailError(''); setModal({ kind: 'tier', id: tier?._id }); };
  const data = tab === 'members' ? members : ledger;

  return <AdminShell crumbs={['Membership']}><div className="am-page">
    <header className="am-heading"><div><p className="am-eyebrow">CUSTOMER PROGRAMS</p><h1>Membership &amp; Loyalty Program</h1><p>Manage member tiers, review point activity and maintain customer balances.</p></div><button className="am-primary" onClick={() => openTier(null)}><Icon name="add_circle" /> Add Membership Tier</button></header>
    <nav className="am-tabs" aria-label="Membership management">{[['overview', 'Overview & Levels'], ['members', 'Members'], ['history', 'Point Activity Ledger'], ['redemptions', 'Redemption History']].map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} aria-pressed={tab === value} onClick={() => changeTab(value)}>{label}</button>)}</nav>
    {notice && <div className="am-success" role="status">{notice}</div>}
    {error && <div className="am-error" role="alert">{error} <button onClick={refresh}>Try again</button></div>}
    {loading ? <div className="am-panel" role="status">Loading membership data...</div> : !error && <>
      {tab === 'overview' && <>
        <div className="am-stats"><article><Icon name="groups" /><small>TOTAL MEMBERS</small><strong>{num(members.total)}</strong><span>Registered customer accounts</span></article><article><Icon name="workspace_premium" /><small>MEMBERSHIP LEVELS</small><strong>{num(tiers.length)}</strong><span>Configured loyalty tiers</span></article><article><Icon name="person_outline" /><small>WITHOUT A TIER</small><strong>{num(Math.max(0, members.total - tiers.reduce((total, t) => total + t.memberCount, 0)))}</strong><span>Members awaiting tier assignment</span></article></div>
        <div className="am-section-heading"><div><h2>Membership Levels</h2><p>Point thresholds, member populations and tier benefits.</p></div></div>
        {tiers.length === 0 ? <div className="am-panel am-empty">No membership tiers yet. Add a tier to configure your program.</div> : <div className="am-tier-grid">{tiers.map((tier, i) => <article className={'am-tier am-tier-' + i % 3} key={tier._id}><div className="am-tier-title"><span><Icon name="workspace_premium" /></span><h2>{tier.name}</h2></div><div className="am-tier-threshold"><strong>{num(tier.minPoints)}</strong><span> lifetime points required</span></div><p>{num(tier.memberCount)} members</p><hr /><h3>Tier Benefits</h3><p className="am-benefit"><Icon name="check_circle" /> {num(tier.discountPercent)}% membership discount</p><p>{tier.description || 'No additional description.'}</p><div className="am-tier-actions"><button onClick={() => openTier(tier)}>Edit Tier</button><button className="am-danger" disabled={tier.memberCount > 0} title={tier.memberCount ? 'Assigned tiers cannot be deleted' : 'Delete tier'} onClick={() => { setDetailError(''); setModal({ kind: 'delete', id: tier._id, name: tier.name }); }}>Delete</button></div></article>)}</div>}
      </>}
      {tab === 'members' && <section className="am-panel"><div className="am-section-heading"><h2>Members Directory</h2><form className="am-search" onSubmit={(e) => { e.preventDefault(); setQ(search); setPage(1); }}><input aria-label="Search members" maxLength={100} placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} /><button type="submit">Search</button></form></div><div className="am-table-wrap"><table><thead><tr><th>Member</th><th>Tier</th><th>Available Points</th><th>Lifetime Points</th><th>Status</th><th>Actions</th></tr></thead><tbody>{members.items.map((m) => <tr key={m._id}><td><strong>{m.fullName}</strong><small>{m.email}</small></td><td>{m.membership?.tierId?.name || 'Unassigned'}</td><td>{num(m.membership?.points)}</td><td>{num(m.membership?.lifetimePoints)}</td><td><span className="am-badge">{m.status}</span></td><td><button onClick={() => openMember(m._id)}>View Details</button></td></tr>)}</tbody></table></div>{members.items.length === 0 && <p className="am-empty">No matching members.</p>}</section>}
      {(tab === 'history' || tab === 'redemptions') && <section className="am-panel"><div className="am-section-heading"><div><h2>{tab === 'history' ? 'Loyalty Points & Ledger Audit' : 'Redemption History'}</h2><p>Recorded transactions with balances and adjustment reasons.</p></div>{tab === 'history' && <label>Transaction type <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All Types</option><option value="earn">Earned</option><option value="redeem">Redeemed</option><option value="adjust">Adjustment</option></select></label>}</div>{memberFilter && <p className="am-filter-note">Showing selected member only. <button onClick={() => { setMemberFilter(''); setPage(1); }}>Show all members</button></p>}<div className="am-table-wrap"><table><thead><tr><th>Date</th><th>Member</th><th>Type</th><th>Points</th><th>Balance After</th><th>Order / Reason</th><th>Adjusted By</th></tr></thead><tbody>{ledger.items.map((entry) => <tr key={entry._id}><td>{date(entry.createdAt)}</td><td>{entry.userId?.fullName || 'Unavailable member'}<small>{entry.userId?.email}</small></td><td><span className={'am-badge ' + entry.type}>{entry.type}</span></td><td className={entry.points < 0 ? 'am-negative' : 'am-positive'}>{entry.points > 0 ? '+' : ''}{num(entry.points)}</td><td>{num(entry.balanceAfter)}</td><td>{entry.reason || '-'}<small>{entry.orderId?.orderCode}</small></td><td>{entry.adjustedBy?.fullName || '-'}</td></tr>)}</tbody></table></div>{ledger.items.length === 0 && <p className="am-empty">No point transactions found.</p>}</section>}
      {tab !== 'overview' && <nav className="am-pagination" aria-label="Pagination"><span>{num(data.total)} results &bull; Page {page}/{Math.max(1, data.pages)}</span><div><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button></div></nav>}
    </>}
    {modal && <div className="am-modal-backdrop"><section className="am-modal" role="dialog" aria-modal="true" aria-label="Membership management dialog"><div className="am-section-heading"><h2>{modal === 'member' ? 'Member Details' : modal === 'adjust' ? 'Adjust Membership Points' : modal.kind === 'delete' ? 'Delete Membership Tier' : modal.id ? 'Edit Membership Tier' : 'Create Membership Tier'}</h2><button aria-label="Close dialog" disabled={busy} onClick={() => setModal(null)}>Close</button></div>
      {detailError && <p className="am-error" role="alert">{detailError}</p>}
      {modal === 'member' && (detailLoading ? <p role="status">Loading member...</p> : selected && <><div className="am-member-name"><Icon name="account_circle" /><div><h3>{selected.fullName}</h3><p>{selected.email}</p></div></div><dl><dt>Phone</dt><dd>{selected.phone || '-'}</dd><dt>Status</dt><dd>{selected.status}</dd><dt>Membership tier</dt><dd>{selected.membership?.tierId?.name || 'Unassigned'}</dd><dt>Available points</dt><dd>{num(selected.membership?.points)}</dd><dt>Lifetime points</dt><dd>{num(selected.membership?.lifetimePoints)}</dd></dl><div className="am-modal-actions"><button className="am-primary" disabled={selected.status !== 'active'} onClick={() => { setAdjustment({ points: '', reason: '' }); setDetailError(''); setModal('adjust'); }}>Adjust Points</button><button onClick={() => { setModal(null); setTab('history'); setPage(1); setType(''); setMemberFilter(selected._id); }}>View Point History</button><button onClick={() => { setModal(null); setTab('redemptions'); setPage(1); setMemberFilter(selected._id); }}>View Redemptions</button></div></>)}
      {modal === 'adjust' && <form onSubmit={saveAdjustment}><p>Member: <strong>{selected.fullName}</strong> &bull; Balance: {num(selected.membership?.points)} pts</p><label>Point adjustment (positive to credit, negative to debit)<input type="number" step="1" required value={adjustment.points} onChange={(e) => setAdjustment({ ...adjustment, points: e.target.value })} /></label><label>Reason<textarea required maxLength={1000} rows={3} value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} /></label><p className="am-hint">Manual adjustments change the available balance and create an audit entry. Lifetime points remain unchanged.</p><button className="am-primary" disabled={busy || !Number.isSafeInteger(Number(adjustment.points)) || Number(adjustment.points) === 0 || !adjustment.reason.trim()}>{busy ? 'Saving...' : 'Confirm Adjustment'}</button></form>}
      {modal.kind === 'tier' && <form onSubmit={saveTier}><label>Tier Name<input autoFocus required maxLength={80} value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} /></label><div className="am-form-grid"><label>Minimum Lifetime Points<input type="number" min="0" step="1" required value={tierForm.minPoints} onChange={(e) => setTierForm({ ...tierForm, minPoints: e.target.value })} /></label><label>Discount (%)<input type="number" min="0" max="100" step="0.01" required value={tierForm.discountPercent} onChange={(e) => setTierForm({ ...tierForm, discountPercent: e.target.value })} /></label></div><label>Description<textarea maxLength={1000} rows={3} value={tierForm.description} onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })} /></label><label>Sort Order<input type="number" step="1" required value={tierForm.sortOrder} onChange={(e) => setTierForm({ ...tierForm, sortOrder: e.target.value })} /></label><button className="am-primary" disabled={busy}>{busy ? 'Saving...' : 'Save Membership Tier'}</button></form>}
      {modal.kind === 'delete' && <><p>Delete the tier <strong>{modal.name}</strong>? This is only allowed when no members are assigned.</p><div className="am-modal-actions"><button className="am-danger" disabled={busy} onClick={removeTier}>{busy ? 'Deleting...' : 'Confirm Delete'}</button><button disabled={busy} onClick={() => setModal(null)}>Cancel</button></div></>}
    </section></div>}
  </div></AdminShell>;
}
