import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { Media, Icon } from './HomeParts';
import { BRAND_NAME, money, catMeta } from './homeConfig';
import '../../styles/home-store.css';

const ALL = '__all__';
const lettersOf = (text) => {
  const value = String(text || '').normalize('NFC');
  if (typeof Intl.Segmenter === 'function') return [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(value)].map((part) => part.segment);
  return Array.from(value);
};

function ShelfProduct({ product, category, deal, onOpen }) {
  const out = Number(product.stockQuantity || 0) <= 0;
  return (
    <button type="button" className={`aisle-product${out ? ' is-out' : ''}${deal ? ' has-deal' : ''}`} onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
      <span className="aisle-product-art">
        <Media product={product} cat={category} />
        {deal && <span className="aisle-sale-badge">-{deal.percent}%</span>}
        {out && <span className="aisle-stock-badge">Out of stock</span>}
        <span className="aisle-quick-view"><ArrowUpRight size={15} /> Quick view</span>
      </span>
      <span className="aisle-product-info">
        <span className="aisle-product-name">{product.name}</span>
        <span className="aisle-product-prices"><b>{money(deal ? deal.finalPrice : product.price)}</b>{deal && <s>{money(product.price)}</s>}</span>
        <span className={`aisle-product-stock${out ? ' out' : ''}`}><i />{out ? 'Currently unavailable' : `${product.stockQuantity} ${product.unit || 'in stock'}`}</span>
      </span>
    </button>
  );
}

