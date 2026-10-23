
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { addCartItem } from '../../api/cart.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../common/Icon';
import '../../styles/qk-tokens.css';
import '../../styles/style.css';

// UC-08.2 Add Product to Cart
// POST /api/cart/items
// Khách chưa đăng nhập sẽ được chuyển tới Login; chỉ customer được thêm vào giỏ.
export default function AddToCartButton({ product }) {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const unavailable = product.status !== 'active' || product.stockQuantity < 1;

  const handleAdd = async () => {
    if (pending || authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (user.role !== 'customer') return;

    setPending(true);
    setMessage('');
    try {
      await addCartItem({ productId: product._id, quantity: 1 });
      setError(false);
      setMessage('Added to cart.');
    } catch (err) {
      if (err.response?.status === 401) {
        await logout();
        navigate('/login', { state: { from: location } });
        return;
      }
      setError(true);
      setMessage(err.response?.status === 409
        ? 'Not enough stock available.'
        : 'Could not add this product.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="cart-add">
      <button type="button" className="cart-button" onClick={handleAdd}
        disabled={pending || authLoading || unavailable || (user && user.role !== 'customer')}>
        <Icon name="add_shopping_cart" size="sm" />
        {pending ? 'Adding...' : unavailable ? 'Out of stock' : 'Add to Cart'}
      </button>
      {message && <span className={error ? 'cart-error' : 'cart-success'} role={error ? 'alert' : 'status'}>{message}</span>}
      {message && !error && <Link to="/cart" className="cart-link">View Cart</Link>}
    </div>
  );
}
