
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../../api/product.api';
import AddToCartButton from '../../components/product/AddToCartButton';
import { formatProductUnit, formatVND } from '../../utils/format';

// UC-02.2 View Product Details, UC-08.2 Add Product to Cart
export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError('');
    getProduct(id)
      .then((res) => { if (active) setProduct(res.data); })
      .catch(() => { if (active) setError('Could not load this product.'); });
    return () => { active = false; };
  }, [id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!product) return <p role="status">Loading product...</p>;

  return (
    <section className="cart-detail">
      <Link to="/products">← Back to Products</Link>
      <h2>{product.name}</h2>
      <p className="price">{formatVND(product.price)} <span className="muted">/ {formatProductUnit(product.unit)}</span></p>
      <p className={product.stockQuantity > 0 ? 'ok' : 'out'}>
        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
      </p>
      {product.description && <p>{product.description}</p>}
      <AddToCartButton product={product} />
    </section>
  );
}
