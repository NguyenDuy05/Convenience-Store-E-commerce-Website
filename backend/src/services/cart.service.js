const { Cart, Product } = require('../models');
const { sellableMap } = require('./stock.service');

const MAX_PER_ITEM = 99;

// Dựng giỏ hàng trả về: dòng hàng, tổng tiền, cảnh báo ngừng bán / thiếu hàng
async function buildCartView(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const raw = cart?.items || [];
  const products = raw.length ? await Product.find({ _id: { $in: raw.map((i) => i.productId) } }).lean() : [];
  const sellable = await sellableMap(products.map((p) => p._id));
  const pMap = new Map(products.map((p) => [String(p._id), { ...p, stockQuantity: sellable.get(String(p._id)) ?? 0 }]));

  const issues = [];
  const items = raw.map((it) => {
    const p = pMap.get(String(it.productId));
    const active = !!p && p.status === 'active';
    let issue = null;
    if (!active) issue = 'unavailable';
    else if (p.stockQuantity <= 0) issue = 'out_of_stock';
    else if (it.quantity > p.stockQuantity) issue = 'insufficient_stock';
    if (issue) issues.push({ productId: it.productId, name: p?.name || "Product", type: issue, available: p?.stockQuantity ?? 0 });
    return {
      productId: it.productId,
      name: p?.name || "Product is no longer available",
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

// Sửa giỏ hàng an toàn khi nhiều tab cùng sửa (so phiên bản trước khi lưu)
async function mutateCart(userId, mutate) {
  try { await Cart.updateOne({ userId }, { $setOnInsert: { items: [], revision: 0 } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const cart = await Cart.findOne({ userId }).lean();
    const items = await mutate(cart.items || []);
    const revision = cart.revision === undefined ? { $exists: false } : cart.revision;
    const result = await Cart.updateOne({ _id: cart._id, revision }, { $set: { items }, $inc: { revision: 1 } });
    if (result.modifiedCount) return;
  }
  throw new (require('../utils/ApiError'))(409, 'Your cart is being updated in another tab. Please try again.');
}

// Bỏ các món đã đặt khỏi giỏ sau khi tạo đơn
async function removePurchasedItems(userId, lines, { session } = {}) {
  const branches = lines.map(line => ({ case: { $eq: ['$$item.productId', line.productId] }, then: line.quantity }));
  const cart = await Cart.findOneAndUpdate({ userId }, [{ $set: {
    items: { $filter: { input: { $map: { input: '$items', as: 'item', in: { $mergeObjects: ['$$item', {
      quantity: { $subtract: ['$$item.quantity', { $switch: { branches, default: 0 } }] },
    }] } } }, as: 'item', cond: { $gt: ['$$item.quantity', 0] } } },
    revision: { $add: [{ $ifNull: ['$revision', 0] }, 1] },
  } }], { ...(session ? { session } : {}), updatePipeline: true }).lean();
  return lines.map(line => ({ productId: line.productId, quantity: Math.min(line.quantity, cart?.items.find(item => String(item.productId) === String(line.productId))?.quantity || 0) })).filter(line => line.quantity > 0);
}

// Trả lại các món vào giỏ khi tạo đơn thất bại
async function restorePurchasedItems(userId, lines) {
  for (const line of lines) await Cart.updateOne({ userId }, [{ $set: {
    items: { $cond: [
      { $in: [line.productId, '$items.productId'] },
      { $map: { input: '$items', as: 'item', in: { $cond: [ { $eq: ['$$item.productId', line.productId] }, { $mergeObjects: ['$$item', { quantity: { $add: ['$$item.quantity', line.quantity] } }] }, '$$item' ] } } },
      { $concatArrays: ['$items', [{ productId: line.productId, quantity: line.quantity, addedAt: new Date() }]] },
    ] }, revision: { $add: [{ $ifNull: ['$revision', 0] }, 1] },
  } }], { updatePipeline: true });
}

module.exports = { buildCartView, MAX_PER_ITEM, mutateCart, removePurchasedItems, restorePurchasedItems };
