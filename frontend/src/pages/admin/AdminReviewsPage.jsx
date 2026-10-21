import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { handleViolatingReview, hideReview, listReviewsAdmin } from '../../api/review.api';
import { listStores } from '../../api/store.api';
import useAuth from '../../hooks/useAuth';
import { adminNav } from '../../routes/navConfig';
import '../../styles/style.css';

const HIDE_REASONS = [
  { value: 'offensive_content', label: 'Inappropriate language or offensive content', detail: 'Profanity, abusive speech, or derogatory comments' },
  { value: 'pii_exposure', label: 'Contains personal contact details or private data', detail: 'Phone numbers, private addresses, or other sensitive information' },
  { value: 'promotional_spam', label: 'Spam, promotional link, or competitor advertising', detail: 'Unrelated marketing, promo codes, or referral links' },
  { value: 'irrelevant_service', label: 'Irrelevant to the product', detail: 'General app, payment, or account support issues' },
  { value: 'fraud_suspicion', label: 'Suspected fraudulent review or rating manipulation', detail: 'Duplicate, automated, or otherwise inauthentic feedback' },
  { value: 'customer_request', label: 'Customer requested removal or review is under dispute', detail: 'Removal request submitted through the customer account' },
];

const ADMIN_LABELS = {
  '/admin': 'Dashboard', '/admin/customers': 'Customers', '/admin/staff': 'Staff',
  '/admin/stores': 'Stores', '/admin/products': 'Products', '/admin/categories': 'Categories',
  '/admin/inventory': 'Inventory', '/admin/orders': 'Orders', '/admin/transactions': 'Transactions',
  '/admin/promotions': 'Promotions', '/admin/discount-codes': 'Discount Codes',
};
const NAV_GROUPS = [
  { title: 'Main', items: [{ to: '/admin', label: 'Dashboard', icon: 'space_dashboard' }] },
  { title: 'Management', items: adminNav.filter((item) => ['/admin/customers', '/admin/staff', '/admin/stores', '/admin/products', '/admin/categories', '/admin/inventory'].includes(item.to)).map((item) => ({ ...item, label: ADMIN_LABELS[item.to], icon: ({ '/admin/customers': 'group', '/admin/staff': 'badge', '/admin/stores': 'storefront', '/admin/products': 'inventory_2', '/admin/categories': 'category', '/admin/inventory': 'warehouse' })[item.to] })) },
  { title: 'Operations', items: adminNav.filter((item) => ['/admin/orders', '/admin/transactions', '/admin/promotions', '/admin/discount-codes'].includes(item.to)).map((item) => ({ ...item, label: ADMIN_LABELS[item.to], icon: ({ '/admin/orders': 'shopping_bag', '/admin/transactions': 'receipt_long', '/admin/promotions': 'campaign', '/admin/discount-codes': 'sell' })[item.to] })) },
  { title: 'Customer Programs', items: [{ to: '/admin/membership', label: 'Membership', icon: 'card_membership' }, { to: '/admin/reviews', label: 'Reviews', icon: 'star' }] },
  { title: 'Finance', items: [{ to: '/admin/payments', label: 'Payments', icon: 'payments' }] },
];

