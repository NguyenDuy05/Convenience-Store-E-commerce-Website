import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import { listStores } from '../../api/store.api';
import { formatCurrency } from '../../utils/format';
import HomeHeader from '../../components/home/HomeHeader';
import HomeFooter from '../../components/home/HomeFooter';
import ProductSearchInput from '../../components/home/ProductSearchInput';
import '../../styles/product-list.css';
import '../../styles/home.css';

const PAGE_SIZE = 12;
const Icon = ({ children }) => <span className="catalog-icon" aria-hidden="true">{children}</span>;

function ProductTile({ product, compact }) {
  const inStock = Number(product.stockQuantity) > 0;
  return (
    <article className={`catalog-product${compact ? ' compact' : ''}`}>
      <Link className="catalog-product-media" to={`/products/${product._id}`} aria-label={`Xem ${product.name}`}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} loading="lazy" />
          : <span className="catalog-image-placeholder"><Icon>inventory_2</Icon></span>}
        {!inStock && <span className="catalog-stock-tag">Hết hàng</span>}
      </Link>
      <div className="catalog-product-info">
        <span className="catalog-product-category">{product.categoryId?.name || 'Sản phẩm'}{product.unit ? ` · ${product.unit}` : ''}</span>
        <Link className="catalog-product-name" to={`/products/${product._id}`}>{product.name}</Link>
        <div className="catalog-product-bottom">
          <div>
            <strong>{formatCurrency(product.price)}</strong>
            <span className={inStock ? 'catalog-availability' : 'catalog-availability unavailable'}>
              <i />{inStock ? `Còn ${product.stockQuantity}` : 'Tạm hết hàng'}
            </span>
          </div>
          <Link className="catalog-open-product" to={`/products/${product._id}`} aria-label={`Chi tiết ${product.name}`}>
            <Icon>arrow_forward</Icon>
          </Link>
        </div>
      </div>
    </article>
  );
}

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
  const [categoryId, setCategoryId] = useState('');
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
      .catch(() => { if (current) setError('Không tải được danh sách sản phẩm. Vui lòng thử lại.'); })
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
      <HomeHeader store={store} info={null} q={q} setQ={setQ} active="products" products={suggestionProducts}
        onNav={(section) => {
          if (section === 'products') { document.querySelector('.catalog-page')?.scrollIntoView({ behavior: 'smooth' }); return; }
          navigate(section === 'store' ? '/#store' : '/');
        }}
        onSearch={submitSearch} />
      <div className="catalog-page">
      <div className="catalog-context-row">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link to="/"><Icon>home</Icon>Trang chủ</Link>
          <Icon>chevron_right</Icon>
          <span>Sản phẩm</span>
        </nav>
        <div className="catalog-pickup">
          <span className="catalog-store-mark"><Icon>store</Icon></span>
          <span className="catalog-store-label">Đang xem tại:</span>
          <strong>{store?.name || 'Cửa hàng gần bạn'}</strong>
          <span className="catalog-pickup-ready"><Icon>bolt</Icon>Sẵn sàng nhận tại cửa hàng</span>
        </div>
      </div>

      <section className="catalog-toolbar">
        <div className="catalog-toolbar-top">
          <div className="catalog-title-wrap">
            <span className="catalog-eyebrow">Danh mục cửa hàng</span>
            <div className="catalog-title-line">
              <h1>{search ? `Kết quả tìm kiếm` : 'Tất cả sản phẩm'}</h1>
              <span className="catalog-count">{filtered.length} sản phẩm</span>
            </div>
          </div>
          <div className="catalog-controls">
            <label className="catalog-sort"><Icon>sort</Icon><span>Sắp xếp:</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                <option value="featured">Gợi ý</option>
                <option value="price-asc">Giá: thấp đến cao</option>
                <option value="price-desc">Giá: cao đến thấp</option>
                <option value="name">Tên sản phẩm</option>
                <option value="stock">Còn nhiều hàng</option>
              </select>
            </label>
            <div className="catalog-density" aria-label="Kiểu hiển thị">
              <button type="button" className={!compact ? 'selected' : ''} onClick={() => setCompact(false)} aria-label="Lưới tiêu chuẩn"><Icon>grid_view</Icon></button>
              <button type="button" className={compact ? 'selected' : ''} onClick={() => setCompact(true)} aria-label="Lưới gọn"><Icon>view_compact</Icon></button>
            </div>
          </div>
        </div>

        <form className="catalog-search" onSubmit={submitSearch}>
          <Icon>search</Icon>
          <ProductSearchInput products={suggestionProducts} value={q} onChange={setQ} placeholder="Tìm đồ uống, đồ ăn vặt, nhu yếu phẩm..." ariaLabel="Tìm sản phẩm" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Xóa nội dung tìm kiếm"><Icon>close</Icon></button>}
          <button className="catalog-search-submit" type="submit">Tìm sản phẩm</button>
        </form>

        <div className="catalog-categories" aria-label="Lọc theo danh mục">
          <button type="button" className={!categoryId ? 'active' : ''} onClick={() => selectCategory('')}><Icon>apps</Icon>Tất cả</button>
          {categories.map((category) => <button type="button" key={category._id} className={categoryId === category._id ? 'active' : ''} onClick={() => selectCategory(category._id)}>{category.name}</button>)}
        </div>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters">
          <div className="catalog-filter-heading"><h2><Icon>filter_alt</Icon>Bộ lọc</h2><button type="button" onClick={resetFilters}>Đặt lại</button></div>
          <section className="catalog-filter-section">
            <h3>Danh mục</h3>
            <label className="catalog-check-row"><input type="radio" name="category" checked={!categoryId} onChange={() => selectCategory('')} /><span>Tất cả sản phẩm</span><small>{products.length}</small></label>
            {categories.map((category) => <label className="catalog-check-row" key={category._id}>
              <input type="radio" name="category" checked={categoryId === category._id} onChange={() => selectCategory(category._id)} />
              <span>{category.name}</span><small>{categoryCounts[category._id] || 0}</small>
            </label>)}
          </section>
          <section className="catalog-filter-section">
            <h3>Khả năng nhận hàng</h3>
            <label className="catalog-check-row"><input type="checkbox" checked={inStockOnly} onChange={(event) => { setInStockOnly(event.target.checked); setPage(1); }} /><span><Icon>bolt</Icon>Còn hàng tại cửa hàng</span></label>
          </section>
          <section className="catalog-filter-section">
            <h3>Khoảng giá</h3>
            <div className="catalog-price-fields">
              <label><span>Từ</span><input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="0" /></label>
              <span>đến</span>
              <label><span>Đến</span><input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="Không giới hạn" /></label>
            </div>
          </section>
          <div className="catalog-pickup-note"><Icon>verified</Icon><div><strong>Nhận hàng nhanh</strong><span>Đặt online và lấy tại cửa hàng, không phí giao hàng.</span></div></div>
        </aside>

        <section className="catalog-results" aria-label="Danh sách sản phẩm">
          <div className="catalog-results-heading">
            <div><h2>{categoryId ? categories.find((item) => item._id === categoryId)?.name : 'Sản phẩm dành cho bạn'}</h2><p>{filtered.length ? `Hiển thị ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} trong ${filtered.length} sản phẩm` : 'Không có sản phẩm phù hợp'}</p></div>
            {activeFilters > 0 && <button className="catalog-clear" type="button" onClick={resetFilters}>Xóa bộ lọc ({activeFilters}) <Icon>close</Icon></button>}
          </div>

          {loading ? <div className="catalog-state"><span className="catalog-spinner" /><strong>Đang tải sản phẩm</strong><span>Đang cập nhật danh mục cửa hàng...</span></div>
              : error ? <div className="catalog-state error"><Icon>cloud_off</Icon><strong>Chưa tải được sản phẩm</strong><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button></div>
              : visibleProducts.length === 0 ? <div className="catalog-state"><Icon>search_off</Icon><strong>Không tìm thấy sản phẩm phù hợp</strong><span>Thử thay đổi từ khóa hoặc xóa một vài bộ lọc.</span><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div>
                : <div className={`catalog-grid${compact ? ' compact' : ''}`}>{visibleProducts.map((product) => <ProductTile key={product._id} product={product} compact={compact} />)}</div>}

          {!loading && !error && filtered.length > PAGE_SIZE && <nav className="catalog-pagination" aria-label="Phân trang sản phẩm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon>chevron_left</Icon>Trước</button>
            <span>Trang <strong>{page}</strong> / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Tiếp<Icon>chevron_right</Icon></button>
          </nav>}
        </section>
      </div>
      </div>
      <HomeFooter categories={categories} store={store} info={null}
        onNav={(section) => {
          if (section === 'products') document.querySelector('.catalog-page')?.scrollIntoView({ behavior: 'smooth' });
          else if (section === 'promotions') navigate('/promotions');
          else navigate(section === 'store' ? '/#store' : '/');
        }}
        onCategory={(id) => { selectCategory(id); document.querySelector('.catalog-layout')?.scrollIntoView({ behavior: 'smooth' }); }} />
    </div>
  );
}
