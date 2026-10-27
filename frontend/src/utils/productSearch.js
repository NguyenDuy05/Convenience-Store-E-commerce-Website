export function normalizeProductSearch(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function matchesProductSearch(product, query = '') {
  const tokens = normalizeProductSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const searchable = normalizeProductSearch([
    product?.name,
    product?.sku,
    product?.barcode,
    product?.categoryId?.name,
  ].filter(Boolean).join(' '));
  return tokens.every((token) => searchable.includes(token));
}
