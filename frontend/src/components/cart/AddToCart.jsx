import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/add-to-cart.css';
import Icon from '../common/Icon';
import QuantityStepper from './QuantityStepper';
import useAuth from '../../hooks/useAuth';
import { addCartItem } from '../../api/cart.api';

// Khối "Thêm vào giỏ" trên trang chi tiết sản phẩm (UC-07.2). Chỉ tài khoản khách hàng mới mua được.
export default function AddToCart({ product }) {
  const { user } = useAuth();
  const location = useLocation();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(null);   // { itemCount }
  const [error, setError] = useState('');

  const stock = product.stockQuantity || 0;
  if (stock <= 0) return <p className="atc-note out">Sản phẩm tạm hết hàng</p>;

  if (!user) {
    return (
      <div className="atc">
        <Link className="atc-btn" to="/login" state={{ from: location }}><Icon name="login" size="md" />Đăng nhập để mua hàng</Link>
      </div>
    );
  }
  if (user.role !== 'customer') return <p className="atc-note">Chỉ tài khoản khách hàng mới đặt mua được.</p>;

  const add = async () => {
    if (busy) return;
    setBusy(true); setError(''); setAdded(null);
    try {
      const res = await addCartItem({ productId: product._id, quantity: qty });
      setAdded({ itemCount: res.data.itemCount });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thêm được vào giỏ hàng. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atc">
      <div className="atc-row">
        <QuantityStepper value={qty} max={Math.min(stock, 99)} onChange={(v) => setQty(Math.max(1, Math.min(v, stock, 99)))} disabled={busy} />
        <button type="button" className="atc-btn" onClick={add} disabled={busy}>
          <Icon name="add_shopping_cart" size="md" />{busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
        </button>
      </div>
      {added && (
        <p className="atc-msg ok" role="status">
          <Icon name="check_circle" size="md" fill />Đã thêm vào giỏ ({added.itemCount} sản phẩm). <Link to="/cart">Xem giỏ hàng</Link>
        </p>
      )}
      {error && <p className="atc-msg err" role="alert"><Icon name="error" size="md" />{error}</p>}
    </div>
  );
}
