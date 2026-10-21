import { useCallback, useEffect, useState } from 'react';
import { addReview, deleteReview, listEligibleReviews, listMyReviews, updateReview } from '../../api/review.api';
import '../../styles/style.css';

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
    setBusy(true); setError(''); setNotice('');
    try {
      await updateReview(review._id, drafts[review._id]);
      setEditing(null);
      setNotice('Your review has been updated.');
      await load();
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
    <section className="review-page">
      <header className="review-heading">
        <div><p className="review-eyebrow">CUSTOMER FEEDBACK</p><h1>My Reviews</h1>
          <p className="review-subtitle">Share your experience after picking up your order in store.</p></div>
        <span className="review-count">{reviews.length} reviews</span>
      </header>
      {error && <p className="review-alert error" role="alert">{error}</p>}
      {notice && <p className="review-alert success" role="status">{notice}</p>}

      <section className="review-section">
        <div className="review-section-title"><div><h2>Products you’ve picked up</h2><p>Completed orders will appear here.</p></div></div>
        {loading ? <p className="review-empty">Loading reviews…</p> : eligible.length === 0 ? (
          <div className="review-empty"><span aria-hidden="true">✓</span><b>You’ve reviewed all eligible products</b><p>You can review products after your order is marked as picked up in store.</p></div>
        ) : <div className="review-grid">{eligible.map((item) => {
          const key = `${item.orderId}:${item.productId}`;
          const draft = drafts[key] || { rating: 5, comment: '' };
          return <article className="review-card" key={key}>
            <div className="review-card-meta"><span>Order {item.orderCode}</span><span>{item.pickedUpAt ? new Date(item.pickedUpAt).toLocaleDateString('en-US') : ''}</span></div>
            <h3>{item.productName}</h3>
            <label className="review-label">Your rating
              <span className="review-stars-input" role="radiogroup" aria-label="Choose a star rating">{[1, 2, 3, 4, 5].map((star) => <button type="button" role="radio" aria-checked={Number(draft.rating) === star} aria-label={`${star} stars`} className={Number(draft.rating) >= star ? 'selected' : ''} key={star} onClick={() => setDraft(key, { rating: star })}>★</button>)}</span>
            </label>
            <label className="review-label">Your comment<textarea maxLength={1000} rows={3} placeholder="Did the product meet your expectations?" value={draft.comment} onChange={(event) => setDraft(key, { comment: event.target.value })} /></label>
            <div className="review-card-footer"><small>{draft.comment.length}/1000 characters</small><button className="review-button" disabled={busy} onClick={() => submitNew(item)}>Submit review</button></div>
          </article>;
        })}</div>}
      </section>

      <section className="review-section">
        <div className="review-section-title"><div><h2>Review history</h2><p>You can edit or delete your reviews.</p></div></div>
        {loading ? <p className="review-empty">Loading reviews…</p> : reviews.length === 0 ? <p className="review-empty compact">You haven’t submitted any reviews yet.</p> : <div className="review-list">{reviews.map((review) => {
          const isEditing = editing === review._id;
          const draft = drafts[review._id] || { rating: review.rating, comment: review.comment || '' };
          return <article className="review-list-item" key={review._id}>
            <div className="review-list-top"><div><span className="review-stars">{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></span><h3>{review.productId?.name || review.storeId?.name || 'Store review'}</h3></div><span className={`review-status ${review.status}`}>{review.status === 'hidden' ? 'Hidden' : 'Published'}</span></div>
            {isEditing ? <>
              <label className="review-label">Rating<select value={draft.rating} onChange={(event) => setDraft(review._id, { rating: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label>
              <label className="review-label">Comment<textarea maxLength={1000} rows={3} value={draft.comment} onChange={(event) => setDraft(review._id, { comment: event.target.value })} /></label>
              <div className="review-actions"><button className="review-button" disabled={busy} onClick={() => saveEdit(review)}>Save changes</button><button className="review-button secondary" onClick={() => setEditing(null)}>Cancel</button></div>
            </> : <><p className="review-comment">{review.comment || 'No comment.'}</p><div className="review-list-bottom"><small>{review.orderId?.orderCode ? `Order ${review.orderId.orderCode} · ` : ''}{new Date(review.updatedAt).toLocaleDateString('en-US')}</small>{review.status === 'visible' && <div className="review-actions"><button className="review-button secondary" disabled={busy} onClick={() => { setDrafts((current) => ({ ...current, [review._id]: { rating: review.rating, comment: review.comment || '' } })); setEditing(review._id); }}>Edit</button><button className="review-button danger" disabled={busy} onClick={() => remove(review)}>Delete</button></div>}</div></>}
          </article>;
        })}</div>}
      </section>
    </section>
  );
}
