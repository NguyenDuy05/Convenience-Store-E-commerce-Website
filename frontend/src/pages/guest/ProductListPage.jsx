import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import { listStores } from '../../api/store.api';
import { formatCurrency } from '../../utils/format';
import ProductSearchInput from '../../components/home/ProductSearchInput';
import '../../styles/product-list.css';
import '../../styles/home.css';

const PAGE_SIZE = 12;
// Icon Material Symbols của trang sản phẩm
const Icon = ({ children }) => <span className="catalog-icon" aria-hidden="true">{children}</span>;

// Thẻ sản phẩm trong danh sách
function ProductTile({ product, compact }) {
  const inStock = Number(product.stockQuantity) > 0;
  return (
    <article className={`catalog-product${compact ? ' compact' : ''}`}>
      <Link className="catalog-product-media" to={`/products/${product._id}`} aria-label={`Xem ${product.name}`}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} loading="lazy" />
          : <span className="catalog-image-placeholder"><Icon>inventory_2</Icon></span>}
        {!inStock && <span className="catalog-stock-tag">Out of stock</span>}
      </Link>
      <div className="catalog-product-info">
        <span className="catalog-product-category">{product.categoryId?.name || "Products"}{product.unit ? ` · ${product.unit}` : ''}</span>
        <Link className="catalog-product-name" to={`/products/${product._id}`}>{product.name}</Link>
        <div className="catalog-product-bottom">
          <div>
            <strong>{formatCurrency(product.price)}</strong>
            <span className={inStock ? 'catalog-availability' : 'catalog-availability unavailable'}>
              <i />{inStock ? `Available: ${product.stockQuantity}` : "Temporarily out of stock"}
            </span>
          </div>
          <Link className="catalog-open-product" to={`/products/${product._id}`} aria-label={`Details ${product.name}`}>
            <Icon>arrow_forward</Icon>
          </Link>
        </div>
      </div>
    </article>
  );
}

