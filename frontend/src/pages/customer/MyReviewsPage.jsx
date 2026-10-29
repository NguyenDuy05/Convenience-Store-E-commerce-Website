import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Clock3, CheckCircle2, Search, Pencil, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { addReview, deleteReview, listEligibleReviews, listMyReviews, updateReview } from '../../api/review.api';
import '../../styles/style.css';
import '../../styles/my-reviews.css';

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
function RatingInput({ name, value, disabled, onChange }) {
  return <fieldset className="my-review-rating" disabled={disabled}>
    <legend>Your rating</legend>
    <div>{[1, 2, 3, 4, 5].map((star) => <label key={star} className={value >= star ? 'filled' : ''}>
      <input type="radio" name={name} value={star} checked={Number(value) === star} onChange={() => onChange(star)} aria-label={`${star} ${star === 1 ? 'star' : 'stars'} — ${RATING_LABELS[star - 1]}`} />
      <Star size={26} aria-hidden="true" />
    </label>)}<span>{RATING_LABELS[value - 1]}</span></div>
  </fieldset>;
}

const messageOf = (error) => error.response?.data?.message || 'Unable to load reviews. Please try again.';

export default function MyReviewsPage() {
  const [eligible, setEligible] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const visibleReviews = reviews.filter((review) => (filter === 'all' || review.status === filter)
    && `${review.productId?.name || review.storeId?.name || 'Store review'} ${review.comment || ''} ${review.orderId?.orderCode || ''}`.toLowerCase().includes(query.toLowerCase().trim()));
  const published = reviews.filter((review) => review.status === 'visible').length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eligibleResponse, reviewsResponse] = await Promise.all([listEligibleReviews(), listMyReviews()]);
      setEligible(eligibleResponse.data);
      setReviews(reviewsResponse.data);
      setError('');
    } catch (err) { setError(messageOf(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setDraft = (key, changes) => setDrafts((current) => ({
    ...current,
    [key]: { rating: 5, comment: '', ...current[key], ...changes },
  }));

  const submitNew = async (item) => {
    const key = `${item.orderId}:${item.productId}`;
    const draft = drafts[key] || { rating: 5, comment: '' };
    setBusy(true); setError(''); setNotice('');
    try {
      await addReview({ targetType: 'product', orderId: item.orderId, productId: item.productId, ...draft });
      setNotice('Your product review has been submitted.');
      setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      await load();
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  };

  const saveEdit = async (review) => {
    if (busy) return;
    const draft = drafts[review._id];
    if (!draft || !Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5 || draft.comment.trim().length > 1000) {
      setError('Choose 1–5 stars and enter a comment of 1,000 characters or fewer.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await updateReview(review._id, { rating: draft.rating, comment: draft.comment.trim() });
      setReviews((current) => current.map((item) => item._id === review._id
        ? { ...item, rating: data.rating, comment: data.comment, updatedAt: data.updatedAt } : item));
      setEditing(null);
      setNotice('Your review has been updated.');
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  };

  const remove = async (review) => {
    if (!window.confirm('Delete this review?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteReview(review._id);
      setNotice('Your review has been deleted.');
      await load();
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  };

  return (
    <section className="review-page my-reviews">
      <nav className="my-review-breadcrumb" aria-label="Breadcrumb"><Link to="/profile">My account</Link><span>/</span><span aria-current="page">Reviews</span></nav>
      <header className="review-heading">
        <div><p className="review-eyebrow">CUSTOMER FEEDBACK</p><h1>My Reviews</h1>
          <p className="review-subtitle">Share your experience after picking up your order in store.</p></div>
        <Link to="/orders" className="my-review-orders">View my orders <ArrowRight size={16} /></Link>
      </header>
      <div className="my-review-summary">
        {[{ icon: MessageSquare, label: 'Total reviews', value: reviews.length, tone: 'blue' }, { icon: CheckCircle2, label: 'Published', value: published, tone: 'green' }, { icon: Clock3, label: 'Awaiting your review', value: eligible.length, tone: 'amber' }].map(({ icon: Icon, label, value, tone }) => <div className={`my-review-stat ${tone}`} key={label}><span className="my-review-stat-icon"><Icon size={21} /></span><div><span>{label}</span><strong>{loading ? '—' : value}</strong></div></div>)}
      </div>
      {error && <p className="review-alert error" role="alert">{error}</p>}
      {notice && <p className="review-alert success" role="status">{notice}</p>}

      <section className="review-section">
        <div className="review-section-title"><div><h2>Ready for your review <span className="my-review-total">{eligible.length}</span></h2><p>A quick review helps other shoppers find their next favorite.</p></div><ShoppingBag size={22} aria-hidden="true" /></div>
        {loading ? <p className="review-empty">Loading reviews…</p> : eligible.length === 0 ? (
          <div className="review-empty"><span aria-hidden="true">✓</span><b>You’ve reviewed all eligible products</b><p>You can review products after your order is marked as picked up in store.</p></div>
        ) : <div className="review-grid">{eligible.map((item) => {
          const key = `${item.orderId}:${item.productId}`;
          const draft = drafts[key] || { rating: 5, comment: '' };
          return <article className="review-card" key={key}>
            <div className="review-card-meta"><span>Order {item.orderCode}</span><span>{item.pickedUpAt ? new Date(item.pickedUpAt).toLocaleDateString('en-US') : ''}</span></div>
            <h3>{item.productName}</h3>
            <RatingInput name={`new-${key}`} value={draft.rating} disabled={busy} onChange={(rating) => setDraft(key, { rating })} />
            <label className="review-label">Your comment <span className="my-review-optional">Optional</span><textarea disabled={busy} maxLength={1000} rows={3} placeholder="How was the quality, taste or value?" value={draft.comment} onChange={(event) => setDraft(key, { comment: event.target.value })} /></label>
            <div className="review-card-footer"><small>{draft.comment.length}/1000 characters</small><button className="review-button" disabled={busy} onClick={() => submitNew(item)}>Submit review</button></div>
          </article>;
        })}</div>}
      </section>

      <section className="review-section">
        <div className="review-section-title"><div><h2>Your reviews</h2><p>All your feedback, in one place. Edit published reviews anytime.</p></div></div>
        <div className="my-review-toolbar"><div className="my-review-filters" role="group" aria-label="Filter reviews">{[['all', 'All reviews', reviews.length], ['visible', 'Published', published], ['hidden', 'Hidden', reviews.length - published]].map(([value, label, count]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div><label className="my-review-search"><Search size={17} aria-hidden="true" /><input aria-label="Search your reviews" placeholder="Search product or comment…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        {loading ? <p className="review-empty" role="status">Loading your reviews…</p> : reviews.length === 0 ? <div className="review-empty compact"><MessageSquare size={26} /><b>Your story starts here</b><p>Reviews you submit will appear here.</p></div> : visibleReviews.length === 0 ? <div className="review-empty compact"><Search size={24} /><b>No matching reviews</b><p>Try another search or filter.</p><button className="review-button secondary" onClick={() => { setFilter('all'); setQuery(''); }}>Clear filters</button></div> : <div className="review-list">{visibleReviews.map((review) => {
          const isEditing = editing === review._id;
          const draft = drafts[review._id] || { rating: review.rating, comment: review.comment || '' };
          return <article className="review-list-item" key={review._id}>
            <div className="review-list-top"><div className="my-review-product"><span className="my-review-product-image">{review.productId?.images?.[0] ? <img src={review.productId.images[0]} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ShoppingBag size={23} />}</span><div><h3>{review.productId?.name || review.storeId?.name || 'Store review'}</h3><span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></span>{review.orderId?.orderCode && <span className="my-review-verified"><ShieldCheck size={12} /> Verified purchase</span>}</div></div><span className={`review-status ${review.status}`}>{review.status === 'hidden' ? 'Hidden' : 'Published'}</span></div>
            {review.status === 'hidden' && <p className="my-review-hidden-note">This review is hidden from public view and cannot be edited.</p>}
            {isEditing ? <>
              <div className="my-review-edit-heading"><Pencil size={14} /> Editing your review</div>
              <RatingInput name={`edit-${review._id}`} value={draft.rating} disabled={busy} onChange={(rating) => setDraft(review._id, { rating })} />
              <label className="review-label">Comment<textarea disabled={busy} maxLength={1000} rows={3} value={draft.comment} onChange={(event) => setDraft(review._id, { comment: event.target.value })} /></label>
              <small>{draft.comment.length}/1000 characters</small>
              <div className="review-actions"><button className="review-button" disabled={busy} onClick={() => saveEdit(review)}>{busy ? 'Saving…' : 'Save changes'}</button><button className="review-button secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
            </> : <><p className="review-comment">{review.comment || 'No comment.'}</p><div className="review-list-bottom"><small>{review.orderId?.orderCode ? `Order ${review.orderId.orderCode} · ` : ''}{new Date(review.updatedAt).toLocaleDateString('en-US')}</small>{review.status === 'visible' && <div className="review-actions"><button className="review-button secondary" disabled={busy} onClick={() => { setDrafts((current) => ({ ...current, [review._id]: { rating: review.rating, comment: review.comment || '' } })); setEditing(review._id); }}>Edit</button><button className="review-button danger" disabled={busy} onClick={() => remove(review)}>Delete</button></div>}</div></>}
          </article>;
        })}</div>}
      </section>
    </section>
  );
}
