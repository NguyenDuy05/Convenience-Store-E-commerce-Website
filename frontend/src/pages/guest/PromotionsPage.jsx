import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPromotions } from '../../api/promotion.api';
import { listProducts } from '../../api/product.api';
import { listStores } from '../../api/store.api';
import HomeHeader from '../../components/home/HomeHeader';
import HomeFooter from '../../components/home/HomeFooter';
import ProductSearchInput from '../../components/home/ProductSearchInput';
import { bestPromo, scopeText } from '../../components/home/homeConfig';
import { formatCurrency } from '../../utils/format';
import '../../styles/home.css';
import '../../styles/promo-list.css';

const Icon = ({ children }) => <span className="deals-icon" aria-hidden="true">{children}</span>;
const promoValue = (promotion) => promotion.type === 'percent'
  ? `${promotion.value}% OFF`
  : `Giảm ${formatCurrency(promotion.value)}`;
const promoScore = (promotion) => promotion.type === 'percent' ? Number(promotion.value) : Number(promotion.value) / 1000;
const endsInDays = (endDate) => Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
const dateLabel = (value) => new Date(value).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });

function DealProductCard({ deal }) {
  const { product, offer } = deal;
  return (
    <article className="deal-product-card">
      <Link className="deal-product-image" to={`/products/${product._id}`} aria-label={`Xem ${product.name}`}>
        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <span className="deal-image-placeholder"><Icon>local_offer</Icon></span>}
        <span className="deal-discount-badge">{offer.promo.type === 'percent' ? `-${offer.percent}%` : `-${formatCurrency(offer.amount)}`}</span>
      </Link>
      <div className="deal-product-body">
        <span className="deal-product-meta">{product.categoryId?.name || 'Ưu đãi cửa hàng'}</span>
        <Link className="deal-product-name" to={`/products/${product._id}`}>{product.name}</Link>
        <div className="deal-price-row"><strong>{formatCurrency(offer.finalPrice)}</strong><del>{formatCurrency(product.price)}</del></div>
        <div className="deal-product-foot"><span><i />{Number(product.stockQuantity) > 0 ? 'Còn hàng' : 'Hết hàng'}</span><Link to={`/products/${product._id}`} aria-label={`Chi tiết ${product.name}`}><Icon>arrow_forward</Icon></Link></div>
      </div>
    </article>
  );
}

