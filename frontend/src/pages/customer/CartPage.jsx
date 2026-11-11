import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/cart.css';
import { getCart, updateCartItem, removeCartItem } from '../../api/cart.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import QuantityStepper from '../../components/cart/QuantityStepper';
import { formatCurrency } from '../../utils/format';
import CartIcon from '../../components/common/CartIcon';

const ISSUE_TEXT = {
  unavailable: "This product is no longer available. Please remove it from your cart",
  out_of_stock: "This product is out of stock",
  insufficient_stock: (n) => `Only ${n} items available. Please reduce the quantity`,
};

// UC-07 Manage Cart: xem, đổi số lượng, xóa sản phẩm (UC-07.1, 07.3, 07.4). Thêm sản phẩm làm ở trang chi tiết sản phẩm (UC-07.2).
export default function CartPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rowError, setRowError] = useState({}); // { [productId]: message }

  const handleAuth = useCallback(async (err) => {
    if (err.response?.status !== 401) return false;
    await logout();
    navigate('/login', { state: { from: location }, replace: true });
    return true;
  }, [logout, navigate, location]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    getCart()
      .then((res) => setCart(res.data))
      .catch(async (err) => { if (!(await handleAuth(err))) setError(err.response?.data?.message || "Could not load your cart. Please try again."); })
      .finally(() => setLoading(false));
  }, [handleAuth]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (productId, fn) => {
    if (busyId) return;
    setBusyId(productId); setRowError((e) => ({ ...e, [productId]: '' }));
    try {
      const res = await fn();
      setCart(res.data);
    } catch (err) {
      if (await handleAuth(err)) return;
      setRowError((e) => ({ ...e, [productId]: err.response?.data?.message || "Could not update the item. Please try again." }));
    } finally {
      setBusyId('');
    }
  };

  const crumb = (
    <nav className="cart-crumb" aria-label="Breadcrumb">
      <Link to="/">Home</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Cart</span>
    </nav>
  );

  if (loading) return <div className="cart">{crumb}<div className="cart-skeleton" aria-busy="true" aria-label="Loading cart" /></div>;

  if (error) {
    return (
      <div className="cart">{crumb}
        <div className="cart-state" role="alert">
          <Icon name="cloud_off" size="xl" /><h2>Could not load your cart</h2><p>{error}</p>
          <button type="button" className="cart-btn" onClick={load}><Icon name="refresh" size="md" />Try again</button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart">{crumb}
        <div className="cart-state">
          <CartIcon size={40} strokeWidth={1.6} /><h2>Your cart is empty</h2><p>Choose a few favorites, then return here to place your order.</p>
          <Link className="cart-btn" to="/products"><Icon name="storefront" size="md" />Browse products</Link>
        </div>
      </div>
    );
  }

  const blocked = cart.issues.length > 0;

  return (
    <div className="cart">
      {crumb}
      <h1 className="cart-title">Cart <small>({cart.itemCount} items)</small></h1>

      <div className="cart-grid">
        <ul className="cart-list">
          {cart.items.map((it) => {
            const id = String(it.productId);
            const busy = busyId === id;
            const issueText = it.issue ? (it.issue === 'insufficient_stock' ? ISSUE_TEXT.insufficient_stock(it.stockQuantity) : ISSUE_TEXT[it.issue]) : '';
            return (
              <li key={id} className={`cart-item ${it.issue ? 'has-issue' : ''}`}>
                <div className="cart-thumb">{it.image ? <img src={it.image} alt={it.name} /> : <Icon name="shopping_basket" size="lg" />}</div>
                <div className="cart-info">
                  {it.issue === 'unavailable' ? <span className="cart-name">{it.name}</span> : <Link className="cart-name" to={`/products/${id}`}>{it.name}</Link>}
                  <span className="cart-unit">{formatCurrency(it.unitPrice)}{it.unit ? ` / ${it.unit}` : ''}</span>
                  {issueText && <span className="cart-issue"><Icon name="warning" size="md" />{issueText}</span>}
                  {rowError[id] && <span className="cart-issue" role="alert"><Icon name="error" size="md" />{rowError[id]}</span>}
                </div>
                <div className="cart-qty">
                  {it.issue !== 'unavailable' && (
                    <QuantityStepper value={it.quantity} max={Math.max(Math.min(it.stockQuantity, 99), 1)} disabled={busy}
                      onChange={(v) => act(id, () => updateCartItem(id, { quantity: v }))} />
                  )}
                </div>
                <div className="cart-line">{formatCurrency(it.lineTotal)}</div>
                <button type="button" className="cart-remove" disabled={busy} aria-label={`Remove ${it.name} from cart`} onClick={() => act(id, () => removeCartItem(id))}>
                  <Icon name="delete" size="md" />
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="cart-side">
          <h2>Summary</h2>
          <div className="cart-sum"><span>Subtotal</span><b>{formatCurrency(cart.subtotal)}</b></div>
          <p className="cart-hint">Promotions and discount codes are calculated at checkout. Items are reserved after your order is placed.</p>
          {blocked && <p className="cart-issue" role="alert"><Icon name="warning" size="md" />Resolve the highlighted item issues before checking out.</p>}
          <button type="button" className="cart-btn block" disabled={blocked} onClick={() => navigate('/checkout')}>
            Proceed to checkout<Icon name="arrow_forward" size="md" />
          </button>
          <Link className="cart-link" to="/products">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