export default function AdminReviewsPage() {
  const { user, logout } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ q: '', targetType: '', rating: '', productId: '', date: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [moderationTarget, setModerationTarget] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsResponse, storesResponse] = await Promise.all([listReviewsAdmin(), listStores()]);
      setReviews(reviewsResponse.data);
      setStores(storesResponse.data?.items || storesResponse.data || []);
      setError('');
    } catch (err) { setError(err.response?.data?.message || 'Unable to load reviews.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!moderationTarget) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeModeration(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moderationTarget]);

  const closeModeration = () => {
    setModerationTarget(null); setModerationReason(''); setModeratorNotes(''); setConfirmed(false);
  };
  const openModeration = (review, action) => {
    setModerationTarget({ review, action }); setModerationReason(''); setModeratorNotes(''); setConfirmed(false);
  };
  const confirmModeration = async () => {
    if (!moderationTarget || !moderationReason || !confirmed) return;
    const { review, action } = moderationTarget;
    const label = HIDE_REASONS.find((reason) => reason.value === moderationReason)?.label;
    const reason = `${label}${moderatorNotes.trim() ? ` — ${moderatorNotes.trim()}` : ''}`;
    setBusyId(review._id); setError('');
    try {
      if (action === 'violation') await handleViolatingReview(review._id, { action: 'hide', reason });
      else await hideReview(review._id, { reason });
      closeModeration(); await load();
    } catch (err) { setError(err.response?.data?.message || 'Unable to update the review status.'); }
    finally { setBusyId(''); }
  };
  const showReview = async (review) => {
    setBusyId(review._id); setError('');
    try { await hideReview(review._id, { reason: '' }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to show this review.'); }
    finally { setBusyId(''); }
  };
  const dismissViolation = async (review) => {
    setBusyId(review._id); setError('');
    try { await handleViolatingReview(review._id, { action: 'dismiss', reason: '' }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to clear the violation flag.'); }
    finally { setBusyId(''); }
  };

  const counts = useMemo(() => ({
    total: reviews.length,
    visible: reviews.filter((review) => review.status === 'visible').length,
    hidden: reviews.filter((review) => review.status === 'hidden').length,
    deleted: reviews.filter((review) => review.status === 'deleted').length,
    flagged: reviews.filter((review) => review.moderation?.isViolating).length,
  }), [reviews]);
  const filteredReviews = useMemo(() => reviews.filter((review) => {
    const status = activeTab === 'all' ? '' : activeTab;
    if (status && review.status !== status) return false;
    if (filters.targetType && review.targetType !== filters.targetType) return false;
    if (filters.rating && Number(filters.rating) !== review.rating) return false;
    if (filters.productId && String(review.productId?._id || review.productId) !== filters.productId) return false;
    if (filters.date) {
      const age = Date.now() - new Date(review.createdAt).getTime();
      if (filters.date === '30days' && age > 30 * 86400000) return false;
      if (filters.date === 'month') { const created = new Date(review.createdAt); const now = new Date(); if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false; }
    }
    const query = filters.q.trim().toLowerCase();
    if (query && ![review.customerId?.fullName, review.customerId?.email, review.productId?.name, review.productId?.sku, review.storeId?.name, review.comment, review.orderId?.orderCode].some((value) => String(value || '').toLowerCase().includes(query))) return false;
    return true;
  }), [reviews, activeTab, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const visibleReviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);
  const products = [...new Map(reviews.filter((review) => review.productId?._id).map((review) => [review.productId._id, review.productId])).values()];
  const targetReview = moderationTarget?.review;
  const storeName = stores[0]?.name || 'Convenience Store';
  const setFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };

  return <div className="review-dashboard">
    <aside className="review-sidebar">
      <div className="review-brand"><span className="review-brand-mark">Q</span><b>QUICK</b><small>ADMIN</small></div>
      <nav className="review-side-nav">{NAV_GROUPS.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={({ isActive }) => `review-nav-link${isActive ? ' active' : ''}`}><span className="review-material-icon">{item.icon}</span><span>{item.label}</span></NavLink>)}</section>)}</nav>
      <div className="review-side-bottom"><NavLink to="/admin/profile" className="review-nav-link"><span className="review-material-icon">account_circle</span><span>Profile</span></NavLink><button className="review-nav-link review-logout" onClick={logout}><span className="review-material-icon">logout</span><span>Logout</span></button></div>
    </aside>

    <div className="review-app-area">
      <header className="review-topbar"><div className="review-topbar-left"><button className="review-store-pill"><span className="review-material-icon">storefront</span>{storeName} (1)<span className="review-material-icon">expand_more</span></button></div><div className="review-topbar-right"><label className="review-global-search"><span className="review-material-icon">search</span><input aria-label="Search reviews" placeholder="Search reviews, customers, products…" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} /></label><button className="review-top-icon" aria-label="Notifications"><span className="review-material-icon">notifications</span><i/></button><span className="review-top-divider"/><div className="review-admin-user"><div><b>{user?.fullName || 'Admin'}</b><small>Administrator</small></div><span className="review-user-avatar"><span className="review-material-icon">person</span></span></div></div></header>

      <main className="review-admin-content">
        <section className="review-page review-admin-page">
          <div className="review-admin-page-heading"><div><div className="review-admin-eyebrow">OPERATIONS <span>•</span> <b>FEEDBACK MODERATION</b></div><h1>Customer Reviews &amp; Feedback</h1><p>Review customer ratings and comments, then manage their public visibility.</p></div><div className="review-heading-actions"><span className="review-store-context"><span className="review-material-icon">storefront</span>{storeName} · Admin workspace</span></div></div>
          {error && <p className="review-alert error" role="alert">{error}</p>}

          <div className="review-stat-grid">
            <article className="review-stat-card"><div><span>Total Reviews</span><i className="review-stat-icon blue"><span className="review-material-icon">star</span></i></div><strong>{counts.total.toLocaleString('en-US')}</strong><small><span className="review-stat-note">{reviews.length ? `${counts.total} records` : 'No reviews yet'}</span><span>All review records</span></small></article>
            <article className="review-stat-card"><div><span>Published</span><i className="review-stat-icon green"><span className="review-material-icon">check_circle</span></i></div><strong>{counts.visible.toLocaleString('en-US')}</strong><small><span className="review-stat-dot green-dot"/>{counts.total ? `${((counts.visible / counts.total) * 100).toFixed(1)}% visible` : '0% visible'}<span>Public catalog</span></small></article>
            <article className="review-stat-card"><div><span>Hidden</span><i className="review-stat-icon yellow"><span className="review-material-icon">visibility_off</span></i></div><strong>{counts.hidden.toLocaleString('en-US')}</strong><small><span className="review-stat-badge yellow-badge">MODERATION</span><span>Hidden from customers</span></small></article>
            <article className="review-stat-card"><div><span>Flagged</span><i className="review-stat-icon red"><span className="review-material-icon">flag</span></i></div><strong>{counts.flagged.toLocaleString('en-US')}</strong><small><span className="review-stat-badge red-badge">POLICY FLAGGED</span><span>{counts.deleted} deleted</span></small></article>
          </div>

          <section className="review-table-tools">
            <div className="review-tool-row"><div className="review-status-tabs" role="tablist" aria-label="Review status">{[['all', 'All Reviews', counts.total], ['visible', 'Published', counts.visible], ['hidden', 'Hidden', counts.hidden], ['deleted', 'Deleted', counts.deleted]].map(([key, label, count]) => <button role="tab" aria-selected={(activeTab === key)} className={activeTab === key ? 'selected' : ''} key={key} onClick={() => { setActiveTab(key); setPage(1); }}>{label}<b className={`tab-count ${key}`}>{count.toLocaleString('en-US')}</b></button>)}</div><label className="review-table-search"><span className="review-material-icon">search</span><input aria-label="Search customer, review, SKU, or order" placeholder="Search customer, review, SKU, or order ID" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} /></label></div>
            <div className="review-filter-row"><label className="review-filter-pill"><span className="review-material-icon">star</span><select aria-label="Filter by rating" value={filters.rating} onChange={(event) => setFilter('rating', event.target.value)}><option value="">All Ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}</select></label><label className="review-filter-pill"><span className="review-material-icon">inventory_2</span><select aria-label="Filter by product" value={filters.productId} onChange={(event) => setFilter('productId', event.target.value)}><option value="">All Products</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label><label className="review-filter-pill"><span className="review-material-icon">category</span><select aria-label="Filter by review type" value={filters.targetType} onChange={(event) => setFilter('targetType', event.target.value)}><option value="">All Review Types</option><option value="product">Product Reviews</option><option value="store">Store Reviews</option></select></label><label className="review-filter-pill"><span className="review-material-icon">storefront</span><select aria-label="Filter by store" disabled><option>All Stores ({stores.length || 1})</option></select></label><label className="review-filter-pill"><span className="review-material-icon">calendar_month</span><select aria-label="Filter by date" value={filters.date} onChange={(event) => setFilter('date', event.target.value)}><option value="">All dates</option><option value="month">This month</option><option value="30days">Last 30 days</option></select></label><div className="review-filter-spacer"/><button className="review-tool-icon" aria-label="Refresh reviews" onClick={load}><span className="review-material-icon">refresh</span></button></div>
          </section>

          <section className="review-table-wrap" aria-label="Customer reviews table">
            <div className="review-table-scroll"><table className="review-data-table"><thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Review &amp; Highlights</th><th>Store</th><th>Status</th><th aria-label="Actions"/></tr></thead><tbody>
              {loading ? <tr><td colSpan={7} className="review-table-empty">Loading reviews…</td></tr> : visibleReviews.length === 0 ? <tr><td colSpan={7} className="review-table-empty">No reviews match your filters.</td></tr> : visibleReviews.map((review) => <tr className={`${review.status === 'hidden' ? 'row-hidden' : ''} ${review.rating <= 2 ? 'row-low-rating' : ''}`} key={review._id}>
                <td><div className="review-customer-cell"><b>{review.customerId?.fullName || 'Customer'}</b><small>{review.customerId?.email || '—'}</small><div className="review-customer-badges">{review.orderId && <span className="customer-verified"><span className="review-material-icon">verified</span>Verified</span>}</div></div></td>
                <td><div className="review-product-cell">{review.productId?.images?.[0] ? <img src={review.productId.images[0]} alt="" /> : <span className="review-product-placeholder"><span className="review-material-icon">inventory_2</span></span>}<div><b>{review.productId?.name || review.storeId?.name || 'Store review'}</b><small>{review.productId?.sku ? `SKU: ${review.productId.sku}` : review.targetType === 'store' ? 'Store feedback' : 'Verified in-store pickup'}</small></div></div></td>
                <td><div className="review-rating-cell"><span>{[1, 2, 3, 4, 5].map((star) => <i className={star <= review.rating ? 'filled' : ''} key={star}>★</i>)}</span><b className={review.rating <= 2 ? 'low' : ''}>{review.rating.toFixed(1)}</b></div></td>
                <td><div className="review-feedback-cell"><p>{review.comment || 'No written comment.'}</p>{review.moderation?.isViolating && <span className="review-highlight red-highlight">Flagged: Policy violation</span>}{review.status === 'hidden' && <span className="review-highlight gray-highlight">Hidden from public</span>}</div></td>
                <td><span className="review-store-cell"><span className="review-material-icon">storefront</span>{review.storeId?.name || storeName}</span></td>
                <td><span className={`review-status ${review.status}`}>{review.status === 'visible' ? 'Published' : review.status === 'hidden' ? 'Hidden' : 'Deleted'}</span></td>
                <td><div className="review-row-actions">{review.status === 'visible' && <button aria-label="Hide review" title="Hide review" onClick={() => openModeration(review, 'hide')}><span className="review-material-icon">visibility_off</span></button>}{review.status === 'hidden' && <button aria-label="Show review" title="Show review" onClick={() => showReview(review)}><span className="review-material-icon">visibility</span></button>}{!review.moderation?.isViolating && review.status !== 'deleted' && <button aria-label="Flag policy violation" title="Confirm policy violation" onClick={() => openModeration(review, 'violation')}><span className="review-material-icon">flag</span></button>}</div></td>
              </tr>)}
            </tbody></table></div>
            <footer className="review-table-pagination"><span>Showing {filteredReviews.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredReviews.length)} of <b>{filteredReviews.length.toLocaleString('en-US')}</b> reviews</span><span className="pagination-dot">•</span><label>Per page: <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={7}>7</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label><div className="review-pager"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><span>Page {page} of {totalPages}</span><button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button></div></footer>
          </section>

          <aside className="review-engine-banner"><span className="review-engine-icon"><span className="review-material-icon">smart_toy</span></span><div className="review-engine-copy"><b>Moderation tools</b><span className="engine-active"><i/>ACTIVE</span><p>Use reason codes and internal notes to keep review moderation consistent and auditable.</p></div><div className="review-engine-status"><span className="review-material-icon">verified_user</span><span>Audit logging<br/><b>Enabled</b></span></div><div className="review-engine-status"><span className="review-material-icon">bolt</span><span>Store count<br/><b>{stores.length || 1} location</b></span></div></aside>
        </section>
      </main>
    </div>

    {moderationTarget && <div className="review-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModeration(); }}><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title"><div className="review-modal-accent"/><header className="review-modal-header"><div className="review-modal-icon"><span className="review-material-icon">visibility_off</span></div><div className="review-modal-title-wrap"><div className="review-modal-title-row"><h2 id="review-modal-title">{moderationTarget.action === 'violation' ? 'Confirm Review Violation' : 'Hide Customer Review'}</h2><button className="review-modal-close" aria-label="Close dialog" onClick={closeModeration}><span className="review-material-icon">close</span></button></div><p>Confirm hiding this review from public product listings and store display screens.</p></div></header><div className="review-modal-body"><div className="review-modal-summary"><div className="review-modal-summary-top"><b>{targetReview.customerId?.fullName || 'Customer'}</b><span className={`review-status ${targetReview.status}`}>{targetReview.status === 'visible' ? 'Published' : 'Hidden'}</span></div><div className="review-admin-product"><span className="review-material-icon">inventory_2</span><b>{targetReview.productId?.name || targetReview.storeId?.name || 'Store review'}</b><span className="review-admin-rating">★ {targetReview.rating.toFixed(1)}</span></div><p>“{targetReview.comment || 'No written comment.'}”</p></div><fieldset className="review-reason-fieldset"><legend>Reason for Hiding <span>*</span><small>Required for audit log</small></legend><div className="review-reason-list">{HIDE_REASONS.map((reason) => <label className={`review-reason-option ${moderationReason === reason.value ? 'selected' : ''}`} key={reason.value}><input type="radio" name="hide-reason" value={reason.value} checked={moderationReason === reason.value} onChange={() => setModerationReason(reason.value)} /><span className="review-radio-mark"/><span><b>{reason.label}</b><small>{reason.detail}</small></span></label>)}</div></fieldset><label className="review-label review-notes-label">Moderator Internal Notes <span>Optional · Max 500 chars</span><textarea maxLength={500} rows={3} placeholder="Enter internal rationale for hiding this review…" value={moderatorNotes} onChange={(event) => setModeratorNotes(event.target.value)}/></label><div className="review-impact"><span className="review-material-icon">info</span><div><b>Impact on Product Score</b><p>Hiding this review removes its rating from the public product average. The review remains preserved in the admin audit ledger.</p></div></div><label className="review-compliance"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>I confirm that hiding this review complies with customer feedback moderation guidelines.</span></label></div><footer className="review-modal-footer"><div className="review-modal-buttons"><button className="review-button secondary" onClick={closeModeration}>Cancel</button><button className="review-button danger" disabled={!moderationReason || !confirmed || busyId === targetReview._id} onClick={confirmModeration}><span className="review-material-icon">visibility_off</span>{busyId === targetReview._id ? 'Hiding Review…' : 'Confirm & Hide Review'}</button></div><div className="review-audit-stamp"><span className="review-material-icon">verified_user</span>Action logged under your administrator account</div></footer></section></div>}

  </div>;
}
