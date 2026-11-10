// Quản lý tồn kho theo lô (StockBatch). Dùng chung cho Order, Inventory.
// Trừ kho FEFO (lô hết hạn sớm nhất trước), bỏ qua lô đã hết hạn. Mọi thao tác trừ kho đều CÓ ĐIỀU KIỆN
// (quantity >= số cần trừ) nên hai đơn cùng mua món cuối cùng không thể làm kho âm (BR-18, BR-19).
const { StockBatch, Product, InventoryLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');

const MAX_ATTEMPTS = 5;
const opt = (session) => (session ? { session } : {});

const expiryOf = (b) => (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity);
// Lô không có hạn dùng xếp sau cùng
const fefo = (a, b) => (expiryOf(a) - expiryOf(b)) || (new Date(a.receivedAt || 0) - new Date(b.receivedAt || 0));

// Gộp các dòng trùng sản phẩm
const mergeItems = (items) => {
  const map = new Map();
  items.forEach((it) => {
    const k = String(it.productId);
    const cur = map.get(k);
    if (cur) cur.quantity += it.quantity; else map.set(k, { productId: it.productId, name: it.name, quantity: it.quantity });
  });
  return [...map.values()];
};

const sellableBatches = async (productId, session) => {
  const now = new Date();
  const rows = await StockBatch.find({ productId, quantity: { $gt: 0 } }, null, opt(session)).lean();
  return rows.filter((b) => !b.expiryDate || new Date(b.expiryDate) >= now).sort(fefo);
};

// Kiểm tra tồn kho thực tế (theo lô, không dùng cache) cho cả đơn và báo TẤT CẢ sản phẩm thiếu hàng một lượt
async function assertAvailable(items, session) {
  const issues = [];
  for (const it of items) {
    const available = (await sellableBatches(it.productId, session)).reduce((s, b) => s + b.quantity, 0);
    if (available < it.quantity) {
      issues.push({ type: 'insufficient_stock', productId: it.productId, name: it.name, available, requested: it.quantity });
    }
  }
  if (issues.length) {
    const names = issues.map((i) => `${i.name} (available: ${i.available})`).join(', ');
    throw new ApiError(409, `Insufficient stock: ${names}`, { code: 'INSUFFICIENT_STOCK', issues });
  }
}

async function deductOne({ productId, quantity }, { orderId, userId, session, reason = 'Online sale' }) {
  const opts = opt(session);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const batches = await sellableBatches(productId, session);
    if (batches.reduce((sum, batch) => sum + batch.quantity, 0) < quantity) throw new ApiError(409, 'Insufficient stock', { code: 'INSUFFICIENT_STOCK' });
    const taken = [];
    const logIds = [];
    let productChanged = false;
    const restoreBatches = async () => {
      while (taken.length) {
        const last = taken[taken.length - 1];
        await StockBatch.updateOne({ _id: last.batchId }, { $inc: { quantity: last.quantity } }, opts);
        taken.pop();
      }
    };
    try {
      let remaining = quantity;
      let raced = false;
      for (const batch of batches) {
        if (!remaining) break;
        const take = Math.min(batch.quantity, remaining);
        const updated = await StockBatch.findOneAndUpdate({ _id: batch._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { new: true, ...opts });
        if (!updated) { raced = true; break; }
        taken.push({ batchId: batch._id, quantity: take }); remaining -= take;
      }
      if (raced) { await restoreBatches(); continue; }
      const product = await Product.findOneAndUpdate({ _id: productId, stockQuantity: { $gte: quantity } }, { $inc: { stockQuantity: -quantity } }, { new: true, ...opts });
      if (!product) throw new ApiError(409, 'Inventory changed. Please try again.', { code: 'INSUFFICIENT_STOCK' });
      productChanged = true;
      let running = product.stockQuantity + quantity;
      for (const part of taken) {
        running -= part.quantity;
        const logId = new (require('mongoose').Types.ObjectId)(); logIds.push(logId);
        await InventoryLog.create([{ _id: logId, productId, batchId: part.batchId, type: 'sale', quantityChange: -part.quantity, quantityAfter: running, reason, orderId, performedBy: userId }], opts);
      }
      return taken.map(part => ({ productId, ...part }));
    } catch (error) {
      if (!session) {
        if (logIds.length) await InventoryLog.deleteMany({ _id: { $in: logIds } });
        if (productChanged) await Product.updateOne({ _id: productId }, { $inc: { stockQuantity: quantity } });
        await restoreBatches();
      }
      throw error;
    }
  }
  throw new ApiError(409, 'Inventory is busy. Please retry.', { code: 'STOCK_BUSY' });
}

// Trừ kho khi tạo đơn. items: [{ productId, name, quantity }]. Ném ApiError 409 (kèm issues) nếu thiếu hàng.
// Không có session (MongoDB đơn lẻ): nếu lỗi giữa chừng tự hoàn lại phần đã trừ.
exports.deductStock = async (items, { orderId, userId, session, reason } = {}) => {
  const merged = mergeItems(items);
  await assertAvailable(merged, session);
  try {
    const all = [];
    for (const it of merged) all.push(...await deductOne(it, { orderId, userId, session, reason }));
    return all;
  } catch (err) {
    if (!session) await exports.releaseStock(orderId).catch((e) => console.error("Stock return failed:", e));
    throw err;
  }
};

// Hoàn kho khi thanh toán online thất bại / hết hạn. An toàn khi gọi lại nhiều lần:
// chỉ hoàn phần còn lại = đã bán - đã hoàn (tính từ InventoryLog), ghi log type 'release'.
exports.releaseStock = async (orderId, { session, reason = 'Stock returned: unsuccessful order' } = {}) => {
  const opts = opt(session);
  const logs = await InventoryLog.find({ orderId, type: { $in: ['sale', 'release'] } }, null, opts).sort({ createdAt: 1, _id: 1 }).lean();
  const released = new Map();
  const releasedBySale = new Map();
  for (const log of logs.filter(log => log.type === 'release')) {
    if (log.releaseOf) { releasedBySale.set(String(log.releaseOf), (releasedBySale.get(String(log.releaseOf)) || 0) + log.quantityChange); continue; }
    const key = String(log.productId) + '|' + String(log.batchId);
    released.set(key, (released.get(key) || 0) + log.quantityChange);
  }
  let restored = 0;
  for (const sale of logs.filter(log => log.type === 'sale')) {
    const key = String(sale.productId) + '|' + String(sale.batchId);
    const prior = Math.min(released.get(key) || 0, -sale.quantityChange);
    released.set(key, (released.get(key) || 0) - prior);
    const amount = -sale.quantityChange - prior - (releasedBySale.get(String(sale._id)) || 0);
    if (amount <= 0) continue;
    const claimed = await InventoryLog.findOneAndUpdate({ _id: sale._id, releaseClaimedAt: { $exists: false } }, { $set: { releaseClaimedAt: new Date() } }, { new: true, ...opts });
    if (!claimed) continue;
    let batchChanged = false; let productChanged = false;
    const logId = new (require('mongoose').Types.ObjectId)();
    try {
      await StockBatch.updateOne({ _id: sale.batchId }, { $inc: { quantity: amount } }, opts); batchChanged = true;
      const product = await Product.findOneAndUpdate({ _id: sale.productId }, { $inc: { stockQuantity: amount } }, { new: true, ...opts }); productChanged = true;
      await InventoryLog.create([{ _id: logId, productId: sale.productId, batchId: sale.batchId, type: 'release', quantityChange: amount, quantityAfter: product?.stockQuantity || 0, reason, orderId, releaseOf: sale._id }], opts);
      restored += amount;
    } catch (error) {
      if (!session) {
        await InventoryLog.deleteOne({ _id: logId });
        if (productChanged) await Product.updateOne({ _id: sale.productId }, { $inc: { stockQuantity: -amount } });
        if (batchChanged) await StockBatch.updateOne({ _id: sale.batchId }, { $inc: { quantity: -amount } });
        await InventoryLog.updateOne({ _id: sale._id }, { $unset: { releaseClaimedAt: '' } });
      }
      throw error;
    }
  }
  return restored;
};

// ---------- Nghiệp vụ kho cho nhân viên / admin (UC-19, UC-34) ----------

// UC-19.2 Nhập hàng: mỗi lần nhập là một lô mới (có hạn dùng riêng).
exports.receiveBatch = async ({ productId, quantity, expiryDate, costPrice, batchCode, reason, userId, type = 'receive', stocktakeId, expectedStock }) => runAtomic(async ({ session, onRollback }) => {
  const opts = opt(session);
  const batchId = new (require('mongoose').Types.ObjectId)();
  onRollback(() => StockBatch.deleteOne({ _id: batchId }));
  const [batch] = await StockBatch.create([{ _id: batchId, productId, quantity, receivedQuantity: quantity, expiryDate, costPrice, batchCode, receivedBy: userId, receivedAt: new Date() }], opts);
  const product = await Product.findOneAndUpdate({ _id: productId, ...(expectedStock !== undefined ? { stockQuantity: expectedStock } : {}) }, { $inc: { stockQuantity: quantity } }, { new: true, ...opts });
  if (!product) throw new ApiError(409, 'Inventory changed while adjusting stock. Refresh and try again.', { code: 'STALE_STOCK' });
  onRollback(() => Product.updateOne({ _id: productId }, { $inc: { stockQuantity: -quantity } }));
  const logId = new (require('mongoose').Types.ObjectId)();
  onRollback(() => InventoryLog.deleteOne({ _id: logId }));
  await InventoryLog.create([{ _id: logId, productId, batchId, type, quantityChange: quantity, quantityAfter: product.stockQuantity, reason, performedBy: userId, stocktakeId }], opts);
  return { batch, stockQuantity: product.stockQuantity };
});

// Lấy `quantity` đơn vị ra khỏi kho (hàng hỏng, hết hạn, kiểm kê thiếu, điều chỉnh giảm). Khác bán hàng: tính cả lô đã hết hạn.
// batchId: chỉ lấy từ đúng lô đó. Điều kiện cập nhật theo số lượng nên không thể làm tồn âm khi có đơn bán đồng thời.
exports.removeStock = async ({ productId, quantity, batchId, type, reason, userId, stocktakeId, expectedStock }) => runAtomic(async ({ session, onRollback }) => {
  const opts = opt(session);
  const mutations = [];
  onRollback(async () => {
    for (const part of mutations.filter(part => part.active).reverse()) await StockBatch.updateOne({ _id: part.batchId }, { $inc: { quantity: part.quantity } });
  });
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const filter = { productId, quantity: { $gt: 0 }, ...(batchId ? { _id: batchId } : {}) };
    const batches = (await StockBatch.find(filter, null, opts).lean()).sort(fefo);
    if (batches.reduce((sum, batch) => sum + batch.quantity, 0) < quantity) throw new ApiError(409, 'Not enough stock to remove', { code: 'INSUFFICIENT_STOCK' });
    const taken = []; let remaining = quantity; let raced = false;
    for (const batch of batches) {
      if (!remaining) break;
      const take = Math.min(batch.quantity, remaining);
      const updated = await StockBatch.findOneAndUpdate({ _id: batch._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { new: true, ...opts });
      if (!updated) { raced = true; break; }
      const part = { batchId: batch._id, quantity: take, active: true }; taken.push(part); mutations.push(part); remaining -= take;
    }
    if (raced) {
      for (const part of taken) { await StockBatch.updateOne({ _id: part.batchId }, { $inc: { quantity: part.quantity } }, opts); part.active = false; }
      continue;
    }
    const product = await Product.findOneAndUpdate({ _id: productId, stockQuantity: { $gte: quantity, ...(expectedStock !== undefined ? { $eq: expectedStock } : {}) } }, { $inc: { stockQuantity: -quantity } }, { new: true, ...opts });
    if (!product) throw new ApiError(409, 'Inventory changed while adjusting stock. Refresh and try again.', { code: 'STALE_STOCK' });
    onRollback(() => Product.updateOne({ _id: productId }, { $inc: { stockQuantity: quantity } }));
    let running = product.stockQuantity + quantity;
    for (const part of taken) {
      running -= part.quantity;
      const logId = new (require('mongoose').Types.ObjectId)(); onRollback(() => InventoryLog.deleteOne({ _id: logId }));
      await InventoryLog.create([{ _id: logId, productId, batchId: part.batchId, type, quantityChange: -part.quantity, quantityAfter: running, reason, stocktakeId, performedBy: userId }], opts);
    }
    return { removed: quantity, stockQuantity: product.stockQuantity };
  }
  throw new ApiError(409, 'Inventory is busy. Please retry.', { code: 'STOCK_BUSY' });
});

// Đưa tồn kho của sản phẩm về đúng `target` (điều chỉnh / kiểm kê). Tăng -> tạo lô điều chỉnh; giảm -> lấy theo FEFO.
exports.setStockTo = async ({ productId, target, type, reason, userId, stocktakeId }) => {
  const prod = await Product.findById(productId).select('stockQuantity').lean();
  if (!prod) throw new ApiError(404, 'Product not found');
  const delta = target - prod.stockQuantity;
  if (delta === 0) return { change: 0, stockQuantity: prod.stockQuantity };
  if (delta < 0) {
    const r = await exports.removeStock({ productId, quantity: -delta, type, reason, userId, stocktakeId, expectedStock: prod.stockQuantity });
    return { change: delta, stockQuantity: r.stockQuantity };
  }
  const result = await exports.receiveBatch({ productId, quantity: delta, batchCode: type === 'stocktake' ? 'STOCKTAKE' : 'ADJUST', type, reason, userId, stocktakeId, expectedStock: prod.stockQuantity });
  return { change: delta, stockQuantity: result.stockQuantity };
};

// Số lượng CÓ THỂ BÁN của từng sản phẩm = tổng các lô còn hàng và chưa hết hạn (hàng quá hạn không bán được).
// Trả Map(productId -> số lượng). Sản phẩm không có lô nào còn hạn -> 0.
exports.sellableMap = async (productIds) => {
  const ids = [...new Set(productIds.map(String))];
  const map = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return map;
  const mongoose = require('mongoose');
  const now = new Date();
  const rows = await StockBatch.aggregate([
    { $match: { productId: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) }, quantity: { $gt: 0 }, $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gte: now } }] } },
    { $group: { _id: '$productId', q: { $sum: '$quantity' } } },
  ]);
  rows.forEach((r) => map.set(String(r._id), r.q));
  return map;
};
