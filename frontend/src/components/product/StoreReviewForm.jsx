import { useEffect, useState } from 'react';
import { listStores } from '../../api/store.api';
import { addReview } from '../../api/review.api';

// Form đánh giá cửa hàng
export default function StoreReviewForm({ onSubmitted }) {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({ storeId: '', rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    listStores().then(({ data }) => {
      if (!active) return;
      const items = data.items || data;
      setStores(items);
      setForm((current) => ({ ...current, storeId: current.storeId || items[0]?._id || '' }));
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load stores. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await addReview({ targetType: 'store', ...form, comment: form.comment.trim() });
      setForm((current) => ({ ...current, rating: 5, comment: '' }));
      setNotice('Your store review has been submitted.');
      await onSubmitted();
    } catch (err) { setError(err.response?.data?.message || 'Unable to submit your store review. Please try again.'); }
    finally { setBusy(false); }
  };

  return <section className="review-section">
    <div className="review-section-title"><div><h2>Review a store</h2><p>Tell us about your visit and the service you received.</p></div></div>
    {error && <p className="review-alert error" role="alert">{error} <button type="button" onClick={() => setReload((value) => value + 1)} disabled={busy || loading}>Reload stores</button></p>}
    {notice && <p className="review-alert success" role="status">{notice}</p>}
    {loading ? <p role="status">Loading stores...</p> : stores.length === 0 ? <p className="review-empty">No stores available to review.</p> :
      <form className="review-card" onSubmit={submit}>
        <label className="review-label">Store<select required disabled={busy} value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}>
          {stores.map((store) => <option key={store._id} value={store._id}>{store.name}{store.address ? ` - ${store.address}` : ''}</option>)}
        </select></label>
        <label className="review-label">Your rating<select disabled={busy} value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}
        </select></label>
        <label className="review-label">Your comment (optional)<textarea disabled={busy} rows={3} maxLength={1000} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label>
        <div className="review-card-footer"><small>{form.comment.length}/1000 characters</small><button className="review-button" disabled={busy || !form.storeId}>{busy ? 'Submitting...' : 'Submit store review'}</button></div>
      </form>}
  </section>;
}
