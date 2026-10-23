
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem } from '../../api/cart.api';
import Icon from '../../components/common/Icon';
import { formatVND, formatProductUnit } from '../../utils/format';
import '../../styles/qk-tokens.css';
import '../../styles/style.css';

const emptyCart = { items: [], totalQuantity: 0, subtotal: 0 };

// UC-08.1 View Cart
// GET /api/cart
// Hiển thị sản phẩm, số lượng, giá và tổng tiền trong giỏ của khách đang đăng nhập.
export default function CartPage() {
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getCart()
      .then(({ data }) => { if (active) setCart(data); })
      .catch(() => { if (active) setError('Could not load your cart.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const changeCart = async (productId, request) => {
    if (pendingId !== null) return;
    setPendingId(productId);
    setError('');
    try {
      const { data } = await request();
      setCart(data);
    } catch (err) {
      setError(err.response?.status === 409
        ? 'Quantity exceeds available stock. Please try again.'
        : 'Could not update your cart.');
    } finally {
      setPendingId(null);
    }
  };

  // UC-08.3 Update Cart Item
  // PUT /api/cart/items/:productId
  // Đổi số lượng, đồng bộ lại giỏ hàng từ kết quả API.
  const changeQuantity = (productId, quantity) =>
    changeCart(productId, () => updateCartItem(productId, { quantity }));

  // UC-08.4 Remove Cart Item
  // DELETE /api/cart/items/:productId
  // Xóa sản phẩm được chọn và cập nhật tổng tiền.
  const removeItem = (productId) =>
    changeCart(productId, () => removeCartItem(productId));

  return (
    <section className="cart-page">
      <nav className="cart-crumb" aria-label="Breadcrumb">
        <Link to="/products">Products</Link><Icon name="chevron_right" size="sm" />
        <span>Shopping Cart</span>
      </nav>
      <div className="cart-head">
        <div>
          <h1>Shopping Cart</h1>
          <p>Review your items before store pickup.</p>
        </div>
        <Link className="cart-secondary" to="/products"><Icon name="arrow_back" size="sm" /> Continue Shopping</Link>
      </div>
      {error && <p className="cart-alert" role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading cart...</p>
      ) : error && cart.items.length === 0 ? (
        <div className="cart-empty">
          <p>Unable to display your cart.</p>
          <button type="button" className="cart-button" onClick={() => setReload((value) => value + 1)}>Try Again</button>
        </div>
      ) : cart.items.length === 0 ? (
        <div className="cart-empty">
          <Icon name="shopping_cart" size="xl" />
          <h2>Your cart is empty</h2>
          <p>Add products to get started.</p>
          <Link className="cart-button" to="/products">Browse Products</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map(({ productId, product, quantity, lineTotal, available }) => {
              const busy = pendingId !== null;
              const canIncrease = product?.status === 'active' && quantity < product.stockQuantity;
              return (
                <article className="cart-item" key={productId}>
                  <div className="cart-thumb">
                    {product?.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <Icon name="inventory_2" size="xl" />}
                  </div>
                  <div className="cart-item-info">
                    {product ? <Link to={`/products/${productId}`} className="cart-name">{product.name}</Link> : <strong>Unavailable product</strong>}
                    <p className="cart-muted">{product ? `${formatVND(product.price)} / ${formatProductUnit(product.unit)}` : 'Product details unavailable'}</p>
                    {!available && <p className="cart-warning">Not available in the requested quantity.</p>}
                    <button type="button" className="cart-remove" disabled={busy} onClick={() => removeItem(productId)}>
                      <Icon name="delete_outline" size="sm" /> Remove
                    </button>
                  </div>
                  <div className="cart-item-actions">
                    <div className="cart-stepper">
                      <button type="button" aria-label={`Decrease quantity for ${product?.name || 'product'}`} disabled={busy || quantity <= 1} onClick={() => changeQuantity(productId, quantity - 1)}>−</button>
                      <output aria-label="Quantity">{quantity}</output>
                      <button type="button" aria-label={`Increase quantity for ${product?.name || 'product'}`} disabled={busy || !canIncrease} onClick={() => changeQuantity(productId, quantity + 1)}>+</button>
                    </div>
                    <strong>{formatVND(lineTotal)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="cart-summary">
            <h2>Order Summary</h2>
            <div className="cart-summary-row"><span>Items</span><strong>{cart.totalQuantity}</strong></div>
            <div className="cart-summary-row"><span>Subtotal</span><strong>{formatVND(cart.subtotal)}</strong></div>
            <div className="cart-total"><span>Estimated Total</span><strong>{formatVND(cart.subtotal)}</strong></div>
            <p className="cart-pickup"><Icon name="storefront" size="md" /> In-store pickup only</p>
          </aside>
        </div>
      )}
    </section>
  );
}