function CampaignCard({ promotion, index }) {
  const remaining = endsInDays(promotion.endDate);
  return (
    <article className={`campaign-card campaign-${index % 2}`}>
      <div className="campaign-copy">
        <span className="campaign-label"><Icon>{index % 2 ? 'sell' : 'local_fire_department'}</Icon>{index % 2 ? 'Ưu đãi nổi bật' : 'Đang diễn ra'}</span>
        <h2>{promoValue(promotion)}</h2>
        <h3>{promotion.name}</h3>
        <p>{promotion.description || `Ưu đãi ${scopeText(promotion)}. Đặt trước và nhận hàng nhanh tại cửa hàng.`}</p>
        <div className="campaign-bottom"><span><Icon>event_available</Icon>Đến {dateLabel(promotion.endDate)}</span><Link to="#best-deals">Khám phá ưu đãi <Icon>arrow_forward</Icon></Link></div>
      </div>
      <div className="campaign-art" aria-hidden="true"><span className="campaign-orbit orbit-one" /><span className="campaign-orbit orbit-two" /><span className="campaign-art-icon"><Icon>{index % 2 ? 'shopping_basket' : 'bolt'}</Icon></span><b>{promotion.type === 'percent' ? `${promotion.value}%` : 'DEAL'}</b></div>
      {remaining <= 3 && <span className="campaign-limited"><Icon>schedule</Icon>{remaining === 0 ? 'Kết thúc hôm nay' : `Còn ${remaining} ngày`}</span>}
    </article>
  );
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [store, setStore] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('discount');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    Promise.allSettled([listPromotions(), listProducts({ limit: 100 }), listStores()]).then(([promoResult, productResult, storeResult]) => {
      if (!current) return;
      if (promoResult.status === 'fulfilled') setPromotions(promoResult.value.data.items || []);
      else setError('Không tải được khuyến mãi. Vui lòng thử lại.');
      if (productResult.status === 'fulfilled') {
        const rows = productResult.value.data.items || [];
        setProducts(rows);
        setCategories([...new Map(rows.filter((p) => p.categoryId?._id).map((p) => [p.categoryId._id, p.categoryId])).values()]);
      }
      if (storeResult.status === 'fulfilled') setStore(storeResult.value.data?.[0] || null);
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const deals = useMemo(() => products.map((product) => ({ product, offer: bestPromo(product, promotions) }))
    .filter((deal) => deal.offer && deal.offer.amount > 0), [products, promotions]);
  const dealProducts = useMemo(() => deals.map(({ product }) => product), [deals]);
  const visibleDeals = useMemo(() => {
    let rows = deals.filter(({ product, offer }) => {
      if (filter === 'storewide' && offer.promo.scope !== 'all') return false;
      if (filter === 'category' && offer.promo.scope !== 'category') return false;
      if (filter === 'product' && offer.promo.scope !== 'product') return false;
      if (filter === 'ending' && endsInDays(offer.promo.endDate) > 3) return false;
      if (query.trim() && !`${product.name} ${product.sku || ''} ${product.categoryId?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
    if (sort === 'price-asc') rows = [...rows].sort((a, b) => a.offer.finalPrice - b.offer.finalPrice);
    if (sort === 'price-desc') rows = [...rows].sort((a, b) => b.offer.finalPrice - a.offer.finalPrice);
    if (sort === 'ending') rows = [...rows].sort((a, b) => new Date(a.offer.promo.endDate) - new Date(b.offer.promo.endDate));
    if (sort === 'discount') rows = [...rows].sort((a, b) => b.offer.percent - a.offer.percent);
    return rows;
  }, [deals, filter, query, sort]);

  const featuredPromotions = useMemo(() => [...promotions].sort((a, b) => promoScore(b) - promoScore(a)).slice(0, 2), [promotions]);
  const endingDeals = useMemo(() => deals.filter(({ offer }) => endsInDays(offer.promo.endDate) <= 3)
    .sort((a, b) => new Date(a.offer.promo.endDate) - new Date(b.offer.promo.endDate)).slice(0, 3), [deals]);
  const bestPercent = promotions.reduce((best, promotion) => Math.max(best, promotion.type === 'percent' ? Number(promotion.value) : 0), 0);
  const bestFixed = promotions.reduce((best, promotion) => Math.max(best, promotion.type === 'fixed' ? Number(promotion.value) : 0), 0);
  const bestDiscount = bestPercent ? `-${bestPercent}%` : bestFixed ? `-${formatCurrency(bestFixed)}` : '—';
  const filters = [
    ['all', 'Tất cả ưu đãi', promotions.length],
    ['storewide', 'Toàn cửa hàng', promotions.filter((p) => p.scope === 'all').length],
    ['category', 'Theo danh mục', promotions.filter((p) => p.scope === 'category').length],
    ['product', 'Sản phẩm chọn lọc', promotions.filter((p) => p.scope === 'product').length],
    ['ending', 'Sắp kết thúc', promotions.filter((p) => endsInDays(p.endDate) <= 3).length],
  ];

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/products${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`);
  };
  const goToSection = (section) => {
    if (section === 'products') navigate('/products');
    else if (section === 'promotions') navigate('/promotions');
    else navigate(section === 'store' ? '/#store' : '/');
  };

  return (
    <div className="deals-shell">
      <HomeHeader store={store} info={null} q={query} setQ={setQuery} active="promotions" onNav={goToSection} onSearch={submitSearch} products={products} />

      <main className="deals-page">
        <div className="deals-context-row">
          <nav className="deals-breadcrumb" aria-label="Breadcrumb"><Link to="/"><Icon>home</Icon>Trang chủ</Link><Icon>chevron_right</Icon><span>Khuyến mãi</span></nav>
          <span className="deals-live"><i />Ưu đãi đang áp dụng</span>
        </div>

        <section className="deals-intro">
          <div><span className="deals-eyebrow">Ưu đãi tại cửa hàng</span><h1>Khuyến mãi mỗi ngày</h1><p>Chọn ưu đãi yêu thích và nhận hàng nhanh tại cửa hàng.</p></div>
          <div className="deals-stats">
            <div><span className="deals-stat-icon"><Icon>campaign</Icon></span><div><small>Ưu đãi hiện có</small><strong>{promotions.length}</strong></div></div>
            <div><span className="deals-stat-icon green"><Icon>sell</Icon></span><div><small>Sản phẩm có ưu đãi</small><strong>{deals.length}</strong></div></div>
            <div><span className="deals-stat-icon yellow"><Icon>savings</Icon></span><div><small>Mức giảm cao nhất</small><strong>{bestDiscount}</strong></div></div>
          </div>
        </section>

        <nav className="deals-filter-bar" aria-label="Lọc ưu đãi">
          <div className="deals-filter-tabs">{filters.map(([key, label, count]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<span>{count}</span></button>)}</div>
          <span className="deals-inventory"><i />Cập nhật theo cửa hàng</span>
        </nav>

        {loading ? <div className="deals-state"><span className="deals-spinner" /><strong>Đang tải ưu đãi</strong><span>Vui lòng chờ trong giây lát.</span></div>
          : error ? <div className="deals-state error"><Icon>cloud_off</Icon><strong>Chưa tải được khuyến mãi</strong><span>{error}</span></div>
            : <div className="deals-content">
              {featuredPromotions.length > 0 && <section className="deals-campaigns" aria-label="Ưu đãi nổi bật">{featuredPromotions.map((promotion, index) => <CampaignCard promotion={promotion} index={index} key={promotion._id} />)}</section>}

              <section className="deals-section" id="best-deals">
                <div className="deals-section-head"><div><span className="deals-section-mark"><Icon>verified_user</Icon></span><div><h2>Ưu đãi nổi bật</h2><p>Khuyến mãi đang áp dụng cho sản phẩm trong cửa hàng.</p></div></div>
                  <div className="deals-sort"><label htmlFor="deals-sort">Sắp xếp</label><select id="deals-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="discount">Mức giảm cao nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="ending">Sắp kết thúc</option></select></div>
                </div>
                <div className="deals-result-line"><span>{visibleDeals.length} sản phẩm ưu đãi</span><form className="deals-inline-search" onSubmit={(event) => event.preventDefault()}><Icon>search</Icon><ProductSearchInput products={dealProducts} value={query} onChange={setQuery} placeholder="Tìm trong ưu đãi..." ariaLabel="Tìm sản phẩm khuyến mãi" /></form></div>
                {visibleDeals.length ? <div className="deals-product-grid">{visibleDeals.map((deal) => <DealProductCard key={deal.product._id} deal={deal} />)}</div>
                  : <div className="deals-empty"><Icon>{promotions.length ? 'search_off' : 'local_offer'}</Icon><strong>{promotions.length ? 'Chưa có sản phẩm trong mục này' : 'Hiện chưa có chương trình khuyến mãi'}</strong><span>{promotions.length ? 'Hãy chọn bộ lọc khác hoặc xem tất cả ưu đãi.' : 'Quay lại sau để xem những ưu đãi mới nhất.'}</span>{promotions.length ? <button type="button" onClick={() => { setFilter('all'); setQuery(''); }}>Xem tất cả ưu đãi</button> : <Link to="/products">Khám phá sản phẩm</Link>}</div>}
              </section>

              {endingDeals.length > 0 && <section className="deals-ending"><div className="deals-ending-head"><div><Icon>timer</Icon><h2>Sắp kết thúc</h2><span>Ưu đãi chỉ còn vài ngày</span></div><Link to="#best-deals">Xem tất cả <Icon>arrow_forward</Icon></Link></div>
                <div className="deals-ending-grid">{endingDeals.map(({ product, offer }) => <Link className="deals-ending-item" to={`/products/${product._id}`} key={product._id}>
                  <span className="deals-ending-image">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <Icon>local_offer</Icon>}</span>
                  <span className="deals-ending-copy"><strong>{product.name}</strong><span><b>{formatCurrency(offer.finalPrice)}</b><del>{formatCurrency(product.price)}</del></span><small><Icon>schedule</Icon>{endsInDays(offer.promo.endDate) === 0 ? 'Kết thúc hôm nay' : `Còn ${endsInDays(offer.promo.endDate)} ngày`}</small></span>
                  <Icon>chevron_right</Icon>
                </Link>)}</div>
              </section>}

            </div>}
      </main>

      <HomeFooter categories={categories} store={store} info={null} onNav={goToSection} onCategory={() => navigate('/products')} />
    </div>
  );
}
