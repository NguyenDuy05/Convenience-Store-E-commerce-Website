import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../../api/product.api';
import Loading from '../../components/common/Loading';
import { formatCurrency } from '../../utils/format';

// UC-02.2 View Product Details
export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getProduct(id)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được sản phẩm'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!product) return <Loading />;

  return (
    <section>
      <Link to="/products">← Quay lại</Link>
      <h2>{product.name}</h2>
      <p className="muted">{product.categoryId?.name}</p>
      <p className="price">{formatCurrency(product.price)} <span className="muted">/ {product.unit}</span></p>
      <p className={product.stockQuantity > 0 ? 'ok' : 'out'}>
        {product.stockQuantity > 0 ? `Còn ${product.stockQuantity} sản phẩm` : 'Hết hàng'}
      </p>
      {product.description && <p>{product.description}</p>}
    </section>
  );
}
