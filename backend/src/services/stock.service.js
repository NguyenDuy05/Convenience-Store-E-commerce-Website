// Quản lý tồn kho theo lô (StockBatch). Dùng chung cho Order, Inventory.
// Trừ kho FEFO (lô hết hạn sớm nhất trước), bỏ qua lô đã hết hạn. Mọi thao tác trừ kho đều CÓ ĐIỀU KIỆN
// (quantity >= số cần trừ) nên hai đơn cùng mua món cuối cùng không thể làm kho âm (BR-18, BR-19).
const { StockBatch, Product, InventoryLog } = require('../models');
const ApiError = require('../utils/ApiError');

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
    const names = issues.map((i) => `${i.name} (còn ${i.available})`).join(', ');
    throw new ApiError(409, `Không đủ hàng: ${names}`, { code: 'INSUFFICIENT_STOCK', issues });
  }
}

async function deductOne({ productId, quantity }, { orderId, userId, session }) {
  const opts = opt(session);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const batches = await sellableBatches(productId, session);
    if (batches.reduce((s, b) => s + b.quantity, 0) < quantity) {
      throw new ApiError(409, 'Không đủ hàng', { code: 'INSUFFICIENT_STOCK' });
    }
    const taken = [];
    let remaining = quantity;
    let raced = false;
    for (const b of batches) {
      if (remaining === 0) break;
      const take = Math.min(b.quantity, remaining);
      const upd = await StockBatch.findOneAndUpdate(
        { _id: b._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { new: true, ...opts },
      );
      if (!upd) { raced = true; break; } // đơn khác vừa lấy mất lô này
      taken.push({ batchId: b._id, quantity: take });
      remaining -= take;
    }
    if (raced) {
      for (const t of taken) await StockBatch.updateOne({ _id: t.batchId }, { $inc: { quantity: t.quantity } }, opts);
      continue;
    }
    const prod = await Product.findOneAndUpdate({ _id: productId }, { $inc: { stockQuantity: -quantity } }, { new: true, ...opts });
    let running = (prod ? prod.stockQuantity : 0) + quantity;
    for (const t of taken) {
      running -= t.quantity;
      await InventoryLog.create([{
        productId, batchId: t.batchId, type: 'sale', quantityChange: -t.quantity, quantityAfter: Math.max(running, 0),
        reason: 'Bán online', orderId, performedBy: userId,
      }], opts);
    }
    return taken.map((t) => ({ productId, ...t }));
  }
  throw new ApiError(409, 'Hệ thống đang bận, vui lòng thử lại', { code: 'STOCK_BUSY' });
}

// Trừ kho khi tạo đơn. items: [{ productId, name, quantity }]. Ném ApiError 409 (kèm issues) nếu thiếu hàng.
// Không có session (MongoDB đơn lẻ): nếu lỗi giữa chừng tự hoàn lại phần đã trừ.
exports.deductStock = async (items, { orderId, userId, session } = {}) => {
  const merged = mergeItems(items);
  await assertAvailable(merged, session);
  try {
    const all = [];
    for (const it of merged) all.push(...await deductOne(it, { orderId, userId, session }));
    return all;
  } catch (err) {
    if (!session) await exports.releaseStock(orderId).catch((e) => console.error('Hoàn kho lỗi:', e));
    throw err;
  }
};

// Hoàn kho khi thanh toán online thất bại / hết hạn. An toàn khi gọi lại nhiều lần:
// chỉ hoàn phần còn lại = đã bán - đã hoàn (tính từ InventoryLog), ghi log type 'release'.
exports.releaseStock = async (orderId, { session, reason = 'Hoàn kho: đơn không thành công' } = {}) => {
  const opts = opt(session);
  const logs = await InventoryLog.find({ orderId, type: { $in: ['sale', 'release'] } }, null, opts).lean();
  const net = new Map();
  logs.forEach((l) => {
    const k = `${l.productId}|${l.batchId}`;
    const e = net.get(k) || { productId: l.productId, batchId: l.batchId, qty: 0 };
    e.qty += -l.quantityChange; // sale (âm) -> cộng; release (dương) -> trừ
    net.set(k, e);
  });
  let restored = 0;
  for (const e of net.values()) {
    if (e.qty <= 0) continue;
    await StockBatch.updateOne({ _id: e.batchId }, { $inc: { quantity: e.qty } }, opts);
    const prod = await Product.findOneAndUpdate({ _id: e.productId }, { $inc: { stockQuantity: e.qty } }, { new: true, ...opts });
    await InventoryLog.create([{
      productId: e.productId, batchId: e.batchId, type: 'release', quantityChange: e.qty,
      quantityAfter: prod ? prod.stockQuantity : e.qty, reason, orderId,
    }], opts);
    restored += e.qty;
  }
  return restored;
};

