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

const MEAL = { main: "Main meals", light: "Light meals", snack: "Snacks", beverage: "Drinks" };
// UC-02.2 Chi tiết sản phẩm
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
      .catch((err) => { if (alive) setError(err.response?.status === 404 ? "This product does not exist or is no longer available." : (err.response?.data?.message || "Could not load the product. Please try again.")); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    listPromotions().then((r) => setPromotions(r.data.items || [])).catch(() => { });
    listStores().then((r) => setStore((r.data || [])[0] || null)).catch(() => { });
  }, []);

  const promo = useMemo(() => (product ? estimatePromo(product, promotions) : null), [product, promotions]);

  if (error) {
    return (
      <section className="pd pd-state">
        <Icon name="search_off" size="lg" /><h1>Product not found</h1><p>{error}</p>
        <Link className="pd-btn" to="/products">View all products</Link>
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
      <nav className="pd-crumbs" aria-label="Navigation">
        <Link to="/">Home</Link><Icon name="chevron_right" /><Link to="/products">Products</Link>
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
            <span>{product.ratingCount ? `${product.ratingAvg.toFixed(1)} · ${product.ratingCount} reviews` : "No reviews yet"}</span>
          </a>

          <div className="pd-pricebox">
            <div className="pd-price">
              <strong>{formatCurrency(discounted ? promo.price : product.price)}</strong><span>/ {product.unit}</span>
              {discounted && <s>{formatCurrency(product.price)}</s>}
            </div>
            {discounted && (
              <ul className="pd-promos">
                {promo.applied.map((a) => <li key={a.name}><Icon name="local_offer" size="md" fill /><b>{a.name}</b><em>{a.label}</em></li>)}
                <li className="pd-hint">Estimated price for one item. Promotions are applied automatically at checkout.</li>
              </ul>
            )}
          </div>

          <p className={`pd-stock ${stock <= 0 ? 'out' : low ? 'low' : 'ok'}`}>
            <Icon name={stock <= 0 ? 'cancel' : low ? 'warning' : 'check_circle'} size="md" fill />
            {stock <= 0 ? "Temporarily out of stock" : low ? `Low stock, only ${stock} ${product.unit}` : `In stock (${stock} ${product.unit})`}
          </p>

          <AddToCart product={product} />

          <div className="pd-pickup">
            <Icon name="storefront" size="md" />
            <div><b>Store pickup</b><span>{store ? `${store.name}${store.address ? ` · ${store.address}` : ''}` : "Order online and collect in store."}</span></div>
          </div>

          <dl className="pd-specs">
            <div><dt>SKU</dt><dd className="mono">{product.sku}</dd></div>
            {product.barcode && <div><dt>Barcode</dt><dd className="mono">{product.barcode}</dd></div>}
            <div><dt>Unit</dt><dd>{product.unit}</dd></div>
            {catName && <div><dt>Category</dt><dd>{catName}</dd></div>}
          </dl>
        </div>
      </div>

      <section className="pd-section" aria-labelledby="pd-desc-title">
        <h2 id="pd-desc-title">Product description</h2>
        {product.description ? <p className="pd-desc">{product.description}</p> : <p className="pd-hint">No description is available for this product.</p>}
      </section>

      <ProductReviews productId={product._id} ratingAvg={product.ratingAvg || 0} ratingCount={product.ratingCount || 0} />

      {related.length > 0 && (
        <section className="pd-section" aria-labelledby="pd-rel-title">
          <h2 id="pd-rel-title">Related products</h2>
          <div className="grid">{related.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        </section>
      )}
    </section>
  );
}
