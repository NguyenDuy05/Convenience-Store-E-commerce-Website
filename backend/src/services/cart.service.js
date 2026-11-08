// Giỏ hàng (UC-07): dựng dữ liệu hiển thị từ Cart + giá/tồn kho HIỆN TẠI của Product.
const { Cart, Product } = require('../models');
const { sellableMap } = require('./stock.service');

const MAX_PER_ITEM = 99;

// Trả về { items, itemCount, subtotal, issues }. Sản phẩm bị ẩn/xóa vẫn hiện trong giỏ (kèm cảnh báo) để khách tự xóa.
async function buildCartView(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const raw = cart?.items || [];
  const products = raw.length ? await Product.find({ _id: { $in: raw.map((i) => i.productId) } }).lean() : [];
  const sellable = await sellableMap(products.map((p) => p._id));   // chỉ tính hàng còn hạn dùng
  const pMap = new Map(products.map((p) => [String(p._id), { ...p, stockQuantity: sellable.get(String(p._id)) ?? 0 }]));

  const issues = [];
  const items = raw.map((it) => {
    const p = pMap.get(String(it.productId));
    const active = !!p && p.status === 'active';
    let issue = null;
    if (!active) issue = 'unavailable';
    else if (p.stockQuantity <= 0) issue = 'out_of_stock';
    else if (it.quantity > p.stockQuantity) issue = 'insufficient_stock';
    if (issue) issues.push({ productId: it.productId, name: p?.name || 'Sản phẩm', type: issue, available: p?.stockQuantity ?? 0 });
    return {
      productId: it.productId,
      name: p?.name || 'Sản phẩm không còn bán',
      image: p?.images?.[0] || null,
      unit: p?.unit || '',
      unitPrice: p?.price ?? 0,
      quantity: it.quantity,
      stockQuantity: p?.stockQuantity ?? 0,
      lineTotal: active ? p.price * it.quantity : 0,
      issue,
    };
  });
  return {
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    issues,
  };
}

module.exports = { buildCartView, MAX_PER_ITEM };
