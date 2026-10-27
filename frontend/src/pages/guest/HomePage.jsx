import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, BadgePercent, Bolt, Coffee, Leaf, MapPin, PackageCheck, ShoppingBasket, Sparkles, Timer, Truck } from 'lucide-react';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import { listPromotions } from '../../api/promotion.api';
import { listStores } from '../../api/store.api';
import { PromoCard } from '../../components/home/HomeParts';
import ProductStoreSection from '../../components/home/ProductStoreSection';
import HomeHeader from '../../components/home/HomeHeader';
import HomeFooter from '../../components/home/HomeFooter';
import ProductModal from '../../components/home/ProductModal';
import ScrollProgress from '../../components/home/ScrollProgress';
import MagneticLink from '../../components/home/MagneticLink';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import useHomeStoryAnimations from '../../hooks/useHomeStoryAnimations';
import { BRAND_NAME, norm, bestPromo, promoApplies, promoValueText, openInfo } from '../../components/home/homeConfig';
import '../../styles/home.css';
import '../../styles/home-story.css';

const SECTIONS = ['top', 'promotions', 'products', 'store'];
const STORIES = [
  { icon: Coffee, kicker: 'The little lift', title: 'A familiar favorite, right on time.', body: 'Cold drinks, comforting snacks and the small things that make a busy day easier.' },
  { icon: BadgePercent, kicker: 'A brighter basket', title: 'Good picks. Better prices.', body: 'See current offers on the products they apply to, before you reach the counter.' },
  { icon: PackageCheck, kicker: 'Ready when you are', title: 'Skip the queue. Keep your day.', body: 'Order ahead and collect your bag at the store in about fifteen minutes.' },
];

const go = (id) => {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (id === 'top') window.scrollTo({ top: 0, behavior });
  else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
};

function StoryImage({ product, className = '', label = '' }) {
  return (
    <div className={`story-object-image ${className}`}>
      {product?.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <div className="story-object-fallback"><ShoppingBasket strokeWidth={1.15} /><span>{BRAND_NAME}</span></div>}
      {label && <span className="story-object-label">{label}</span>}
    </div>
  );
}

function StoryPanel({ story, index }) {
  const VisualIcon = story.icon;
  return (
    <article className={`story-panel story-panel-${index + 1}`}>
      <div className="story-panel-visual" aria-hidden="true">
        <span className="story-panel-orbit orbit-a" /><span className="story-panel-orbit orbit-b" />
        <span className="story-panel-icon"><VisualIcon strokeWidth={1.2} /></span>
        <span className="story-panel-index">0{index + 2}</span>
      </div>
      <div className="story-panel-copy">
        <span className="story-kicker">{story.kicker}</span>
        <h3>{story.title}</h3>
        <p>{story.body}</p>
      </div>
    </article>
  );
}