// UC-02.1/02.3 Danh sách và tìm kiếm sản phẩm (lọc danh mục, giá, còn hàng)
export default function ProductListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [categories, setCategories] = useState([]);
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [suggestionProducts, setSuggestionProducts] = useState([]);
  const [q, setQ] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('featured');
  const [compact, setCompact] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listCategories().then(({ data }) => setCategories(data || [])).catch(() => {});
    listStores().then(({ data }) => setStore(data?.[0] || null)).catch(() => {});
    listProducts({ limit: 100 }).then(({ data }) => setSuggestionProducts(data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    listProducts({ q: search || undefined, limit: 100 })
      .then(({ data }) => { if (current) setProducts(data.items || []); })
      .catch(() => { if (current) setError("Could not load products. Please try again."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [search, reload]);

  const urlSearch = searchParams.get('search') || '';
  useEffect(() => {
    setQ(urlSearch);
    setSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      if (categoryId && product.categoryId?._id !== categoryId) return false;
      if (inStockOnly && Number(product.stockQuantity) <= 0) return false;
      if (minPrice !== '' && Number(product.price) < Number(minPrice)) return false;
      if (maxPrice !== '' && Number(product.price) > Number(maxPrice)) return false;
      return true;
    });
    if (sort === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    if (sort === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    if (sort === 'stock') result = [...result].sort((a, b) => b.stockQuantity - a.stockQuantity);
    return result;
  }, [products, categoryId, inStockOnly, minPrice, maxPrice, sort]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const visibleProducts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = Number(Boolean(categoryId)) + Number(inStockOnly) + Number(minPrice !== '' || maxPrice !== '');
  const categoryCounts = useMemo(() => products.reduce((counts, product) => {
    const id = product.categoryId?._id;
    if (id) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {}), [products]);

  const resetFilters = () => {
    setCategoryId('');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSort('featured');
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const value = q.trim();
    setSearch(value);
    setPage(1);
    setSearchParams(value ? { search: value } : {});
  };

  const selectCategory = (id) => {
    setCategoryId(id);
    setPage(1);
  };

  return (
    <div className="catalog-shell">
      <div className="catalog-page">
      <div className="catalog-context-row">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link to="/"><Icon>home</Icon>Home</Link>
          <Icon>chevron_right</Icon>
          <span>Products</span>
        </nav>
        <div className="catalog-pickup">
          <span className="catalog-store-mark"><Icon>store</Icon></span>
          <span className="catalog-store-label">Shopping at:</span>
          <strong>{store?.name || "Your local store"}</strong>
          <span className="catalog-pickup-ready"><Icon>bolt</Icon>Ready for store pickup</span>
        </div>
      </div>

      <section className="catalog-toolbar">
        <div className="catalog-toolbar-top">
          <div className="catalog-title-wrap">
            <span className="catalog-eyebrow">Store catalog</span>
            <div className="catalog-title-line">
              <h1>{search ? `Search results` : "All products"}</h1>
              <span className="catalog-count">{filtered.length} items</span>
            </div>
          </div>
          <div className="catalog-controls">
            <label className="catalog-sort"><Icon>sort</Icon><span>Sort:</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Product name</option>
                <option value="stock">Most in stock</option>
              </select>
            </label>
            <div className="catalog-density" aria-label="Display style">
              <button type="button" className={!compact ? 'selected' : ''} onClick={() => setCompact(false)} aria-label="Standard grid"><Icon>grid_view</Icon></button>
              <button type="button" className={compact ? 'selected' : ''} onClick={() => setCompact(true)} aria-label="Compact grid"><Icon>view_compact</Icon></button>
            </div>
          </div>
        </div>

        <form className="catalog-search" onSubmit={submitSearch}>
          <Icon>search</Icon>
          <ProductSearchInput products={suggestionProducts} value={q} onChange={setQ} placeholder="Search drinks, snacks and everyday essentials..." ariaLabel="Search products" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search"><Icon>close</Icon></button>}
          <button className="catalog-search-submit" type="submit">Search products</button>
        </form>

        <div className="catalog-categories" aria-label="Filter by category">
          <button type="button" className={!categoryId ? 'active' : ''} onClick={() => selectCategory('')}><Icon>apps</Icon>All</button>
          {categories.map((category) => <button type="button" key={category._id} className={categoryId === category._id ? 'active' : ''} onClick={() => selectCategory(category._id)}>{category.name}</button>)}
        </div>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters">
          <div className="catalog-filter-heading"><h2><Icon>filter_alt</Icon>Filters</h2><button type="button" onClick={resetFilters}>Reset</button></div>
          <section className="catalog-filter-section">
            <h3>Category</h3>
            <label className="catalog-check-row"><input type="radio" name="category" checked={!categoryId} onChange={() => selectCategory('')} /><span>All products</span><small>{products.length}</small></label>
            {categories.map((category) => <label className="catalog-check-row" key={category._id}>
              <input type="radio" name="category" checked={categoryId === category._id} onChange={() => selectCategory(category._id)} />
              <span>{category.name}</span><small>{categoryCounts[category._id] || 0}</small>
            </label>)}
          </section>
          <section className="catalog-filter-section">
            <h3>Availability</h3>
            <label className="catalog-check-row"><input type="checkbox" checked={inStockOnly} onChange={(event) => { setInStockOnly(event.target.checked); setPage(1); }} /><span><Icon>bolt</Icon>In stock at the store</span></label>
          </section>
          <section className="catalog-filter-section">
            <h3>Price range</h3>
            <div className="catalog-price-fields">
              <label><span>From</span><input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="0" /></label>
              <span>to</span>
              <label><span>To</span><input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="No limit" /></label>
            </div>
          </section>
          <div className="catalog-pickup-note"><Icon>verified</Icon><div><strong>Easy pickup</strong><span>Order online and collect in store, with no delivery fees.</span></div></div>
        </aside>

        <section className="catalog-results" aria-label="Product list">
          <div className="catalog-results-heading">
            <div><h2>{categoryId ? categories.find((item) => item._id === categoryId)?.name : "Products for you"}</h2><p>{filtered.length ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} trong ${filtered.length} items` : "No matching products"}</p></div>
            {activeFilters > 0 && <button className="catalog-clear" type="button" onClick={resetFilters}>Clear filters ({activeFilters}) <Icon>close</Icon></button>}
          </div>

          {loading ? <div className="catalog-state"><span className="catalog-spinner" /><strong>Loading products</strong><span>Updating the store catalog...</span></div>
              : error ? <div className="catalog-state error"><Icon>cloud_off</Icon><strong>Could not load products</strong><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></div>
              : visibleProducts.length === 0 ? <div className="catalog-state"><Icon>search_off</Icon><strong>No matching products found</strong><span>Try another keyword or clear some filters.</span><button type="button" onClick={resetFilters}>Clear filters</button></div>
                : <div className={`catalog-grid${compact ? ' compact' : ''}`}>{visibleProducts.map((product) => <ProductTile key={product._id} product={product} compact={compact} />)}</div>}

          {!loading && !error && filtered.length > PAGE_SIZE && <nav className="catalog-pagination" aria-label="Product pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon>chevron_left</Icon>Previous</button>
            <span>Trang <strong>{page}</strong> / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next<Icon>chevron_right</Icon></button>
          </nav>}
        </section>
      </div>
      </div>
    </div>
  );
}
