import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { Media } from './HomeParts';
import { formatCurrency } from '../../utils/format';

const STEPS = [
  { id: 'select', label: '03 / SELECT', title: 'Something catches your eye.', text: 'Take a closer look. Check the price, choose your quantity, and add your favorites to your cart.', note: 'Product selection on the shelves is real. The story below is an illustration.', link: '/products', action: 'Explore products' },
  { id: 'cart', label: '04 / YOUR CART', title: 'Your picks. One easy checkout.', text: 'Everything you chose, together in one place. Review quantities and your total before moving to checkout.', note: 'Prices, offers and availability are checked again at checkout.', link: '/cart', action: 'View my cart' },
  { id: 'confirm', label: '05 / CONFIRM', title: 'A little check. Then you’re set.', text: 'Review your items, check the pickup store and your customer information, then confirm your order.', note: 'Your order code appears after you place an order.', link: '/checkout', action: 'Review checkout' },
  { id: 'pay', label: '06 / PAY', title: 'Confirm. Pay. Get ready.', text: 'Wallet credit goes first. Pay the remaining balance through VNPay. If your wallet covers the total, there is nothing more to pay.', note: 'Your order shows payment status after the system verifies the result.', link: '/orders', action: 'View my orders' },
  { id: 'pickup', label: '07 / PICK UP', title: 'Order online. Pick up at QUICK.', text: 'Follow your order from confirmed to preparing. When it is ready for pickup, visit the store and show your order code to staff.', note: 'Ordering after hours? We prepare when the store reopens.', link: '/orders', action: 'View my orders' },
];

function ProcessArt({ index, product, store }) {
  if (index === 0) return <div className="quick-selection-art">
    <span className="quick-art-tag">A CLOSER LOOK</span>
    <div className="quick-selection-product">{product ? <Media product={product} cat={product.categoryId} /> : <Icon name="inventory_2" />}</div>
    <h3>{product?.name || 'Your next favorite'}</h3>
    {product && <span className="quick-art-price">{formatCurrency(product.price)} <small>/ {product.unit}</small></span>}
    <span className="quick-art-caption">Choose a product on the shelves to shop.</span>
  </div>;
  if (index === 1) return <div className="quick-cart-art">
    <div className="quick-cart-picks">{product && <div><Media product={product} cat={product.categoryId} /></div>}<span><Icon name="add" /></span></div>
    <div className="quick-story-bag"><span className="quick-bag-handle" /><Icon name="shopping_bag" /><b>QUICK</b><small>YOUR PICKS. ALL TOGETHER.</small></div>
    <span className="quick-art-pill"><Icon name="receipt_long" size="sm" /> Review items & quantities</span>
  </div>;
  if (index === 2) return <div className="quick-confirm-art">
    <div className="quick-receipt-title"><Icon name="receipt_long" /><b>One last look.</b></div>
    <ol><li><span>01</span>Review your items</li><li><span>02</span>Check your pickup store</li><li><span>03</span>Verify customer information</li><li><span>04</span>Confirm your order</li></ol>
    <div className="quick-store-preview"><Icon name="storefront" /><div><b>{store?.name || 'Pickup store'}</b><span>{store?.address || 'Store details appear at checkout.'}</span></div></div>
    <span className="quick-art-caption">Your order code will appear after checkout.</span>
  </div>;
  if (index === 3) return <div className="quick-pay-art">
    <div className="quick-pay-wallet"><Icon name="account_balance_wallet" /><span>Wallet credit<b>Applied first</b></span></div>
    <div className="quick-payment-connector"><i /><Icon name="south" /></div>
    <div className="quick-vnpay"><Icon name="lock" /><b><span>VN</span>Pay</b><p>For your remaining balance</p></div>
    <div className="quick-payment-connector"><i /><Icon name="south" /></div>
    <span className="quick-art-pill"><Icon name="verified_user" size="sm" /> Payment status verified by the system</span>
  </div>;
  return <div className="quick-pickup-art">
    <div className="quick-status-strip"><span>Confirmed</span><Icon name="arrow_forward" size="sm" /><span>Preparing</span><Icon name="arrow_forward" size="sm" /><b>Ready for pickup</b></div>
    <div className="quick-mini-shop"><div className="quick-store-sign"><Icon name="storefront" /> QUICK</div><div className="quick-awning" /><div className="quick-pickup-counter"><Icon name="shopping_bag" /><span>PICKUP COUNTER</span><small>Show your order code to staff</small></div></div>
    <div className="quick-pickup-ticket"><Icon name="confirmation_number" /><span>Visit store → Show code → Collect</span></div>
  </div>;
}

export default function PickupJourney({ product, store }) {
  return <section className="quick-process" aria-labelledby="quick-process-title">
    <div className="quick-wrap">
      <header className="quick-process-heading quick-reveal"><span className="quick-kicker">FROM YOUR SCREEN TO YOUR NEXT STOP</span><h2 id="quick-process-title">A good pick.<br /><span>An easy pickup.</span></h2><p>Follow your favorites all the way to the counter.</p></header>
      <div className="quick-process-layout">
        <div className="quick-process-stage" aria-hidden="true">
          <div className="quick-process-stage-label"><span>THE QUICK WAY</span><span>HOW IT WORKS · ILLUSTRATION</span></div>
          <div className="quick-process-panels">{STEPS.map((step, index) => <div className={'quick-process-panel process-' + step.id} key={step.id}><ProcessArt index={index} product={product} store={store} /></div>)}</div>
          <div className="quick-process-stage-bottom"><span>CHOOSE. CONFIRM. COLLECT.</span><Icon name="south" size="sm" /></div>
        </div>
        <div className="quick-process-steps">
          <div className="quick-process-progress" aria-hidden="true"><i /></div>
          {STEPS.map((step, index) => <article className={'quick-process-step process-' + step.id} key={step.id}>
            <div className="quick-process-mobile" aria-hidden="true"><ProcessArt index={index} product={product} store={store} /><small className="quick-illustration-label">How it works · Illustration</small></div>
            <span className="quick-kicker">{step.label}</span><h3>{step.title}</h3><p>{step.text}</p><small>{step.note}</small><Link className="quick-link" to={step.link}>{step.action}<Icon name="arrow_forward" size="sm" /></Link>
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
