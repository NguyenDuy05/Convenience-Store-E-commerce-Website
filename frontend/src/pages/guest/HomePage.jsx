import { useCallback, useEffect, useMemo, useState } from 'react';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import { listPromotions } from '../../api/promotion.api';
import { listStores } from '../../api/store.api';
import { Icon, ProductTile, PromoCard, CategorySign } from '../../components/home/HomeParts';
import HomeHeader from '../../components/home/HomeHeader';
import HomeFooter from '../../components/home/HomeFooter';
import ProductModal from '../../components/home/ProductModal';
import { BRAND_NAME, HERO_IMAGE, norm, bestPromo, promoApplies, promoValueText, openInfo } from '../../components/home/homeConfig';
import '../../styles/home.css';

const PAGE = 8;
const SECTIONS = ['top', 'promotions', 'products', 'store'];
const go = (id) => {
  if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Browse Products: View Products, View Product Details, Search Products, View Promotions
export default function HomePage() {
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
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const [active, setActive] = useState('top');

  const load = useCallback(() => {
    setStatus({ loading: true, error: '' });
    Promise.allSettled([listProducts({ limit: 100 }), listCategories(), listPromotions(), listStores()]).then(([p, c, pr, s]) => {
      if (p.status === 'rejected') {
        setStatus({ loading: false, error: 'Could not load products. Please check that the backend is running.' });
        return;
      }
      setProducts(p.value.data.items || []);
      if (c.status === 'fulfilled') setCategories(c.value.data);

      if (pr.status === 'fulfilled') {
        const data = pr.value.data;

        setPromos(Array.isArray(data?.items) ? data.items : []);
        setPromoError('');
      }

      else setPromoError(pr.reason?.response?.status === 501 ? 'The promotions API is not available on the backend yet.' : 'Could not load promotions.');
      if (s.status === 'fulfilled') setStore(s.value.data[0] || null);
      setStatus({ loading: false, error: '' });
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setShown(PAGE); }, [q, catId, promoId, sort, onlyStock, onlyDeal]);

  // Highlight the current section in the header menu
  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c._id, c])), [categories]);
  const deals = useMemo(() => Object.fromEntries(products.map((p) => [p._id, bestPromo(p, promos)])), [products, promos]);
  const counts = useMemo(() => {
    const m = {};
    products.forEach((p) => { const id = p.categoryId?._id; m[id] = (m[id] || 0) + 1; });
    return m;
  }, [products]);
  const activePromo = promos.find((x) => x._id === promoId);

  const list = useMemo(() => {
    const key = norm(q.trim());
    let r = products.filter((p) => {
      if (catId && p.categoryId?._id !== catId) return false;
      if (activePromo && !promoApplies(activePromo, p)) return false;
      if (onlyStock && p.stockQuantity <= 0) return false;
      if (onlyDeal && !deals[p._id]) return false;
      if (key && !norm(`${p.name} ${p.sku} ${p.categoryId?.name || ''}`).includes(key)) return false;
      return true;
    });
    const price = (p) => (deals[p._id] ? deals[p._id].finalPrice : p.price);
    if (sort === 'asc') r = [...r].sort((a, b) => price(a) - price(b));
    if (sort === 'desc') r = [...r].sort((a, b) => price(b) - price(a));
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return r;
  }, [products, q, catId, activePromo, onlyStock, onlyDeal, sort, deals]);

  const related = selected ? products.filter((p) => p.categoryId?._id === selected.categoryId?._id && p._id !== selected._id).slice(0, 4) : [];
  const topPromo = promos.length ? promos.reduce((a, b) => (b.type === 'percent' && b.value > (a.type === 'percent' ? a.value : 0) ? b : a), promos[0]) : null;
  const info = openInfo(store);
  const hasFilter = q || catId || promoId || onlyStock || onlyDeal;
  const reset = () => { setQ(''); setCatId(''); setPromoId(''); setOnlyStock(false); setOnlyDeal(false); setSort('default'); };

  const pickCategory = (id) => { setCatId(id); setPromoId(''); };
  const pickCategoryAndGo = (id) => { pickCategory(id); go('products'); };
  const pickPromo = (promo) => { setPromoId(promo._id === promoId ? '' : promo._id); setCatId(''); if (promo._id !== promoId) go('products'); };
  const onSearch = (e) => { e.preventDefault(); go('products'); };

  return (
    <div className="hp">
      <HomeHeader store={store} info={info} q={q} setQ={setQ} active={active} onNav={go} onSearch={onSearch} />

      {/* ===== HERO ===== */}
      <section className="hp-hero" id="top">
        <div className="hp-wrap hp-hero-grid">
          <div>
            <span className="hp-eyebrow"><i /> Order online · Pick up in store</span>
            <h1>Everything you need, right around the corner.</h1>
            <p className="hp-lead">Browse snacks, instant noodles, rice balls, drinks and milk. Order ahead, stop by the store and pick it up. No queue, no delivery wait.</p>

            <div className="hp-ctas">
              <button type="button" className="hp-b hp-cta" onClick={() => go('products')}>Shop now <Icon name="arrow_forward" size="md" /></button>
              <button type="button" className="hp-b hp-cta ghost" onClick={() => go('promotions')}><Icon name="local_offer" size="md" /> View deals</button>
            </div>

            <div className="hp-quick">
              {categories.slice(0, 5).map((c) => (
                <button type="button" key={c._id} className="hp-b hp-pill" onClick={() => pickCategoryAndGo(c._id)}>{c.name}</button>
              ))}
            </div>

            <div className="hp-stats">
              <div><b>{products.length}</b><span>Products</span></div>
              <div><b>{categories.length}</b><span>Categories</span></div>
              <div><b>{promos.length}</b><span>Active deals</span></div>
              <div><b className={info?.open ? 'ok' : ''}>{info ? (info.open ? 'Open now' : 'Closed') : '—'}</b><span>{info?.text || 'Opening hours'}</span></div>
            </div>
          </div>

          {/* Hero image: left empty. Set HERO_IMAGE in homeConfig.js */}
          <div className={`hp-visual ${HERO_IMAGE ? 'has-img' : ''}`} style={HERO_IMAGE ? { backgroundImage: `url(${HERO_IMAGE})` } : undefined}>
            <div className="hp-sign-hang"><Icon name="storefront" size="lg" /> <b>{BRAND_NAME}</b> <small>Open daily</small></div>
            {!HERO_IMAGE && <Icon name="local_grocery_store" size="hero" />}
            {topPromo && <div className="hp-ptag">Up to {promoValueText(topPromo)} off</div>}
            <div className="hp-float"><Icon name="qr_code_scanner" size="md" /> Ready in about 15 minutes</div>
          </div>
        </div>
      </section>

      {/* ===== PERKS ===== */}
      <section className="hp-wrap hp-perks">
        {[['storefront', 'Store pickup', 'No delivery, no shipping fees'], ['bolt', 'Ready in ~15 mins', 'Order now, collect in minutes'], ['sell', 'Clear pricing', 'Deals shown right on each product'], ['loyalty', 'Earn rewards', 'Collect points on every purchase']].map(([ic, t, d]) => (
          <div className="hp-perk" key={t}><span><Icon name={ic} /></span><div><b>{t}</b><small>{d}</small></div></div>
        ))}
      </section>

      {/* ===== PROMOTIONS ===== */}
      <section className="hp-section hp-tinted" id="promotions">
        <div className="hp-wrap">
          <div className="hp-head"><span>Deals</span><h2>Active promotions</h2><p>Tap a deal to see the products it applies to.</p></div>
          {status.loading ? <p className="hp-muted hp-center">Loading promotions...</p>
            : promoError ? <p className="hp-empty">{promoError}</p>
              : promos.length === 0 ? <p className="hp-empty">There are no promotions right now. Please check back soon.</p>
                : <div className="hp-promos">{promos.map((x) => <PromoCard key={x._id} promo={x} active={x._id === promoId} onPick={pickPromo} />)}</div>}
        </div>
      </section>

      {/* ===== PRODUCTS ===== */}
      <section className="hp-section" id="products">
        <div className="hp-wrap">
          <div className="hp-head"><span>Shelves</span><h2>All products</h2><p>Browse by category, search, or sort by price.</p></div>

          <div className="hp-signs">
            <CategorySign count={products.length} active={!catId} onClick={() => pickCategory('')} />
            {categories.map((c) => <CategorySign key={c._id} cat={c} count={counts[c._id] || 0} active={catId === c._id} onClick={() => pickCategory(c._id)} />)}
          </div>

          <div className="hp-toolbar">
            <label className="hp-field"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU or category..." />
              {q && <button type="button" className="hp-b hp-clear" onClick={() => setQ('')} aria-label="Clear search"><Icon name="close" size="md" /></button>}
            </label>
            <select className="hp-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              <option value="default">Sort: Default</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option><option value="name">Name: A to Z</option>
            </select>
            <button type="button" className={`hp-b hp-toggle ${onlyStock ? 'on' : ''}`} onClick={() => setOnlyStock(!onlyStock)}><Icon name="inventory_2" size="md" /> In stock</button>
            <button type="button" className={`hp-b hp-toggle ${onlyDeal ? 'on' : ''}`} onClick={() => setOnlyDeal(!onlyDeal)}><Icon name="local_offer" size="md" /> On sale</button>
          </div>

          <div className="hp-result">
            <span><b>{list.length}</b> {list.length === 1 ? 'product' : 'products'}{activePromo && <> · deal: <em>{activePromo.name}</em></>}</span>
            {hasFilter && <button type="button" className="hp-b hp-link" onClick={reset}>Clear filters</button>}
          </div>

          {status.error ? (
            <div className="hp-empty">{status.error}<button type="button" className="hp-b hp-cta" onClick={load}>Try again</button></div>
          ) : status.loading ? (
            <div className="hp-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="hp-card hp-skel" />)}</div>
          ) : list.length === 0 ? (
            <div className="hp-empty">No products match your search.<button type="button" className="hp-b hp-cta" onClick={reset}>Show all products</button></div>
          ) : (
            <>
              <div className="hp-grid">
                {list.slice(0, shown).map((p) => <ProductTile key={p._id} product={p} cat={catById[p.categoryId?._id]} deal={deals[p._id]} onOpen={setSelected} />)}
              </div>
              {shown < list.length && (
                <div className="hp-more"><button type="button" className="hp-b hp-cta ghost" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button></div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== HOW IT WORKS + STORE ===== */}
      <section className="hp-section hp-tinted" id="store">
        <div className="hp-wrap hp-how">
          <div>
            <div className="hp-head left"><span>How it works</span><h2>Pick up in 3 easy steps</h2></div>
            <ol className="hp-steps">
              <li><i>1</i><div><b>Choose your items</b><small>See prices, deals and stock right on the page.</small></div></li>
              <li><i>2</i><div><b>Order online</b><small>Log in, add items to your cart and pay.</small></div></li>
              <li><i>3</i><div><b>Pick up in store</b><small>Show your order code to our staff and collect your items.</small></div></li>
            </ol>
          </div>
          <div className="hp-store">
            <b><Icon name="storefront" /> {store?.name || BRAND_NAME}</b>
            <p><Icon name="schedule" size="md" /> {info ? `Today: ${info.text}` : 'Opening hours coming soon'}</p>
            <p><Icon name="location_on" size="md" /> {store?.address && !store.address.startsWith('(') ? store.address : 'Address coming soon'}</p>
            {store?.phone && <p><Icon name="call" size="md" /> {store.phone}</p>}
          </div>
        </div>
      </section>

      <HomeFooter categories={categories} store={store} info={info} onNav={go} onCategory={pickCategoryAndGo} />

      {selected && (
        <ProductModal product={selected} cat={catById[selected.categoryId?._id]} promos={promos} related={related} onClose={() => setSelected(null)} onOpen={setSelected} />
      )}
    </div>
  );
}