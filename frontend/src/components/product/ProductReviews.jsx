import { useCallback, useEffect, useState } from 'react';
import { listProductReviews } from '../../api/review.api';
import Icon from '../common/Icon';

// Hiển thị sao (cho phép số lẻ, ví dụ 4.3)
export function Stars({ value = 0, size = 18 }) {
    const pct = Math.max(0, Math.min(5, value)) * 20;
    return (
        <span className="pd-stars" style={{ fontSize: size }} role="img" aria-label={`${value.toFixed(1)} trên 5 sao`}>
            <span className="base">★★★★★</span><span className="fill" style={{ width: `${pct}%` }}>★★★★★</span>
        </span>
    );
}

const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
const PAGE = 5;

// UC-40.1 View Product Reviews (công khai): điểm trung bình lấy từ sản phẩm, danh sách tải thêm theo trang.
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
        } catch { setError('Không tải được đánh giá. Vui lòng thử lại.'); }
        finally { setLoading(false); }
    }, [productId]);

    useEffect(() => { setItems([]); load(1); }, [load]);

    return (
        <section className="pd-section" id="danh-gia" aria-labelledby="pd-reviews-title">
            <h2 id="pd-reviews-title">Đánh giá từ khách hàng</h2>
            <div className="pd-rating-box">
                <div className="pd-rating-score"><strong>{ratingCount ? ratingAvg.toFixed(1) : '—'}</strong><Stars value={ratingAvg} size={20} /><span>{ratingCount ? `${ratingCount} đánh giá` : 'Chưa có đánh giá'}</span></div>
                <p className="pd-hint">Chỉ khách đã nhận đơn hàng chứa sản phẩm này mới có thể đánh giá, nên mọi đánh giá bên dưới đều từ người đã mua.</p>
            </div>

            {error && <p className="pd-alert" role="alert">{error} <button className="pd-link" onClick={() => load(page)}>Thử lại</button></p>}
            {!error && !loading && items.length === 0 && <p className="pd-empty"><Icon name="rate_review" size="lg" /><span>Chưa có đánh giá nào cho sản phẩm này.</span></p>}

            <ul className="pd-reviews">
                {items.map((r) => (
                    <li key={r._id}>
                        <div className="pd-rv-head">
                            <span className="pd-avatar">{(r.customerId?.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                            <div><b>{r.customerId?.fullName || 'Khách hàng'}</b><small>{fmtDate(r.createdAt)}{r.orderId ? ' · Đã mua hàng' : ''}</small></div>
                            <Stars value={r.rating} size={16} />
                        </div>
                        {r.comment && <p>{r.comment}</p>}
                    </li>
                ))}
            </ul>

            {loading && <p className="pd-hint">Đang tải đánh giá…</p>}
            {!loading && page < pages && <button className="pd-more" onClick={() => load(page + 1)}>Xem thêm đánh giá</button>}
        </section>
    );
}