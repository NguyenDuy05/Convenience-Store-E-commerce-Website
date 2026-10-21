import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Icon } from './HomeParts';
import { BRAND_NAME, LOGO_IMAGE } from './homeConfig';

// Footer: brand, shop by category, explore, account, store info
export default function HomeFooter({ categories, store, info, onNav, onCategory }) {
    const { user } = useAuth();
    const address = store?.address && !store.address.startsWith('(') ? store.address : '';

    return (
        <footer className="hp-footer">
            <div className="hp-wrap">
                <div className="hp-fgrid">
                    <div className="hp-fbrand">
                        <span className="hp-brand static">
                            <span className="hp-logo">{LOGO_IMAGE ? <img src={LOGO_IMAGE} alt="" /> : <Icon name="storefront" size="lg" />}</span>
                            <span>{BRAND_NAME}</span>
                        </span>
                        <p className="hp-fslogan">Everything you need, right around the corner.</p>
                        <p className="hp-ftext">Order your everyday favorites online and pick them up at the store in about 15 minutes. No delivery, no waiting in line.</p>
                        <div className="hp-fbadge"><Icon name="verified" /><div><b>In-store pickup only</b><small>Safe, fast, no delivery fees</small></div></div>
                    </div>

                    <div>
                        <h4>Shop</h4>
                        <ul>
                            {categories.slice(0, 7).map((c) => <li key={c._id}><button type="button" className="hp-b hp-flink" onClick={() => onCategory(c._id)}>{c.name}</button></li>)}
                        </ul>
                    </div>

                    <div>
                        <h4>Explore</h4>
                        <ul>
                            <li><button type="button" className="hp-b hp-flink" onClick={() => onNav('top')}>Home</button></li>
                            <li><button type="button" className="hp-b hp-flink" onClick={() => onNav('products')}>All products</button></li>
                            <li><button type="button" className="hp-b hp-flink" onClick={() => onNav('promotions')}>Deals & promotions</button></li>
                            <li><button type="button" className="hp-b hp-flink" onClick={() => onNav('store')}>Store information</button></li>
                        </ul>
                    </div>

                    <div>
                        <h4>My account</h4>
                        <ul>
                            {!user && <li><Link to="/login" className="hp-flink">Log in</Link></li>}
                            {!user && <li><Link to="/register" className="hp-flink">Create an account</Link></li>}
                            <li><Link to="/orders" className="hp-flink">My pickup orders</Link></li>
                            <li><Link to="/membership" className="hp-flink">Membership</Link></li>
                            <li><Link to="/support" className="hp-flink">Support</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Store</h4>
                        <ul className="hp-fstore">
                            <li><Icon name="storefront" size="md" /> {store?.name || BRAND_NAME}</li>
                            <li><Icon name="schedule" size="md" /> {info ? `Today: ${info.text}` : 'Opening hours coming soon'}</li>
                            <li><Icon name="location_on" size="md" /> {address || 'Address coming soon'}</li>
                            {store?.phone && <li><Icon name="call" size="md" /> {store.phone}</li>}
                        </ul>
                    </div>
                </div>

                <div className="hp-fbottom">
                    <div>
                        <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
                        <small>In-store pickup only · Delivery is not offered.</small>
                    </div>
                    <button type="button" className="hp-b hp-totop" onClick={() => onNav('top')}><Icon name="arrow_upward" size="md" /> Back to top</button>
                </div>
            </div>
        </footer>
    );
}