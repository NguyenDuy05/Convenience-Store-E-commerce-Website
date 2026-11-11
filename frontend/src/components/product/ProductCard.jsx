import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import Icon from '../common/Icon';

// Thẻ sản phẩm (ảnh, giá, khuyến mãi)
export default function ProductCard({ product }) {
  const inStock = product.stockQuantity > 0;
  return (
    <Link to={`/products/${product._id}`} className="card">
      <div className="card-img">{product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <Icon name="inventory_2" size="xl" />}</div>
      <h3>{product.name}</h3>
      <p className="muted">{product.categoryId?.name}</p>
      <p className="price">{formatCurrency(product.price)} <span className="muted">/ {product.unit}</span></p>
      <p className={inStock ? 'ok' : 'out'}>{inStock ? `Available: ${product.stockQuantity}` : "Out of stock"}</p>
    </Link>
  );
}
