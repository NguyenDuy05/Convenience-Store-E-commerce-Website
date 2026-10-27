import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import { matchesProductSearch, normalizeProductSearch } from '../../utils/productSearch';
import '../../styles/product-search.css';

export default function ProductSearchInput({
  products = [], value, onChange, placeholder, ariaLabel = 'Search products',
  toForProduct = (product) => `/products/${product._id}`,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = normalizeProductSearch(value);
  const suggestions = useMemo(() => {
    if (!query) return [];
    return products.filter((product) => matchesProductSearch(product, query)).slice(0, 6);
  }, [products, query]);
  const showSuggestions = open && Boolean(query);

  const choose = (product) => {
    onChange(product.name);
    setOpen(false);
    setActiveIndex(-1);
    navigate(toForProduct(product));
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && showSuggestions && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && showSuggestions && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && showSuggestions && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  };

  return (
    <div className="product-search-wrap">
      <input
        className="product-search-input"
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { window.setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        role="combobox"
        autoComplete="off"
      />
      {showSuggestions && <div className="product-search-suggestions" role="listbox" aria-label="Product suggestions">
        {suggestions.length ? suggestions.map((product, index) => <button
          type="button"
          role="option"
          aria-selected={activeIndex === index}
          className={`product-search-option${activeIndex === index ? ' active' : ''}`}
          key={product._id}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(product)}
        >
          <span className="product-search-thumb">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <i>▧</i>}</span>
          <span className="product-search-copy"><b>{product.name}</b><small>{product.categoryId?.name || product.sku || 'Sản phẩm'}</small></span>
          <strong>{formatCurrency(product.price)}</strong>
        </button>) : products.length > 0 ? <div className="product-search-empty">Không tìm thấy sản phẩm phù hợp</div> : null}
      </div>}
    </div>
  );
}