// ---------- Nghiệp vụ kho cho nhân viên / admin (UC-19, UC-34) ----------

// UC-19.2 Nhập hàng: mỗi lần nhập là một lô mới (có hạn dùng riêng).
exports.receiveBatch = async ({ productId, quantity, expiryDate, costPrice, batchCode, reason, userId, type = 'receive' }) => {
  const batch = await StockBatch.create({
    productId, quantity, receivedQuantity: quantity, expiryDate, costPrice, batchCode, receivedBy: userId, receivedAt: new Date(),
  });
  const prod = await Product.findOneAndUpdate({ _id: productId }, { $inc: { stockQuantity: quantity } }, { new: true });
  await InventoryLog.create({
    productId, batchId: batch._id, type, quantityChange: quantity, quantityAfter: prod.stockQuantity, reason, performedBy: userId,
  });
  return { batch, stockQuantity: prod.stockQuantity };
};

// Lấy `quantity` đơn vị ra khỏi kho (hàng hỏng, hết hạn, kiểm kê thiếu, điều chỉnh giảm). Khác bán hàng: tính cả lô đã hết hạn.
// batchId: chỉ lấy từ đúng lô đó. Điều kiện cập nhật theo số lượng nên không thể làm tồn âm khi có đơn bán đồng thời.
exports.removeStock = async ({ productId, quantity, batchId, type, reason, userId, stocktakeId }) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const filter = { productId, quantity: { $gt: 0 }, ...(batchId ? { _id: batchId } : {}) };
    const batches = (await StockBatch.find(filter).lean()).sort(fefo);
    if (batches.reduce((s, b) => s + b.quantity, 0) < quantity) {
      throw new ApiError(409, batchId ? 'The selected batch does not have enough quantity' : 'Not enough stock to remove', { code: 'INSUFFICIENT_STOCK' });
    }
    const taken = [];
    let remaining = quantity;
    let raced = false;
    for (const b of batches) {
      if (remaining === 0) break;
      const take = Math.min(b.quantity, remaining);
      const upd = await StockBatch.findOneAndUpdate({ _id: b._id, quantity: { $gte: take } }, { $inc: { quantity: -take } }, { new: true });
      if (!upd) { raced = true; break; }
      taken.push({ batchId: b._id, quantity: take });
      remaining -= take;
    }
    if (raced) {
      for (const t of taken) await StockBatch.updateOne({ _id: t.batchId }, { $inc: { quantity: t.quantity } });
      continue;
    }
    const prod = await Product.findOneAndUpdate({ _id: productId }, { $inc: { stockQuantity: -quantity } }, { new: true });
    let running = (prod ? prod.stockQuantity : 0) + quantity;
    for (const t of taken) {
      running -= t.quantity;
      await InventoryLog.create({
        productId, batchId: t.batchId, type, quantityChange: -t.quantity, quantityAfter: Math.max(running, 0), reason, stocktakeId, performedBy: userId,
      });
    }
    return { removed: quantity, stockQuantity: prod ? prod.stockQuantity : 0 };
  }
  throw new ApiError(409, 'The system is busy, please try again', { code: 'STOCK_BUSY' });
};

// Đưa tồn kho của sản phẩm về đúng `target` (điều chỉnh / kiểm kê). Tăng -> tạo lô điều chỉnh; giảm -> lấy theo FEFO.
exports.setStockTo = async ({ productId, target, type, reason, userId, stocktakeId }) => {
  const prod = await Product.findById(productId).select('stockQuantity').lean();
  if (!prod) throw new ApiError(404, 'Product not found');
  const delta = target - prod.stockQuantity;
  if (delta === 0) return { change: 0, stockQuantity: prod.stockQuantity };
  if (delta < 0) {
    const r = await exports.removeStock({ productId, quantity: -delta, type, reason, userId, stocktakeId });
    return { change: delta, stockQuantity: r.stockQuantity };
  }
  const batch = await StockBatch.create({ productId, quantity: delta, receivedQuantity: delta, batchCode: type === 'stocktake' ? 'STOCKTAKE' : 'ADJUST', receivedBy: userId, receivedAt: new Date() });
  const upd = await Product.findOneAndUpdate({ _id: productId }, { $inc: { stockQuantity: delta } }, { new: true });
  await InventoryLog.create({ productId, batchId: batch._id, type, quantityChange: delta, quantityAfter: upd.stockQuantity, reason, stocktakeId, performedBy: userId });
  return { change: delta, stockQuantity: upd.stockQuantity };
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