// Browse Products: View Products, View Product Details, Search Products, View Promotions.
// The long-form sections keep the catalog, promotions, and store details connected to the live APIs.
export default function HomePage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promos, setPromos] = useState([]);
  const [promoError, setPromoError] = useState('');
  const [store, setStore] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [q, setQ] = useState('');
  const [catId, setCatId] = useState('');
  const [promoId, setPromoId] = useState('');
  const [sort, setSort] = useState('default');
  const [onlyStock, setOnlyStock] = useState(false);
  const [onlyDeal, setOnlyDeal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [active, setActive] = useState('top');

  useSmoothScroll(true);
  useHomeStoryAnimations(rootRef, `${products.length}-${promos.length}`);

  const load = useCallback(() => {
    setStatus({ loading: true, error: '' });
    Promise.allSettled([listProducts({ limit: 100 }), listCategories(), listPromotions(), listStores()]).then(([p, c, pr, s]) => {
      if (p.status === 'rejected') {
        setStatus({ loading: false, error: 'Could not load products. Please check that the backend is running.' });
        return;
      }
      setProducts(p.value.data.items || []);
      if (c.status === 'fulfilled') setCategories(c.value.data || []);
      if (pr.status === 'fulfilled') { setPromos(pr.value.data || []); setPromoError(''); }
      else setPromoError(pr.reason?.response?.status === 501 ? 'The promotions API is not available on the backend yet.' : 'Could not load promotions.');
      if (s.status === 'fulfilled') setStore(s.value.data[0] || null);
      setStatus({ loading: false, error: '' });
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const elements = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const catById = useMemo(() => Object.fromEntries(categories.map((category) => [category._id, category])), [categories]);
  const deals = useMemo(() => Object.fromEntries(products.map((product) => [product._id, bestPromo(product, promos)])), [products, promos]);
  const activePromo = promos.find((promotion) => promotion._id === promoId);
  const list = useMemo(() => {
    const key = norm(q.trim());
    let result = products.filter((product) => {
      if (catId && product.categoryId?._id !== catId) return false;
      if (activePromo && !promoApplies(activePromo, product)) return false;
      if (onlyStock && product.stockQuantity <= 0) return false;
      if (onlyDeal && !deals[product._id]) return false;
      if (key && !norm(`${product.name} ${product.sku || ''} ${product.categoryId?.name || ''}`).includes(key)) return false;
      return true;
    });
    const price = (product) => deals[product._id]?.finalPrice ?? product.price;
    if (sort === 'default') result = [...result].sort((a, b) => {
      const rank = (product) => Number(product.stockQuantity || 0) <= 0 ? 2 : deals[product._id] ? 0 : 1;
      return rank(a) - rank(b);
    });
    if (sort === 'asc') result = [...result].sort((a, b) => price(a) - price(b));
    if (sort === 'desc') result = [...result].sort((a, b) => price(b) - price(a));
    if (sort === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return result;
  }, [products, q, catId, activePromo, onlyStock, onlyDeal, sort, deals]);

  const leadProduct = list[0] || products[0];
  const related = selected ? products.filter((product) => product.categoryId?._id === selected.categoryId?._id && product._id !== selected._id).slice(0, 4) : [];
  const topPromo = promos.length ? promos.reduce((best, promotion) => (promotion.type === 'percent' && promotion.value > (best.type === 'percent' ? best.value : 0) ? promotion : best), promos[0]) : null;
  const info = openInfo(store);
  const hasFilter = q || catId || promoId || onlyStock || onlyDeal;

  const reset = () => { setQ(''); setCatId(''); setPromoId(''); setOnlyStock(false); setOnlyDeal(false); setSort('default'); };
  const pickCategory = (id) => { setCatId(id); setPromoId(''); };
  const pickCategoryAndGo = (id) => { pickCategory(id); go('products'); };
  const pickPromo = (promotion) => { setPromoId(promotion._id === promoId ? '' : promotion._id); setCatId(''); go('products'); };
  const onSearch = (event) => { event.preventDefault(); navigate(`/products${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <div className="hp story-home" ref={rootRef}>
      <ScrollProgress />
      <HomeHeader store={store} info={info} q={q} setQ={setQ} active={active} onNav={go} onSearch={onSearch} products={products} />

      <main className="story-main">
        {/* 01 — Full-screen introduction */}
        <section className="story-hero" id="top">
          <div className="story-hero-orb" />
          <div className="story-hero-grid story-wrap">
            <div className="story-hero-copy">
              <span className="story-eyebrow story-hero-support"><i /> A little closer to a better day</span>
              <h1 aria-label="Everyday essentials, a little extraordinary.">
                {['Everyday', 'essentials,', 'a little', 'extraordinary.'].map((word, index) => <span className="story-word-mask" key={word}><span className="story-word" data-index={index}>{word}</span></span>)}
              </h1>
              <p className="story-hero-lead story-hero-support">Thoughtful everyday picks, good prices, and a quick stop right around the corner.</p>
              <div className="story-hero-actions story-hero-support">
                <button type="button" className="story-button story-button-light" onClick={() => go('products')}>Explore the shelves <ArrowRight size={17} /></button>
                <button type="button" className="story-text-button" onClick={() => go('promotions')}>See today’s offers</button>
              </div>
              <div className="story-hero-proof story-hero-support"><span><Bolt size={15} /> Ready in ~15 minutes</span><span><PackageCheck size={15} /> Store pickup</span></div>
            </div>
            <div className="story-hero-stage">
              <div className="story-stage-ring ring-one" /><div className="story-stage-ring ring-two" />
              <div className="story-hero-visual"><StoryImage product={leadProduct} label={leadProduct?.name || 'Everyday picks'} /></div>
              <div className="story-float story-float-deal"><Sparkles size={16} /><span>{topPromo ? promoValueText(topPromo) : 'Little joys, daily'}</span></div>
              <div className="story-float story-float-pickup"><Timer size={16} /><span>Pick up in 15m</span></div>
              <div className="story-stage-glint glint-one" /><div className="story-stage-glint glint-two" />
            </div>
          </div>
          <button type="button" className="story-scroll-cue story-hero-support" onClick={() => go('promotions')}><span>Scroll to explore</span><ArrowDown size={15} /></button>
          <div className="story-hero-index"><span>01</span><i /><span>07</span></div>
        </section>

        {/* 02 — Pinned, reversible scroll transformation */}
        <section className="story-transform" id="promotions">
          <div className="story-transform-backdrop">
            <div className="story-transform-inner story-wrap">
              <div className="story-transform-copy">
                <span className="story-kicker">A neighborhood ritual</span>
                <div className="story-lines">
                  <h2 className="story-line story-line-one">The day moves fast.</h2>
                  <h2 className="story-line story-line-two">Your corner store keeps up.</h2>
                  <h2 className="story-line story-line-three">Good things, made easy.</h2>
                </div>
                <p>From a quick morning coffee to the little thing you forgot, your everyday stop is ready when you are.</p>
                <button type="button" className="story-inline-link" onClick={() => go('story-panels')}>See how it works <ArrowRight size={16} /></button>
              </div>
              <div className="story-transform-stage">
                <span className="story-transform-glow" />
                <div className="story-transform-object"><StoryImage product={leadProduct} label={topPromo ? promoValueText(topPromo) : 'QUICK PICK'} /></div>
                <span className="story-transform-caption">YOUR EVERYDAY, IN MOTION</span>
              </div>
            </div>
            <div className="story-transform-progress"><i /><i /><i /></div>
          </div>
        </section>

        {/* A live promotion ribbon carries the pinned scene into the catalog */}
        <section className="story-promo-shelf" aria-label="Active promotions">
          <div className="story-wrap story-promo-shelf-inner">
            <div className="story-promo-heading"><span className="story-kicker">A little extra in your basket</span><h2>Good deals, right on your route.</h2><Link to="/promotions">All promotions <ArrowRight size={15} /></Link></div>
            {status.loading ? <p className="story-muted">Finding today’s offers…</p>
              : promoError ? <p className="story-message">{promoError}</p>
                : promos.length ? <div className="story-promo-row">{promos.slice(0, 3).map((promotion) => <PromoCard key={promotion._id} promo={promotion} active={promotion._id === promoId} onPick={pickPromo} />)}</div>
                  : <p className="story-message">No promotions are active right now. Check back soon.</p>}
          </div>
        </section>

        {/* 03 — Live products arranged as an interactive grocery aisle */}
        <ProductStoreSection
          products={list}
          allProducts={products}
          categories={categories}
          categoryId={catId}
          onChooseCategory={pickCategory}
          deals={deals}
          onOpen={setSelected}
          query={q}
          setQuery={setQ}
          sort={sort}
          setSort={setSort}
          onlyStock={onlyStock}
          setOnlyStock={setOnlyStock}
          onlyDeal={onlyDeal}
          setOnlyDeal={setOnlyDeal}
          hasFilter={hasFilter}
          onReset={reset}
          loading={status.loading}
          error={status.error}
          onRetry={load}
        />

        {/* 04 — Horizontal scroll story on desktop; natural vertical panels on mobile */}
        <section className="story-horizontal" id="story-panels">
          <div className="story-horizontal-track">
            <div className="story-horizontal-intro story-panel">
              <span className="story-kicker">Less errand. More day.</span>
              <h2>A good stop<br />changes the pace.</h2>
              <p>Four little reasons to keep your neighborhood store close.</p>
              <span className="story-horizontal-cue"><ArrowRight size={16} /> Keep scrolling</span>
            </div>
            {STORIES.map((story, index) => <StoryPanel key={story.kicker} story={story} index={index} />)}
          </div>
          <div className="story-horizontal-progress"><span>01</span><i /><span>04</span></div>
        </section>

        {/* 05 — Sequential feature reveal */}
        <section className="story-features" id="store">
          <div className="story-wrap">
            <div className="story-feature-heading"><span className="story-kicker">A better little stop</span><h2>Designed around<br /><em>your everyday.</em></h2><p>Simple from the first pick to the moment you’re back on your way.</p></div>
            <div className="story-feature-list">
              <article className="story-feature feature-pickup"><div className="story-feature-visual story-feature-parallax"><span className="story-feature-number">01</span><Truck /><span className="story-feature-orbit" /></div><div className="story-feature-copy"><span>01 / PICK UP</span><h3>Order now.<br />Collect in minutes.</h3><p>Skip delivery waits. Your order is prepared at the store and ready when you arrive.</p></div></article>
              <article className="story-feature feature-deals"><div className="story-feature-visual story-feature-parallax"><span className="story-feature-number">02</span><BadgePercent /><span className="story-feature-orbit" /></div><div className="story-feature-copy"><span>02 / GOOD VALUE</span><h3>See the offer.<br />Know the price.</h3><p>Current promotions appear right beside eligible items, so your basket stays clear.</p><Link to="/promotions">Explore promotions <ArrowRight size={15} /></Link></div></article>
              <article className="story-feature feature-nearby"><div className="story-feature-visual story-feature-parallax"><span className="story-feature-number">03</span><MapPin /><span className="story-feature-orbit" /></div><div className="story-feature-copy"><span>03 / AROUND THE CORNER</span><h3>Your everyday store,<br />a little closer.</h3><p>{store?.address && !store.address.startsWith('(') ? store.address : 'Find everyday favorites at your neighborhood convenience store.'}</p><div className="story-store-line"><i />{store?.name || BRAND_NAME}{info && <small>{info.open ? 'Open now' : 'Closed'} · {info.text}</small>}</div></div></article>
            </div>
          </div>
        </section>

        {/* 06 — Shared visual expands into the closing scene */}
        <section className="story-cinema" aria-label="A little closer to your day">
          <div className="story-cinema-disc"><span className="story-cinema-star"><Sparkles /></span></div>
          <div className="story-cinema-content story-wrap"><span className="story-kicker">Right around the corner</span><h2 className="story-cinema-title">Your day, with<br />one less thing to do.</h2><p>Stock up, find a favorite, and get back to everything else.</p></div>
        </section>

        {/* 07 — Final call to action */}
        <section className="story-cta" onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
          event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
        }}>
          <div className="story-cta-glow" />
          <div className="story-cta-content story-wrap"><span className="story-kicker">Take the easy route</span><h2>Make room for<br /><em>the rest of your day.</em></h2><p>Find your next everyday favorite. We’ll have it ready around the corner.</p><MagneticLink className="story-button story-button-light story-magnetic" to="/products">Explore the shelves <ArrowRight size={17} /></MagneticLink><span className="story-cta-footnote"><Timer size={14} /> Store pickup in about 15 minutes</span></div>
          <span className="story-cta-wordmark">QUICK <i>·</i> EASY <i>·</i> CLOSE</span>
        </section>
      </main>

      {/* 08 — Brand footer */}
      <div className="story-footer-reveal"><HomeFooter categories={categories} store={store} info={info} onNav={go} onCategory={pickCategoryAndGo} /></div>

      {selected && <ProductModal product={selected} cat={catById[selected.categoryId?._id]} promos={promos} related={related} onClose={() => setSelected(null)} onOpen={setSelected} />}
    </div>
  );
}
