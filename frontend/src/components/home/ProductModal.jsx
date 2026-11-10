import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../../api/product.api';
import Icon from '../common/Icon';
import { Media } from './HomeParts';
import AddToCart from '../cart/AddToCart';
import { estimatePromo } from '../../utils/promoPrice';
import { formatCurrency } from '../../utils/format';

// Native dialog provides focus trapping, Escape and inert background content.
export default function ProductModal({ product, promos = [], onClose }) {
  const dialogRef = useRef(null);
  const [current, setCurrent] = useState(product);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    getProduct(product._id).then((result) => { if (alive) setCurrent(result.data); })
      .catch((err) => { if (alive) setError(err.response?.data?.message || 'Could not refresh this product. Please try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [product._id, retry]);
  useEffect(() => {
    const dialog = dialogRef.current, previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus?.({ preventScroll: true }); };
  }, []);
  const promo = estimatePromo(current, promos);
  const keepFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')].filter((element) => element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <dialog className="quick-product-dialog" ref={dialogRef} data-lenis-prevent aria-labelledby="quick-product-title" onKeyDown={keepFocus} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button className="quick-dialog-close" type="button" aria-label="Close product" onClick={onClose}><Icon name="close" /></button>
    <div className="quick-product-focus"><Media product={current} cat={current.categoryId} /></div>
    <div className="quick-product-info">
      <span className="quick-kicker">YOUR NEXT PICK · {current.categoryId?.name}</span>
      <h2 id="quick-product-title">{current.name}</h2>
      <p className="quick-product-price">{formatCurrency(promo.price)} <small>/ {current.unit}</small>{promo.price < current.price && <s>{formatCurrency(current.price)}</s>}</p>
      {promo.applied.length > 0 && <div className="quick-promo-note">{promo.applied.map((offer) => <span key={offer.name}>{offer.name} · {offer.label}</span>)}<small>Estimated for one item. Final discounts are calculated at checkout.</small></div>}
      <p>{current.description || 'No product description is available yet.'}</p>
      <span className={current.stockQuantity > 0 ? 'ok' : 'out'}>{current.stockQuantity > 0 ? 'Available: ' + current.stockQuantity + ' ' + current.unit : 'Out of stock'}</span>
      {loading ? <p role="status">Checking the latest product information…</p> : error ? <div role="alert"><p>{error}</p><button className="quick-button" onClick={() => setRetry((v) => v + 1)}>Try again</button></div> : <AddToCart product={current} />}
      <Link className="quick-link" to={'/products/' + current._id}>View details<Icon name="arrow_forward" size="sm" /></Link>
    </div>
  </dialog>;
}
