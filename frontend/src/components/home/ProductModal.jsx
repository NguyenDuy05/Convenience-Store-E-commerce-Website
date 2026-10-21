import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../../api/product.api';
import { Icon, Media } from './HomeParts';
import { MEAL_LABEL, bestPromo, promoApplies, discountOf, promoValueText, stockState, money } from './homeConfig';

// View Product Details: opens instantly with list data, then refreshes from the API
export default function ProductModal({ product, cat, promos, related, onClose, onOpen }) {
    const [p, setP] = useState(product);
    const closeRef = useRef(null);

    useEffect(() => {
        setP(product);
        let alive = true;
        getProduct(product._id).then((r) => alive && setP({ ...product, ...r.data })).catch(() => { });
        return () => { alive = false; };
    }, [product]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);

    const deal = bestPromo(p, promos);
    const stock = stockState(p);
    const applicable = promos.filter((x) => promoApplies(x, p));

    return (
        <div className="hp-modal" role="dialog" aria-modal="true" aria-label={p.name}>
            <div className="hp-backdrop" onClick={onClose} />
            <div className="hp-sheet">
                <span className="hp-grab" />
                <button ref={closeRef} type="button" className="hp-b hp-x" onClick={onClose} aria-label="Close"><Icon name="close" /></button>

                <div className="hp-sheet-media">
                    <Media product={p} cat={cat} />
                    {deal && <span className="hp-off">-{deal.percent}%</span>}
                </div>

                <div className="hp-sheet-info">
                    <div className="hp-chips">
                        <span className="hp-chip">{p.categoryId?.name}</span>
                        {p.mealType && <span className="hp-chip">{MEAL_LABEL[p.mealType]}</span>}
                        <span className="hp-chip mono">{p.sku}</span>
                    </div>
                    <h2>{p.name}</h2>
                    <div className="hp-rate">
                        <Icon name="star" size="md" />
                        {p.ratingCount > 0 ? <span><b>{Number(p.ratingAvg).toFixed(1)}</b> ({p.ratingCount} {p.ratingCount === 1 ? 'review' : 'reviews'})</span> : <span>No reviews yet</span>}
                    </div>

                    <div className="hp-pricebox">
                        <span className="hp-price big">{money(deal ? deal.finalPrice : p.price)}</span>
                        {deal && <s className="hp-was">{money(p.price)}</s>}
                        <span className="hp-unit">/ {p.unit}</span>
                    </div>
                    <div className={`hp-stock ${stock.cls}`}><i /> {stock.text}</div>

                    <p className="hp-desc">{p.description || 'Fresh and ready for pickup at the store. A detailed description will be added soon.'}</p>

                    {applicable.length > 0 && (
                        <div className="hp-applied">
                            <b><Icon name="local_offer" size="md" /> Available promotions</b>
                            {applicable.map((x) => (
                                <div key={x._id} className="hp-applied-row">
                                    <span>{x.name}</span><em>{promoValueText(x)} · save {money(discountOf(x, p.price))}</em>
                                </div>
                            ))}
                            <small>Shown for reference. Discounts are applied at checkout.</small>
                        </div>
                    )}

                    <Link to={`/products/${p._id}`} className="hp-cta ghost">Open full page <Icon name="open_in_new" size="md" /></Link>
                </div>

                {related.length > 0 && (
                    <div className="hp-related">
                        <b>More from this category</b>
                        <div>
                            {related.map((r) => (
                                <button type="button" key={r._id} className="hp-b hp-rel" onClick={() => onOpen(r)}>
                                    <span>{r.name}</span><em>{money(r.price)}</em>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}