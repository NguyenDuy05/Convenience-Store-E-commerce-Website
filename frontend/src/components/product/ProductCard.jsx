import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

export default function ProductCard({ product }) {
  const inStock = product.stockQuantity > 0;
  return (
    <Link to={`/products/${product._id}`} className="card">
      <div className="card-img">{product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : 'Chưa có ảnh'}</div>
      <h3>{product.name}</h3>
      <p className="muted">{product.categoryId?.name}</p>
      <p className="price">{formatCurrency(product.price)} <span className="muted">/ {product.unit}</span></p>
      <p className={inStock ? 'ok' : 'out'}>{inStock ? `Còn ${product.stockQuantity}` : 'Hết hàng'}</p>
    </Link>
  );
}
