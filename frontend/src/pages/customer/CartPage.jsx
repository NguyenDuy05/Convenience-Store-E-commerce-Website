import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/qk-tokens.css';
import '../../styles/cart.css';
import { getCart, updateCartItem, removeCartItem } from '../../api/cart.api';
import useAuth from '../../hooks/useAuth';
import Icon from '../../components/common/Icon';
import QuantityStepper from '../../components/cart/QuantityStepper';
import { formatCurrency } from '../../utils/format';

const ISSUE_TEXT = {
  unavailable: 'Sản phẩm không còn bán, vui lòng xóa khỏi giỏ',
  out_of_stock: 'Sản phẩm đã hết hàng',
  insufficient_stock: (n) => `Chỉ còn ${n} sản phẩm, vui lòng giảm số lượng`,
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
      .catch(async (err) => { if (!(await handleAuth(err))) setError(err.response?.data?.message || 'Không tải được giỏ hàng. Vui lòng thử lại.'); })
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
      setRowError((e) => ({ ...e, [productId]: err.response?.data?.message || 'Không cập nhật được. Vui lòng thử lại.' }));
    } finally {
      setBusyId('');
    }
  };

  const crumb = (
    <nav className="cart-crumb" aria-label="Breadcrumb">
      <Link to="/">Trang chủ</Link><Icon name="chevron_right" size="sm" /><span aria-current="page">Giỏ hàng</span>
    </nav>
  );

  if (loading) return <div className="cart">{crumb}<div className="cart-skeleton" aria-busy="true" aria-label="Đang tải giỏ hàng" /></div>;

  if (error) {
    return (
      <div className="cart">{crumb}
        <div className="cart-state" role="alert">
          <Icon name="cloud_off" size="xl" /><h2>Chưa tải được giỏ hàng</h2><p>{error}</p>
          <button type="button" className="cart-btn" onClick={load}><Icon name="refresh" size="md" />Thử lại</button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart">{crumb}
        <div className="cart-state">
          <Icon name="shopping_cart" size="xl" /><h2>Giỏ hàng đang trống</h2><p>Chọn vài món bạn thích rồi quay lại đây để đặt hàng.</p>
          <Link className="cart-btn" to="/products"><Icon name="storefront" size="md" />Xem sản phẩm</Link>
        </div>
      </div>
    );
  }

  const blocked = cart.issues.length > 0;

  return (
    <div className="cart">
      {crumb}
      <h1 className="cart-title">Giỏ hàng <small>({cart.itemCount} sản phẩm)</small></h1>

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
                <button type="button" className="cart-remove" disabled={busy} aria-label={`Xóa ${it.name} khỏi giỏ`} onClick={() => act(id, () => removeCartItem(id))}>
                  <Icon name="delete" size="md" />
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="cart-side">
          <h2>Tóm tắt</h2>
          <div className="cart-sum"><span>Tạm tính</span><b>{formatCurrency(cart.subtotal)}</b></div>
          <p className="cart-hint">Khuyến mãi và mã giảm giá sẽ được tính ở bước đặt hàng. Hàng được giữ sau khi bạn đặt hàng thành công.</p>
          {blocked && <p className="cart-issue" role="alert"><Icon name="warning" size="md" />Vui lòng xử lý các sản phẩm có cảnh báo trước khi đặt hàng.</p>}
          <button type="button" className="cart-btn block" disabled={blocked} onClick={() => navigate('/checkout')}>
            Tiến hành đặt hàng<Icon name="arrow_forward" size="md" />
          </button>
          <Link className="cart-link" to="/products">Tiếp tục mua sắm</Link>
        </aside>
      </div>
    </div>
  );
}