export default function ProductStoreSection({
  products, allProducts, categories, categoryId, onChooseCategory, deals, onOpen,
  query, setQuery, sort, setSort, onlyStock, setOnlyStock, onlyDeal, setOnlyDeal,
  hasFilter, onReset, loading, error, onRetry,
}) {
  const categoryEntries = useMemo(() => [{ _id: ALL, name: 'All products', slug: 'all' }, ...categories], [categories]);
  const selectedIndex = Math.max(0, categoryEntries.findIndex((category) => category._id === (categoryId || ALL)));
  const [displayedCategory, setDisplayedCategory] = useState(categoryId || ALL);
  const [displayedProducts, setDisplayedProducts] = useState(products);
  const [columns, setColumns] = useState(4);
  const [shelfRows, setShelfRows] = useState(3);
  const [morePages, setMorePages] = useState(0);
  const cameraRef = useRef(null);
  const frameRef = useRef(null);
  const pointerRef = useRef(null);
  const draggingRef = useRef(false);
  const wheelRef = useRef({ amount: 0, timer: 0 });
  const latestRef = useRef({ categoryId, products });
  latestRef.current = { categoryId: categoryId || ALL, products };

  const categoryCount = useCallback((id) => id === ALL
    ? allProducts.length
    : allProducts.filter((product) => product.categoryId?._id === id).length, [allProducts]);
  const activeCategory = categoryEntries.find((category) => category._id === displayedCategory) || categoryEntries[0];
  const categoryIndex = Math.max(0, categoryEntries.findIndex((category) => category._id === displayedCategory));
  const letters = lettersOf(activeCategory?.name || 'All products');
  const meta = catMeta(activeCategory?.slug);

  useEffect(() => {
    const updateColumns = () => {
      setColumns(window.innerWidth <= 700 ? 2 : window.innerWidth <= 1100 ? 3 : 4);
      setShelfRows(window.innerWidth <= 700 ? 2 : 3);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns, { passive: true });
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => { setMorePages(0); }, [categoryId, query, sort, onlyStock, onlyDeal]);

  useEffect(() => {
    if (!cameraRef.current) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ((categoryId || ALL) === displayedCategory) {
      setDisplayedProducts(products);
      return undefined;
    }
    if (reduceMotion) {
      setDisplayedProducts(products);
      setDisplayedCategory(categoryId || ALL);
      gsap.set(cameraRef.current, { clearProps: 'transform,opacity' });
      return undefined;
    }
    const oldIndex = Math.max(0, categoryEntries.findIndex((category) => category._id === displayedCategory));
    const nextIndex = Math.max(0, categoryEntries.findIndex((category) => category._id === (categoryId || ALL)));
    const direction = nextIndex >= oldIndex ? 1 : -1;
    const camera = cameraRef.current;
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' }, onComplete: () => setDisplayedCategory(latestRef.current.categoryId) });
    timeline.to(camera, { x: direction * 135, rotateY: direction * 11, scale: 0.96, opacity: 0.12, duration: 0.32, ease: 'power2.in' })
      .add(() => setDisplayedProducts(latestRef.current.products))
      .fromTo(camera, { x: -direction * 155, rotateY: -direction * 12, scale: 0.94, opacity: 0.25 }, {
        x: 0, rotateY: 0, scale: 1, opacity: 1, duration: 0.58, ease: 'power3.out', immediateRender: false,
      });
    return () => timeline.kill();
  }, [categoryId, displayedCategory, products, categoryEntries]);

  useEffect(() => {
    if (!cameraRef.current) return undefined;
    const chars = cameraRef.current.parentElement?.querySelectorAll('.aisle-kinetic-letter');
    if (!chars?.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(chars, { clearProps: 'transform,opacity' });
      return undefined;
    }
    gsap.fromTo(chars, { yPercent: 115, rotateX: -65, opacity: 0 }, {
      yPercent: 0, rotateX: 0, opacity: 1, duration: 0.55, stagger: 0.016, ease: 'power3.out',
    });
    return undefined;
  }, [displayedCategory]);

  const moveTo = useCallback((index) => {
    const next = Math.max(0, Math.min(categoryEntries.length - 1, index));
    const id = categoryEntries[next]?._id;
    if (id !== undefined) onChooseCategory(id === ALL ? '' : id);
  }, [categoryEntries, onChooseCategory]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (event) => {
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.15) return;
      event.preventDefault();
      wheelRef.current.amount += event.deltaX;
      window.clearTimeout(wheelRef.current.timer);
      if (Math.abs(wheelRef.current.amount) >= 65) {
        const direction = wheelRef.current.amount > 0 ? 1 : -1;
        wheelRef.current.amount = 0;
        moveTo(selectedIndex + direction);
      } else wheelRef.current.timer = window.setTimeout(() => { wheelRef.current.amount = 0; }, 180);
    };
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => { frame.removeEventListener('wheel', onWheel); window.clearTimeout(wheelRef.current.timer); };
  }, [moveTo, selectedIndex]);

  const pointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('button, a, input, select, textarea')) return;
    pointerRef.current = { x: event.clientX, pointerId: event.pointerId };
    draggingRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event) => {
    if (!pointerRef.current || pointerRef.current.pointerId !== event.pointerId) return;
    const delta = event.clientX - pointerRef.current.x;
    if (Math.abs(delta) > 7) draggingRef.current = true;
    if (draggingRef.current && cameraRef.current) gsap.set(cameraRef.current, { x: delta * 0.24, rotateY: gsap.utils.clamp(-7, 7, delta * -0.017) });
  };
  const pointerUp = (event) => {
    if (!pointerRef.current) return;
    const delta = event.clientX - pointerRef.current.x;
    if (Math.abs(delta) > 72) moveTo(selectedIndex + (delta < 0 ? 1 : -1));
    else if (cameraRef.current) gsap.to(cameraRef.current, { x: 0, rotateY: 0, duration: 0.3, ease: 'power3.out', overwrite: true });
    pointerRef.current = null;
    window.setTimeout(() => { draggingRef.current = false; }, 0);
  };

  const pageCapacity = columns * shelfRows;
  const visibleProducts = displayedProducts.slice(0, pageCapacity * (morePages + 1));
  const rows = [];
  for (let index = 0; index < visibleProducts.length; index += columns) rows.push(visibleProducts.slice(index, index + columns));
  const title = activeCategory?._id === ALL ? 'All products' : activeCategory?.name || 'Products';

  return (
    <section className="aisle-store" id="products">
      <div className="aisle-store-inner">
        <header className="aisle-heading">
          <div className="aisle-heading-copy"><span className="aisle-eyebrow"><i /> AISLE BY AISLE <b>·</b> QUICK MARKET</span><h2>Shop the everyday.</h2><p>Take a little walk through the shelves and find what you need.</p></div>
          <div className="aisle-controls-top">
            <label className="aisle-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find something good..." aria-label="Search products" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label>
            <label className="aisle-sort"><SlidersHorizontal size={15} /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="default">Featured</option><option value="asc">Price: low to high</option><option value="desc">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
          </div>
        </header>

        <div className="aisle-category-navigation"><div className="aisle-tabs" role="tablist" aria-label="Product aisles">
          {categoryEntries.map((category, index) => <button type="button" role="tab" aria-selected={selectedIndex === index} className={selectedIndex === index ? 'active' : ''} key={category._id} onClick={() => moveTo(index)}><span><Icon name={category._id === ALL ? 'apps' : catMeta(category.slug).icon} />{category.name}</span><small>{categoryCount(category._id)}</small></button>)}
        </div><div className="aisle-navigation-arrows"><button type="button" aria-label="Previous aisle" disabled={selectedIndex <= 0} onClick={() => moveTo(selectedIndex - 1)}><ChevronLeft size={17} /></button><button type="button" aria-label="Next aisle" disabled={selectedIndex >= categoryEntries.length - 1} onClick={() => moveTo(selectedIndex + 1)}><ChevronRight size={17} /></button></div></div>

        <div className="aisle-status-line"><span className="aisle-status-led" /><span>STORE FLOOR</span><i /><b>{displayedProducts.length} products on this shelf</b><span className="aisle-filter-actions"><button type="button" className={onlyStock ? 'selected' : ''} onClick={() => setOnlyStock(!onlyStock)}><span />In stock</button><button type="button" className={onlyDeal ? 'selected' : ''} onClick={() => setOnlyDeal(!onlyDeal)}><Sparkles size={13} />On sale</button>{hasFilter && <button type="button" className="aisle-reset" onClick={onReset}>Clear filters</button>}</span></div>

        <div className="aisle-scene" ref={frameRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
          <div className="aisle-scene-light" /><div className="aisle-title-plaque"><div className="aisle-plaque-meta"><span>NOW BROWSING</span><span>{String(categoryIndex + 1).padStart(2, '0')} / {String(categoryEntries.length).padStart(2, '0')}</span></div><h3 aria-label={title}>{letters.map((letter, index) => <span className="aisle-kinetic-mask" key={`${displayedCategory}-${index}`}><span className="aisle-kinetic-letter">{letter === ' ' ? '\u00a0' : letter}</span></span>)}</h3><p>{activeCategory?._id === ALL ? 'A little bit of everything, ready for your day.' : `A curated stop in ${activeCategory?.name || 'the store'}.`}</p></div>
          <div className="aisle-frame-edge aisle-edge-left" aria-hidden="true" /><div className="aisle-frame-edge aisle-edge-right" aria-hidden="true" />
          <div className="aisle-camera" ref={cameraRef}><div className="aisle-shelf-scene">
            <div className="aisle-backboard"><span className="aisle-backboard-label">QUICK PICKS <i>·</i> EVERYDAY GOODS</span><span className="aisle-backboard-icon"><Icon name={meta.icon} /></span></div>
            {error ? <div className="aisle-empty-state"><b>{error}</b><button type="button" onClick={onRetry}>Try again</button></div>
              : loading ? <div className="aisle-empty-state"><span className="aisle-loading-ring" /><b>Loading the shelves...</b></div>
              : rows.length ? <div className="aisle-shelf-stack">{rows.map((row, rowIndex) => <div className={`aisle-shelf-row shelf-row-${rowIndex + 1}`} key={`${displayedCategory}-row-${rowIndex}`}><span className="aisle-row-number">{String(rowIndex + 1).padStart(2, '0')}</span><div className="aisle-row-products" style={{ '--aisle-columns': columns }}>{row.map((product) => <ShelfProduct key={product._id} product={product} category={product.categoryId || activeCategory} deal={deals[product._id]} onOpen={onOpen} />)}</div><div className="aisle-shelf-plank"><i /><i /><i /></div></div>)}</div>
                : <div className="aisle-empty-state"><span className="aisle-empty-icon"><Icon name={meta.icon} /></span><b>{categoryCount(displayedCategory) ? 'No products match these filters.' : 'This aisle is waiting for new stock.'}</b><span>Try another aisle or clear a filter.</span>{hasFilter && <button type="button" onClick={onReset}>Clear filters</button>}</div>}
            <div className="aisle-shelf-base"><span>{BRAND_NAME}</span><span><i /> PICK UP IN STORE</span></div>
          </div></div>
          <div className="aisle-floor" aria-hidden="true"><span /><span /><span /></div><span className="aisle-drag-hint"><ArrowLeft size={13} /> DRAG OR SWIPE <ArrowRight size={13} /></span><div className="aisle-scene-progress"><span style={{ transform: `scaleX(${categoryEntries.length > 1 ? categoryIndex / (categoryEntries.length - 1) : 1})` }} /></div>
        </div>

        {!loading && displayedProducts.length > visibleProducts.length && <div className="aisle-more-row"><button type="button" onClick={() => setMorePages((count) => count + 1)}>Load more from this aisle <ArrowDown size={15} /></button><span>Showing {visibleProducts.length} of {displayedProducts.length}</span></div>}
      </div>
    </section>
  );
}
