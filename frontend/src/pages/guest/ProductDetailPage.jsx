import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/product-detail.css';
import { getProduct, listProducts } from '../../api/product.api';
import { listPromotions } from '../../api/promotion.api';
import { listStores } from '../../api/store.api';
import Loading from '../../components/common/Loading';
import Icon from '../../components/common/Icon';
import AddToCart from '../../components/cart/AddToCart';
import ProductGallery from '../../components/product/ProductGallery';
import ProductReviews, { Stars } from '../../components/product/ProductReviews';
import ProductCard from '../../components/product/ProductCard';
import { formatCurrency } from '../../utils/format';
import { estimatePromo } from '../../utils/promoPrice';

const MEAL = { main: 'Món no', light: 'Ăn nhẹ', snack: 'Ăn vặt', beverage: 'Đồ uống' };
// UC-02.2 View Product Details
export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [store, setStore] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let alive = true;
    setProduct(null); setError(''); setRelated([]);
    window.scrollTo({ top: 0 });
    getProduct(id)
      .then((res) => {
        if (!alive) return;
        setProduct(res.data);
        document.title = `${res.data.name} | Convenience Store`;
        const catId = res.data.categoryId?._id || res.data.categoryId;
        if (catId) listProducts({ categoryId: catId, limit: 5 }).then((r) => { if (alive) setRelated((r.data.items || []).filter((p) => p._id !== res.data._id).slice(0, 4)); }).catch(() => { });
      })
      .catch((err) => { if (alive) setError(err.response?.status === 404 ? 'Sản phẩm không tồn tại hoặc đã ngừng bán.' : (err.response?.data?.message || 'Không tải được sản phẩm. Vui lòng thử lại.')); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    listPromotions().then((r) => setPromotions(r.data || [])).catch(() => { });
    listStores().then((r) => setStore((r.data || [])[0] || null)).catch(() => { });
  }, []);

  const promo = useMemo(() => (product ? estimatePromo(product, promotions) : null), [product, promotions]);

  if (error) {
    return (
      <section className="pd pd-state">
        <Icon name="search_off" size="lg" /><h1>Không tìm thấy sản phẩm</h1><p>{error}</p>
        <Link className="pd-btn" to="/products">Xem tất cả sản phẩm</Link>
      </section>
    );
  }
  if (!product) return <Loading />;

  const stock = product.stockQuantity || 0;
  const low = stock > 0 && stock <= (product.lowStockThreshold ?? 0);
  const discounted = promo && promo.price < product.price;
  const catName = product.categoryId?.name;

  return (
    <section className="pd">
      <nav className="pd-crumbs" aria-label="Điều hướng">
        <Link to="/">Trang chủ</Link><Icon name="chevron_right" /><Link to="/products">Sản phẩm</Link>
        {catName && <><Icon name="chevron_right" /><span>{catName}</span></>}
        <Icon name="chevron_right" /><span aria-current="page">{product.name}</span>
      </nav>

      <div className="pd-top">
        <ProductGallery images={product.images} name={product.name} />

        <div className="pd-info">
          <div className="pd-tags">
            {catName && <span className="pd-chip">{catName}</span>}
            {MEAL[product.mealType] && <span className="pd-chip alt">{MEAL[product.mealType]}</span>}
          </div>
          <h1>{product.name}</h1>

          <a className="pd-ratingline" href="#danh-gia">
            <Stars value={product.ratingAvg || 0} size={17} />
            <span>{product.ratingCount ? `${product.ratingAvg.toFixed(1)} · ${product.ratingCount} đánh giá` : 'Chưa có đánh giá'}</span>
          </a>

          <div className="pd-pricebox">
            <div className="pd-price">
              <strong>{formatCurrency(discounted ? promo.price : product.price)}</strong><span>/ {product.unit}</span>
              {discounted && <s>{formatCurrency(product.price)}</s>}
            </div>
            {discounted && (
              <ul className="pd-promos">
                {promo.applied.map((a) => <li key={a.name}><Icon name="local_offer" size="md" fill /><b>{a.name}</b><em>{a.label}</em></li>)}
                <li className="pd-hint">Giá ước tính cho 1 sản phẩm, khuyến mãi được áp dụng tự động khi thanh toán.</li>
              </ul>
            )}
          </div>

          <p className={`pd-stock ${stock <= 0 ? 'out' : low ? 'low' : 'ok'}`}>
            <Icon name={stock <= 0 ? 'cancel' : low ? 'warning' : 'check_circle'} size="md" fill />
            {stock <= 0 ? 'Tạm hết hàng' : low ? `Sắp hết hàng, chỉ còn ${stock} ${product.unit}` : `Còn hàng (${stock} ${product.unit})`}
          </p>

          <AddToCart product={product} />

          <div className="pd-pickup">
            <Icon name="storefront" size="md" />
            <div><b>Nhận tại cửa hàng</b><span>{store ? `${store.name}${store.address ? ` · ${store.address}` : ''}` : 'Đặt online, ra cửa hàng nhận hàng (không giao tận nơi).'}</span></div>
          </div>

          <dl className="pd-specs">
            <div><dt>Mã SKU</dt><dd className="mono">{product.sku}</dd></div>
            {product.barcode && <div><dt>Mã vạch</dt><dd className="mono">{product.barcode}</dd></div>}
            <div><dt>Đơn vị</dt><dd>{product.unit}</dd></div>
            {catName && <div><dt>Danh mục</dt><dd>{catName}</dd></div>}
          </dl>
        </div>
      </div>

      <section className="pd-section" aria-labelledby="pd-desc-title">
        <h2 id="pd-desc-title">Mô tả sản phẩm</h2>
        {product.description ? <p className="pd-desc">{product.description}</p> : <p className="pd-hint">Sản phẩm này chưa có mô tả.</p>}
      </section>

      <ProductReviews productId={product._id} ratingAvg={product.ratingAvg || 0} ratingCount={product.ratingCount || 0} />

      {related.length > 0 && (
        <section className="pd-section" aria-labelledby="pd-rel-title">
          <h2 id="pd-rel-title">Sản phẩm cùng danh mục</h2>
          <div className="grid">{related.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        </section>
      )}
    </section>
  );
}