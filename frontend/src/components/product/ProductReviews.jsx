import { useCallback, useEffect, useState } from 'react';
import { listProductReviews } from '../../api/review.api';
import Icon from '../common/Icon';

// Hiển thị số sao (kể cả số lẻ)
export function Stars({ value = 0, size = 18 }) {
    const pct = Math.max(0, Math.min(5, value)) * 20;
    return (
        <span className="pd-stars" style={{ fontSize: size }} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
            <span className="base">★★★★★</span><span className="fill" style={{ width: `${pct}%` }}>★★★★★</span>
        </span>
    );
}

// Định dạng ngày đánh giá
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US');
const PAGE = 5;

// UC-40.1 Điểm trung bình và danh sách đánh giá của sản phẩm
export default function ProductReviews({ productId, ratingAvg = 0, ratingCount = 0 }) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (p) => {
        setLoading(true);
        try {
            const { data } = await listProductReviews(productId, { page: p, limit: PAGE });
            setItems((cur) => (p === 1 ? data.items : [...cur, ...data.items]));
            setPage(data.page); setPages(data.pages || 1); setError('');
        } catch { setError('Unable to load reviews. Please try again.'); }
        finally { setLoading(false); }
    }, [productId]);

    useEffect(() => { setItems([]); load(1); }, [load]);

    return (
        <section className="pd-section" id="danh-gia" aria-labelledby="pd-reviews-title">
            <h2 id="pd-reviews-title">Customer reviews</h2>
            <div className="pd-rating-box">
                <div className="pd-rating-score"><strong>{ratingCount ? ratingAvg.toFixed(1) : '—'}</strong><Stars value={ratingAvg} size={20} /><span>{ratingCount ? `${ratingCount} reviews` : 'No reviews yet'}</span></div>
                <p className="pd-hint">Only customers who have collected an order containing this product can review it. The reviews below are from verified buyers.</p>
            </div>

            {error && <p className="pd-alert" role="alert">{error} <button className="pd-link" onClick={() => load(page)}>Try again</button></p>}
            {!error && !loading && items.length === 0 && <p className="pd-empty"><Icon name="rate_review" size="lg" /><span>No reviews for this product yet.</span></p>}

            <ul className="pd-reviews">
                {items.map((r) => (
                    <li key={r._id}>
                        <div className="pd-rv-head">
                            <span className="pd-avatar">{(r.customerId?.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                            <div><b>{r.customerId?.fullName || 'Customer'}</b><small>{fmtDate(r.createdAt)}{r.orderId ? ' · Verified purchase' : ''}</small></div>
                            <Stars value={r.rating} size={16} />
                        </div>
                        {r.comment && <p>{r.comment}</p>}
                    </li>
                ))}
            </ul>

            {loading && <p className="pd-hint">Loading reviews...</p>}
            {!loading && page < pages && <button className="pd-more" onClick={() => load(page + 1)}>Load more reviews</button>}
        </section>
    );
}
