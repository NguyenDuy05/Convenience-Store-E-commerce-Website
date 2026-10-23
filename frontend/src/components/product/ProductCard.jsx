
import { Link } from 'react-router-dom';
import { formatProductUnit, formatVND } from '../../utils/format';
import AddToCartButton from './AddToCartButton';

export default function ProductCard({ product }) {
  const inStock = product.status === 'active' && product.stockQuantity > 0;
  return (
    <article className="card cart-product-card">
      <Link to={`/products/${product._id}`} className="cart-product-link">
        <div className="card-img">{product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : 'No image'}</div>
        <h3>{product.name}</h3>
        <p className="price">{formatVND(product.price)} <span className="muted">/ {formatProductUnit(product.unit)}</span></p>
        <p className={inStock ? 'ok' : 'out'}>{inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}</p>
      </Link>
      <AddToCartButton product={product} />
    </article>
  );
}
