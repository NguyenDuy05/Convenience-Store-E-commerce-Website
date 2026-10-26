// Quản lý tồn kho theo lô (StockBatch). Dùng chung cho Order, Inventory.
// Không dùng MongoDB transaction (chạy được cả khi MongoDB local là standalone, không có replica set).
// Thay vào đó: mỗi lần trừ kho là một cập nhật nguyên tử có điều kiện (quantity >= số cần trừ);
// nếu một bước lỗi thì hoàn lại các bước đã làm (bù trừ) trước khi báo lỗi -> kho không bị lệch.
const { Product, StockBatch, InventoryLog } = require('../models');

class InsufficientStockError extends Error {
  constructor(productId, name, available) {
    super(`Sản phẩm "${name}" không đủ hàng (còn ${available})`);
    this.code = 'INSUFFICIENT_STOCK';
    this.productId = String(productId);
    this.available = available;
  }
}
exports.InsufficientStockError = InsufficientStockError;

const notExpired = () => ({
  $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: new Date() } }],
});
const expiryRank = (b) => (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity);

function mergeItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = String(it.productId);
    const cur = map.get(key);
    if (cur) cur.quantity += it.quantity;
    else map.set(key, { productId: it.productId, name: it.name, quantity: it.quantity });
  }
  return [...map.values()];
}

// Trừ kho khi tạo đơn: lấy từ lô hết hạn sớm nhất trước (FEFO), bỏ qua lô đã hết hạn,
// ghi InventoryLog type 'sale', cập nhật Product.stockQuantity. Ném InsufficientStockError nếu không đủ hàng
// (khi đó mọi thay đổi đã làm được hoàn lại, không ghi log).
exports.deductStock = async (items, { orderId, userId, reason = 'Bán hàng' } = {}) => {
  const merged = mergeItems(items);
  const applied = [];          // { productId, batchId, qty }
  const productApplied = [];   // { productId, qty }
  try {
    for (const it of merged) {
      let need = it.quantity;
      let available = 0;
      for (let pass = 0; pass < 3 && need > 0; pass += 1) {
        const batches = (await StockBatch.find({ productId: it.productId, quantity: { $gt: 0 }, ...notExpired() }))
          .sort((a, b) => expiryRank(a) - expiryRank(b));
        available = batches.reduce((s, b) => s + b.quantity, 0);
        if (available < need) break;
        for (const b of batches) {
          if (need <= 0) break;
          const take = Math.min(b.quantity, need);
          const r = await StockBatch.updateOne({ _id: b._id, quantity: { $gte: take } }, { $inc: { quantity: -take } });
          if (r.modifiedCount === 1) { applied.push({ productId: it.productId, batchId: b._id, qty: take }); need -= take; }
        }
      }
      if (need > 0) throw new InsufficientStockError(it.productId, it.name, Math.max(available, 0));
      await Product.updateOne({ _id: it.productId }, { $inc: { stockQuantity: -it.quantity } });
      productApplied.push({ productId: it.productId, qty: it.quantity });
    }
  } catch (err) {
    for (const a of applied.slice().reverse()) await StockBatch.updateOne({ _id: a.batchId }, { $inc: { quantity: a.qty } });
    for (const p of productApplied) await Product.updateOne({ _id: p.productId }, { $inc: { stockQuantity: p.qty } });
    throw err;
  }

  // Ghi nhật ký sau khi mọi bước trừ kho đã thành công
  const logs = [];
  for (const it of merged) {
    const product = await Product.findById(it.productId).select('stockQuantity');
    const mine = applied.filter((a) => String(a.productId) === String(it.productId));
    let running = (product ? product.stockQuantity : 0) + mine.reduce((s, a) => s + a.qty, 0);
    for (const a of mine) {
      running -= a.qty;
      logs.push({ productId: it.productId, batchId: a.batchId, type: 'sale', quantityChange: -a.qty, quantityAfter: running, reason, orderId, performedBy: userId });
    }
  }
  if (logs.length) await InventoryLog.insertMany(logs);
  return { allocations: applied };
};

// Hoàn kho (thanh toán online thất bại / hết hạn / tạo đơn lỗi): ghi InventoryLog type 'release'. Chỉ hoàn một lần cho mỗi đơn.
// Người gọi phải bảo đảm chỉ một tiến trình gọi cho cùng đơn.
exports.releaseStock = async (orderId, { userId, reason = 'Hoàn kho' } = {}) => {
  const logs = await InventoryLog.find({ orderId, type: { $in: ['sale', 'release'] } });
  if (logs.some((l) => l.type === 'release')) return false;
  const sales = logs.filter((l) => l.type === 'sale');
  if (!sales.length) return false;
  const perProduct = new Map();
  for (const l of sales) {
    const qty = -l.quantityChange;
    if (l.batchId) await StockBatch.updateOne({ _id: l.batchId }, { $inc: { quantity: qty } });
    perProduct.set(String(l.productId), (perProduct.get(String(l.productId)) || 0) + qty);
  }
  for (const [productId, qty] of perProduct) await Product.updateOne({ _id: productId }, { $inc: { stockQuantity: qty } });
  const releaseLogs = [];
  for (const [productId, total] of perProduct) {
    const product = await Product.findById(productId).select('stockQuantity');
    let running = (product ? product.stockQuantity : 0) - total;
    for (const l of sales.filter((x) => String(x.productId) === productId)) {
      running += -l.quantityChange;
      releaseLogs.push({ productId: l.productId, batchId: l.batchId, type: 'release', quantityChange: -l.quantityChange, quantityAfter: running, reason, orderId, performedBy: userId });
    }
  }
  if (releaseLogs.length) await InventoryLog.insertMany(releaseLogs);
  return true;
};
