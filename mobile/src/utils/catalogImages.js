// Existing, SKU-labelled photographs in the shared image library. These are image
// associations only, never product/price/stock data. Admin-assigned images win.
export const catalogPhotos = {
  SP001: 'SP001-snack-khoai-tay.png',
  SP002: 'SP002-banh-quy-bo.jpg',
  SP003: 'SP003-chocopie-6-cai.jpg',
  SP004: 'SP004-banh-bong-lan-cuon.jpg',
  SP005: 'SP005-mi-ly-bo-ham.png',
  SP006: 'SP006-mi-cha-ca-han-quoc.jpg',
  SP007: 'SP007-xuc-xich.jpg',
  SP008: 'SP008-banh-mi-thit-nguoi.webp',
  SP009: 'SP009-com-nam-ca-hoi.jpg',
  SP010: 'SP010-com-ga-teriyaki.png',
  SP011: 'SP011-nuoc-500ml.jpg',
  SP012: 'SP012-nuoc-ngot-330ml.webp',
  SP013: 'SP013-tra-dao.jpg',
  SP014: 'SP014-sua-tuoi-180ml.png',
  SP015: 'SP015-sua-chua-uong.png',
};
// Cart/checkout DTOs expose productId rather than SKU. These are the existing
// catalog identifiers from backend/data/products.json, not a guessed name match.
const catalogIds = Object.fromEntries(
  Object.keys(catalogPhotos).map((sku, i) => [
    `a500000000000000000000${(i + 1).toString(16).padStart(2, '0')}`,
    sku,
  ]),
);
export function productPhotos(product) {
  const assigned = (product?.images || []).filter((uri) => typeof uri === 'string' && uri.trim());
  if (assigned.length) return assigned;
  if (product?.image) return [product.image];
  const sku = product?.sku || catalogIds[String(product?._id || product?.productId || '')];
  const file = catalogPhotos[sku];
  return file ? ['/api/products/images/file/' + encodeURIComponent(file)] : [];
}
