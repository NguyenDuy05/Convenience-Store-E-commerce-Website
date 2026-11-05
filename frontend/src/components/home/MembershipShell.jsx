import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import '../../styles/membership.css';

export default function MembershipShell({ children }) {
  return <div className="membership-shell">
    <header className="membership-site-header"><div className="membership-site-header-inner">
      <Link to="/" className="membership-site-brand"><strong>QUICK</strong><small>QUICK PICKS, HAPPY DAYS</small></Link>
      <Link to="/#store" className="membership-store-pill"><Icon name="storefront" /><span>Store pickup</span><small>IN STORE</small></Link>
      <Link to="/products" className="membership-search-link"><Icon name="search" /><span>Find drinks, snacks, fresh food...</span></Link>
      <nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/products">Products</Link><Link to="/promotions">Promotions</Link><Link to="/#store">Stores</Link></nav>
      <div className="membership-header-actions"><Link to="/cart" aria-label="View cart" className="membership-cart-link"><Icon name="shopping_bag" /></Link><Link to="/profile" className="membership-account-link"><span><Icon name="person" /></span>Account</Link></div>
    </div></header>
    <main className="membership-main">{children}</main>
    <section className="membership-service-strip" aria-label="Shopping benefits"><div>
      {[['bolt', 'green', 'Easy Store Pickup', 'Order online and collect your everyday favorites in store.'], ['verified_user', 'blue', 'Your Account, Your Points', 'View your balance and keep track of your point activity.'], ['contactless', 'gold', 'Convenient Shopping', 'Browse products, manage orders and check your membership.']].map(([icon, color, title, text]) => <article key={title}><span className={'membership-icon ' + color}><Icon name={icon} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}
    </div></section>
    <footer className="membership-site-footer"><div className="membership-footer-columns">
      <section><h3>Convenience Store</h3><Link to="/#store">Find a Store</Link><Link to="/promotions">Weekly Deals</Link><Link to="/products">Snacks &amp; Drinks</Link><Link to="/products">Browse All Products</Link></section>
      <section><h3>Customer Care</h3><Link to="/support">Pickup Support</Link><Link to="/orders">Track Your Order</Link><Link to="/support">Contact Support</Link><Link to="/reviews">My Reviews</Link></section>
      <section><h3>Your Membership</h3><a href="#point-history">Point Activity</a><Link to="/membership">Membership Benefits</Link><Link to="/profile">Account Details</Link><Link to="/addresses">Saved Addresses</Link></section>
      <section><h3>Shop Your Way</h3><p>Order online and pick up at the store.</p><div className="membership-footer-tags"><span>Online ordering</span><span>Store pickup</span><span>Loyalty points</span></div></section>
    </div><div className="membership-footer-bottom"><Link to="/" className="membership-site-brand"><strong>QUICK</strong></Link><span>&copy; {new Date().getFullYear()} Convenience Store. All rights reserved.</span><Link to="/support">Help &amp; Support</Link></div></footer>
  </div>;
}
