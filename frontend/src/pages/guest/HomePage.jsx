import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../../api/product.api';
import { listStores } from '../../api/store.api';
import { listCategories } from '../../api/category.api';
import { listPromotions } from '../../api/promotion.api';
import Icon from '../../components/common/Icon';
import ProductStoreSection from '../../components/home/ProductStoreSection';
import ProductModal from '../../components/home/ProductModal';
import PickupJourney from '../../components/home/PickupJourney';
import { Media } from '../../components/home/HomeParts';
import { openInfo } from '../../components/home/homeConfig';
import { estimatePromo } from '../../utils/promoPrice';
import { matchesProductSearch } from '../../utils/productSearch';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import useHomeStoryAnimations from '../../hooks/useHomeStoryAnimations';
import '../../styles/pickup-home.css';

export default function HomePage() {
  const rootRef = useRef(null);
  const [data, setData] = useState({ products: [], categories: [], promotions: [], store: null });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [categoryId, setCategoryId] = useState(''), [query, setQuery] = useState(''), [sort, setSort] = useState('default');
  const [onlyStock, setOnlyStock] = useState(false), [onlyDeal, setOnlyDeal] = useState(false);
  const [selected, setSelected] = useState(null), [lastSelected, setLastSelected] = useState(null);
  const scroll = useSmoothScroll(!selected);
  useHomeStoryAnimations(rootRef, loading + ':' + data.products.length);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    const catalog = async () => {
      let products = [], page = 1, total = Infinity;
      while (alive && products.length < total) {
        const { data: result } = await listProducts({ limit: 100, page, status: 'active' });
        products = products.concat(result.items || []);
        total = result.total || 0;
        if (!result.items?.length) break;
        page += 1;
      }
      return products;
    };
    Promise.allSettled([catalog(), listCategories(), listPromotions(), listStores()]).then(([p, c, offers, stores]) => {
      if (!alive) return;
      setData({ products: p.status === 'fulfilled' ? p.value : [], categories: c.status === 'fulfilled' ? c.value.data || [] : [], promotions: offers.status === 'fulfilled' ? offers.value.data.items || [] : [], store: stores.status === 'fulfilled' ? stores.value.data[0] || null : null });
      if (p.status === 'rejected') setError('Could not load the shelves. Please try again.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [reload]);

  const deals = useMemo(() => Object.fromEntries(data.products.flatMap((product) => {
    const promo = estimatePromo(product, data.promotions);
    return promo.price < product.price ? [[product._id, { finalPrice: promo.price, percent: Math.round((product.price - promo.price) / product.price * 100) }]] : [];
  })), [data.products, data.promotions]);
  const products = useMemo(() => data.products.filter((product) =>
    (!categoryId || String(product.categoryId?._id || product.categoryId) === categoryId) &&
    (!query || matchesProductSearch(product, query)) && (!onlyStock || product.stockQuantity > 0) && (!onlyDeal || deals[product._id])
  ).sort((a, b) => {
    const price = (p) => deals[p._id]?.finalPrice ?? p.price;
    if (sort === 'asc') return price(a) - price(b);
    if (sort === 'desc') return price(b) - price(a);
    if (sort === 'name') return a.name.localeCompare(b.name, 'vi');
    return Number(b.stockQuantity > 0) - Number(a.stockQuantity > 0) || Number(!!deals[b._id]) - Number(!!deals[a._id]);
  }), [data.products, categoryId, query, onlyStock, onlyDeal, sort, deals]);
  const heroProducts = useMemo(() => [...data.products].sort((a, b) => Number(!!b.images?.[0]) - Number(!!a.images?.[0])).slice(0, 3), [data.products]);
  const openProduct = useCallback((product) => { setSelected(product); setLastSelected(product); }, []);
  const closeProduct = useCallback(() => setSelected(null), []);
  const reset = () => { setCategoryId(''); setQuery(''); setSort('default'); setOnlyStock(false); setOnlyDeal(false); };
  const explore = (event) => {
    event.preventDefault();
    const target = document.getElementById('products');
    if (scroll.current) scroll.current.scrollTo(target, { offset: -110 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 110, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const info = openInfo(data.store);
  return <main className="quick-home" ref={rootRef}>
    <section className="quick-hero" aria-labelledby="quick-hero-title">
      <div className="quick-hero-orbit" aria-hidden="true" />
      <div className="quick-wrap quick-hero-layout">
        <div className="quick-hero-copy">
          <span className="quick-kicker"><i /> WELCOME TO YOUR EVERYDAY STORE</span>
          <h1 id="quick-hero-title"><span className="quick-word-mask"><span className="quick-word">Quick picks.</span></span><span className="quick-word-mask"><span className="quick-word">Happy days<span className="quick-dot">.</span></span></span></h1>
          <p className="quick-hero-lead">Your everyday store.<br /><b>Just a few clicks away.</b></p>
          <p>Find your favorites, order online, and swing by QUICK when they're ready. Your day, made a little easier.</p>
          <div className="quick-actions"><a className="quick-button" href="#products" onClick={explore}>Start shopping<Icon name="arrow_forward" /></a><Link className="quick-link" to="/orders">Track my order<Icon name="north_east" size="sm" /></Link></div>
          <span className="quick-hero-note"><Icon name="storefront" size="sm" /> Online ordering. In-store pickup.</span>
        </div>
        <div className="quick-hero-art" aria-hidden="true">
          <div className="quick-hero-sticker">A LITTLE STOP.<br /><b>A LOT TO LOVE.</b><Icon name="favorite" /></div>
          <div className="quick-doorway">
            <div className="quick-store-sign"><Icon name="storefront" /> QUICK <small>QUICK PICKS, HAPPY DAYS.</small></div>
            <div className="quick-awning" />
            <div className="quick-window"><span className="quick-window-caption">YOUR DAILY FAVORITES</span><div className="quick-window-products">{heroProducts.length ? heroProducts.map((product) => <div key={product._id}><Media product={product} cat={product.categoryId} /><span>{product.name}</span></div>) : <div className="quick-empty-art"><Icon name="shopping_basket" /><span>Everyday essentials</span></div>}</div><div className="quick-window-shelf" /><span className="quick-window-pickup"><Icon name="shopping_bag" /> PICK UP A LITTLE HAPPINESS</span></div>
            <div className="quick-door-floor" />
          </div>
          <span className="quick-open-tag"><Icon name="local_mall" /> ORDER ONLINE<br /><b>PICK UP HERE</b></span>
        </div>
      </div>
      <div className="quick-wrap quick-hero-bottom"><span>01 / DISCOVER</span><a href="#products" onClick={explore}>Scroll to explore<Icon name="south" size="sm" /></a><span>CHOOSE · PAY · PICK UP</span></div>
    </section>
    <div className="quick-ribbon" aria-hidden="true"><span>GOOD THINGS ON EVERY SHELF</span><Icon name="shopping_basket" /><span>PICK YOUR EVERYDAY FAVORITES</span><Icon name="storefront" /><span>YOUR NEXT STOP: QUICK</span></div>
    <ProductStoreSection products={products} allProducts={data.products} categories={data.categories} categoryId={categoryId} onChooseCategory={setCategoryId} deals={deals} onOpen={openProduct} query={query} setQuery={setQuery} sort={sort} setSort={setSort} onlyStock={onlyStock} setOnlyStock={setOnlyStock} onlyDeal={onlyDeal} setOnlyDeal={setOnlyDeal} hasFilter={!!(categoryId || query || onlyStock || onlyDeal || sort !== 'default')} onReset={reset} loading={loading} error={error} onRetry={() => setReload((v) => v + 1)} />
    <div className="quick-wrap quick-shelf-links"><span>Choose a product to see details and add it to your cart.</span><Link to="/products">Explore all products<Icon name="arrow_forward" size="sm" /></Link><Link to="/promotions">Current offers<Icon name="local_offer" size="sm" /></Link></div>
    <PickupJourney product={lastSelected || heroProducts[0]} store={data.store} />
    <section className="quick-finale" id="store" aria-labelledby="quick-finale-title">
      <div className="quick-wrap">
        <span className="quick-kicker quick-reveal">YOUR DAY. YOUR PICKS. YOUR QUICK.</span>
        <h2 id="quick-finale-title" className="quick-reveal">Quick picks.<br /><span>Happy days.</span></h2>
        <div className="quick-actions quick-reveal"><a href="#products" onClick={explore} className="quick-button">Start shopping<Icon name="arrow_forward" /></a><Link to="/products" className="quick-link">Explore products<Icon name="north_east" size="sm" /></Link></div>
        <div className="quick-store-address"><Icon name="storefront" /><div><b>{data.store?.name || 'QUICK'}</b><p>{data.store?.address || 'Store details are currently unavailable.'}</p>{info && <small>{info.open ? 'Open now' : 'Currently closed'} · {info.text}</small>}</div>{data.store?.phone && <a href={'tel:' + data.store.phone}>{data.store.phone}</a>}</div>
      </div>
    </section>
    {selected && <ProductModal key={selected._id} product={selected} promos={data.promotions} onClose={closeProduct} />}
  </main>;
}
