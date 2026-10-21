import { CATEGORY_IMAGES, catMeta, productImage, promoValueText, scopeText, daysLeft, money } from './homeConfig';

export const Icon = ({ name, size = '' }) => <span className={`hp-icon ${size}`} aria-hidden="true">{name}</span>;

// Ô ảnh: có ảnh thì hiện ảnh, chưa có thì hiện ô trống theo màu danh mục
export function Media({ product, cat }) {
    const src = productImage(product);
    if (src) return <img className="hp-img" src={src} alt={product.name} loading="lazy" />;
    const m = catMeta(cat?.slug);
    return <span className="hp-ph" style={{ '--tint': m.tint }}><Icon name={m.icon} size="xl" /></span>;
}

// Product card (View Products)
export function ProductTile({ product, cat, deal, onOpen }) {
    const out = (product.stockQuantity ?? 0) <= 0;
    return (
        <button type="button" className={`hp-b hp-card ${out ? 'is-out' : ''}`} onClick={() => onOpen(product)}>
            <span className="hp-card-media">
                <Media product={product} cat={cat} />
                {deal && <span className="hp-off">-{deal.percent}%</span>}
                {out && <span className="hp-flag">Out of stock</span>}
            </span>
            <span className="hp-card-body">
                <span className="hp-card-cat">{product.categoryId?.name}</span>
                <span className="hp-card-name">{product.name}</span>
                <span className="hp-card-foot">
                    <span className="hp-price">{money(deal ? deal.finalPrice : product.price)}</span>
                    {deal && <s className="hp-was">{money(product.price)}</s>}
                    <span className="hp-unit">/ {product.unit}</span>
                </span>
            </span>
            <span className="hp-shelf" aria-hidden="true" />
        </button>
    );
}

// Promotion card (View Promotions)
export function PromoCard({ promo, active, onPick }) {
    const left = daysLeft(promo.endDate);
    return (
        <article className={`hp-promo ${active ? 'is-active' : ''}`}>
            <div className="hp-tag">{promoValueText(promo)}</div>
            <div className="hp-promo-body">
                <h3>{promo.name}</h3>
                {promo.description && <p>{promo.description}</p>}
                <div className="hp-chips">
                    <span className="hp-chip"><Icon name="sell" size="sm" /> {scopeText(promo)}</span>
                    <span className="hp-chip"><Icon name="schedule" size="sm" /> {left > 1 ? `${left} days left` : left === 1 ? '1 day left' : 'Ends today'}</span>
                </div>
                <button type="button" className="hp-b hp-link" onClick={() => onPick(promo)}>
                    {active ? 'Clear filter' : 'Shop applicable items'} <Icon name={active ? 'close' : 'arrow_forward'} size="md" />
                </button>
            </div>
        </article>
    );
}

// Hanging aisle sign for a category
export function CategorySign({ cat, count, active, onClick }) {
    const m = catMeta(cat?.slug);
    const img = cat ? CATEGORY_IMAGES[cat.slug] : '';
    return (
        <button type="button" className={`hp-b hp-sign ${active ? 'on' : ''}`} onClick={onClick} aria-pressed={active}>
            <span className="hp-sign-ico" style={{ '--tint': m.tint }}>
                {img ? <img src={img} alt="" /> : <Icon name={cat ? m.icon : 'apps'} />}
            </span>
            <span className="hp-sign-name">{cat ? cat.name : 'All'}</span>
            <small>{count}</small>
        </button>
    );
}