import { useEffect, useState } from 'react';
import { listProducts } from '../../api/product.api';
import { listCategories } from '../../api/category.api';
import ProductCard from '../../components/product/ProductCard';
import Loading from '../../components/common/Loading';

const LIMIT = 12;

// UC-02.1 View Products, UC-02.3 Search Products
export default function ProductListPage() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listCategories().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    listProducts({ q: search || undefined, categoryId: categoryId || undefined, page, limit: LIMIT })
      .then((res) => setData(res.data))
      .catch(() => setError('Không tải được danh sách sản phẩm'))
      .finally(() => setLoading(false));
  }, [search, categoryId, page]);

  const totalPages = Math.max(Math.ceil(data.total / LIMIT), 1);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  };

  return (
    <section>
      <h2>Sản phẩm</h2>
      <form onSubmit={onSearch} className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm..." />
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button type="submit">Tìm</button>
      </form>

      {loading ? <Loading /> : error ? <p className="error">{error}</p> : (
        <>
          {data.items.length === 0 ? <p className="muted">Không có sản phẩm phù hợp.</p> : (
            <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          )}
          <div className="pager">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        </>
      )}
    </section>
  );
}
