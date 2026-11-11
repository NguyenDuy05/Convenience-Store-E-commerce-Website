import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/add-to-cart.css';
import Icon from '../common/Icon';
import QuantityStepper from './QuantityStepper';
import useAuth from '../../hooks/useAuth';
import { addCartItem } from '../../api/cart.api';
import CartIcon from '../common/CartIcon';

// Khối chọn số lượng + thêm vào giỏ ở trang chi tiết sản phẩm
export default function AddToCart({ product }) {
  const { user } = useAuth();
  const location = useLocation();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(null);
  const [error, setError] = useState('');

  const stock = product.stockQuantity || 0;
  if (stock <= 0) return <p className="atc-note out">This product is temporarily out of stock</p>;

  if (!user) {
    return (
      <div className="atc">
        <Link className="atc-btn" to="/login" state={{ from: location }}><Icon name="login" size="md" />Log in to shop</Link>
      </div>
    );
  }
  if (user.role !== 'customer') return <p className="atc-note">Only customer accounts can place orders.</p>;

  const add = async () => {
    if (busy) return;
    setBusy(true); setError(''); setAdded(null);
    try {
      const res = await addCartItem({ productId: product._id, quantity: qty });
      setAdded({ itemCount: res.data.itemCount });
    } catch (err) {
      setError(err.response?.data?.message || "Could not add the item to your cart. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atc">
      <div className="atc-row">
        <QuantityStepper value={qty} max={Math.min(stock, 99)} onChange={(v) => setQty(Math.max(1, Math.min(v, stock, 99)))} disabled={busy} />
        <button type="button" className="atc-btn" onClick={add} disabled={busy}>
          <CartIcon size={18} strokeWidth={2} />{busy ? "Adding…" : "Add to cart"}
        </button>
      </div>
      {added && (
        <p className="atc-msg ok" role="status">
          <Icon name="check_circle" size="md" fill />Added to cart ({added.itemCount} items). <Link to="/cart">View cart</Link>
        </p>
      )}
      {error && <p className="atc-msg err" role="alert"><Icon name="error" size="md" />{error}</p>}
    </div>
  );
}
