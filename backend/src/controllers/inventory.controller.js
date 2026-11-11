const mongoose = require('mongoose');
const { Product, StockBatch, InventoryLog, Stocktake, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const stock = require('../services/stock.service');
const { logActivity } = require('../services/activity.service');

// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LOW = { $expr: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$lowStockThreshold'] }] } };
const NOT_DELETED = { status: { $ne: 'deleted' } };

// Đọc page/limit từ query
const paging = (query, def = 20) => ({
  page: Math.max(parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit, 10) || def, 1), 100),
});
// Kiểm tra ObjectId hợp lệ
const validId = (id, label = 'ID') => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`); };
// Kiểm tra số nguyên dương
const posInt = (v, label, max = 100000) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new ApiError(400, `${label} must be a whole number between 1 and ${max}`);
  return n;
};
// Kiểm tra chuỗi (bắt buộc / tùy chọn) có độ dài hợp lệ
const text = (v, label, { required = false, max = 300 } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new ApiError(400, `${label} is required`);
  if (s.length > max) throw new ApiError(400, `${label} must be ${max} characters or fewer`);
  return s || undefined;
};
// Lấy sản phẩm chưa bị xóa theo id (404 nếu không có)
async function requireProduct(id) {
  validId(id, 'product ID');
  const p = await Product.findOne({ _id: id, ...NOT_DELETED });
  if (!p) throw new ApiError(404, 'Product not found');
  return p;
}

// Một dòng tồn kho trả về: sản phẩm, số lượng, ngưỡng cảnh báo
const productRow = (p, nearest) => ({
  _id: p._id, name: p.name, sku: p.sku, unit: p.unit, status: p.status, images: (p.images || []).slice(0, 1),
  category: p.categoryId?.name ? { _id: p.categoryId._id, name: p.categoryId.name } : null,
  stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold,
  stockStatus: p.stockQuantity === 0 ? 'out' : p.stockQuantity <= p.lowStockThreshold ? 'low' : 'in',
  nearestExpiry: nearest?.get(String(p._id)) || null,
});

// Hạn dùng gần nhất của các lô còn hàng theo từng sản phẩm
async function nearestExpiries(ids) {
  if (!ids.length) return new Map();
  const rows = await StockBatch.aggregate([
    { $match: { productId: { $in: ids }, quantity: { $gt: 0 }, expiryDate: { $ne: null } } },
    { $group: { _id: '$productId', d: { $min: '$expiryDate' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.d]));
}

// UC-19.1/34.1 Xem tồn kho (lọc còn hàng / sắp hết / hết hàng)
exports.listInventory = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { ...NOT_DELETED };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { sku: rx }, { barcode: rx }]; }
  if (req.query.categoryId) { validId(req.query.categoryId, 'category ID'); filter.categoryId = req.query.categoryId; }
  const s = req.query.stock;
  if (s === 'out') filter.stockQuantity = 0;
  else if (s === 'low') Object.assign(filter, LOW);
  else if (s === 'in') filter.$expr = { $gt: ['$stockQuantity', '$lowStockThreshold'] };
  else if (s) throw new ApiError(400, 'Invalid stock filter');

  const [docs, total, counts] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
    Promise.all([
      Product.countDocuments({ ...NOT_DELETED }), Product.countDocuments({ ...NOT_DELETED, ...LOW }), Product.countDocuments({ ...NOT_DELETED, stockQuantity: 0 }),
    ]),
  ]);
  const nearest = await nearestExpiries(docs.map((d) => d._id));
  res.json({ items: docs.map((p) => productRow(p, nearest)), total, page, limit, summary: { products: counts[0], lowStock: counts[1], outOfStock: counts[2] } });
});

// Check Stock: các lô còn hàng của một sản phẩm
exports.getProductStock = asyncHandler(async (req, res) => {
  const p = await requireProduct(req.params.productId);
  const batches = await StockBatch.find({ productId: p._id, quantity: { $gt: 0 } }).sort({ expiryDate: 1, receivedAt: 1 }).lean();
  const now = new Date();
  res.json({
    product: { _id: p._id, name: p.name, sku: p.sku, unit: p.unit, stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold },
    batches: batches.map((b) => ({ ...b, expired: !!b.expiryDate && b.expiryDate < now })),
  });
});

// UC-19.2 Nhập hàng: tạo lô mới có hạn dùng
exports.receiveStock = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const p = await requireProduct(b.productId);
  const quantity = posInt(b.quantity, 'Quantity');
  let expiryDate;
  if (b.expiryDate) {
    expiryDate = new Date(b.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) throw new ApiError(400, 'Expiry date is invalid');
    if (expiryDate <= new Date()) throw new ApiError(400, 'Expiry date must be in the future');
  }
  let costPrice;
  if (b.costPrice !== undefined && b.costPrice !== '' && b.costPrice !== null) {
    costPrice = Number(b.costPrice);
    if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > 100000000) throw new ApiError(400, 'Cost price is invalid');
  }
  const out = await stock.receiveBatch({
    productId: p._id, quantity, expiryDate, costPrice, batchCode: text(b.batchCode, 'Batch code', { max: 40 }),
    reason: text(b.note, 'Note') || 'Stock received', userId: req.user.id,
  });
  await logActivity(req, { action: 'STOCK_RECEIVE', targetType: 'Product', targetId: p._id, detail: { quantity } });
  res.status(201).json(out);
});

// UC-19.3/34.2 Điều chỉnh tồn kho về số lượng mới (bắt buộc ghi lý do)
exports.adjustInventory = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const p = await requireProduct(b.productId);
  const target = Number(b.newQuantity);
  if (!Number.isInteger(target) || target < 0 || target > 1000000) throw new ApiError(400, 'New quantity must be a whole number of 0 or more');
  const reason = text(b.reason, 'Reason', { required: true });
  const r = await stock.setStockTo({ productId: p._id, target, type: 'adjust', reason, userId: req.user.id });
  if (r.change === 0) throw new ApiError(400, 'The new quantity equals the current stock. Nothing to adjust.');
  await logActivity(req, { action: 'STOCK_ADJUST', targetType: 'Product', targetId: p._id, detail: { change: r.change, reason } });
  res.json(r);
});

// Sinh mã phiên kiểm kê
const stocktakeCode = async () => {
  const d = new Date();
  const base = `ST-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const n = await Stocktake.countDocuments({ code: new RegExp(`^${base}`) });
  return `${base}-${String(n + 1).padStart(3, '0')}`;
};

// UC-19.4/34.3 Danh sách phiên kiểm kê
exports.listStocktakes = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query, 10);
  const filter = {};
  if (req.query.status) {
    if (!['in_progress', 'completed'].includes(req.query.status)) throw new ApiError(400, 'Invalid status');
    filter.status = req.query.status;
  }
  const [docs, total] = await Promise.all([
    Stocktake.find(filter).populate('performedBy', 'fullName').populate('items.productId', 'name sku unit').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Stocktake.countDocuments(filter),
  ]);
  res.json({
    items: docs.map((s) => ({
      _id: s._id, code: s.code, status: s.status, note: s.note, createdAt: s.createdAt, completedAt: s.completedAt,
      performedBy: s.performedBy ? { _id: s.performedBy._id, fullName: s.performedBy.fullName } : null,
      items: s.items.map((i) => ({ product: i.productId ? { _id: i.productId._id, name: i.productId.name, sku: i.productId.sku, unit: i.productId.unit } : null, systemQty: i.systemQty, countedQty: i.countedQty, difference: i.difference, note: i.note })),
      differenceTotal: s.items.reduce((sum, i) => sum + Math.abs(i.difference), 0),
    })),
    total, page, limit,
  });
});

// UC-19.4/34.3 Tạo phiên kiểm kê với số lượng đếm thực tế
exports.createStocktake = asyncHandler(async (req, res) => {
  const { items, note } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Add at least one product to count');
  if (items.length > 200) throw new ApiError(400, 'A stocktake can include at most 200 products');
  const seen = new Set();
  const rows = [];
  for (const it of items) {
    const p = await requireProduct(it?.productId);
    if (seen.has(String(p._id))) throw new ApiError(400, `"${p.name}" appears more than once`);
    seen.add(String(p._id));
    const counted = Number(it.countedQty);
    if (!Number.isInteger(counted) || counted < 0 || counted > 1000000) throw new ApiError(400, `Counted quantity for "${p.name}" is invalid`);
    rows.push({ productId: p._id, systemQty: p.stockQuantity, countedQty: counted, difference: counted - p.stockQuantity, note: text(it.note, 'Item note', { max: 200 }) });
  }
  const s = await Stocktake.create({ code: await stocktakeCode(), performedBy: req.user.id, items: rows, note: text(note, 'Note') });
  await logActivity(req, { action: 'STOCKTAKE_CREATE', targetType: 'Stocktake', targetId: s._id, detail: { code: s.code } });
  res.status(201).json(s);
});

// UC-19.4/34.3 Hoàn tất kiểm kê: đưa tồn kho về đúng số đã đếm
exports.completeStocktake = asyncHandler(async (req, res) => {
  validId(req.params.id, 'stocktake ID');
  const s = await Stocktake.findOneAndUpdate({ _id: req.params.id, status: 'in_progress' }, { $set: { status: 'completed', completedAt: new Date() } }, { new: true });
  if (!s) {
    const exists = await Stocktake.exists({ _id: req.params.id });
    throw new ApiError(exists ? 409 : 404, exists ? 'This stocktake is already completed' : 'Stocktake not found');
  }
  const failed = [];
  for (const it of s.items) {
    try {
      await stock.setStockTo({ productId: it.productId, target: it.countedQty, type: 'stocktake', reason: `Stocktake ${s.code}`, userId: req.user.id, stocktakeId: s._id });
    } catch (e) { failed.push({ productId: it.productId, message: e.message }); }
  }
  await logActivity(req, { action: 'STOCKTAKE_COMPLETE', targetType: 'Stocktake', targetId: s._id, detail: { code: s.code, failed: failed.length } });
  res.json({ stocktake: s, failed });
});

// UC-19.5/34.4 Sản phẩm sắp hết hàng
exports.listLowStock = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { ...NOT_DELETED, ...LOW };
  const [docs, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').sort({ stockQuantity: 1, name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const nearest = await nearestExpiries(docs.map((d) => d._id));
  res.json({ items: docs.map((p) => productRow(p, nearest)), total, page, limit });
});

// UC-34.5 Sản phẩm hết hàng
exports.listOutOfStock = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { ...NOT_DELETED, stockQuantity: 0 };
  const [docs, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items: docs.map((p) => productRow(p)), total, page, limit });
});

// UC-19.6 Các lô đã hết hạn mà vẫn còn hàng
exports.listExpired = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { quantity: { $gt: 0 }, expiryDate: { $lt: new Date() } };
  const [docs, total] = await Promise.all([
    StockBatch.find(filter).populate('productId', 'name sku unit').sort({ expiryDate: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    StockBatch.countDocuments(filter),
  ]);
  res.json({
    items: docs.map((b) => ({ _id: b._id, batchCode: b.batchCode, quantity: b.quantity, expiryDate: b.expiryDate, receivedAt: b.receivedAt,
      product: b.productId ? { _id: b.productId._id, name: b.productId.name, sku: b.productId.sku, unit: b.productId.unit } : null })),
    total, page, limit,
  });
});

// UC-19.7 Xem các lần ghi nhận hàng hỏng / hết hạn bị loại
exports.listDamaged = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = { type: { $in: ['damaged', 'expired'] } };
  const [docs, total] = await Promise.all([
    InventoryLog.find(filter).populate('productId', 'name sku unit').populate('performedBy', 'fullName').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    InventoryLog.countDocuments(filter),
  ]);
  res.json({
    items: docs.map((l) => ({ _id: l._id, type: l.type, quantity: -l.quantityChange, reason: l.reason, createdAt: l.createdAt,
      product: l.productId ? { _id: l.productId._id, name: l.productId.name, sku: l.productId.sku, unit: l.productId.unit } : null,
      performedBy: l.performedBy ? l.performedBy.fullName : null })),
    total, page, limit,
  });
});

// UC-19.7 Ghi nhận hàng hỏng / hết hạn và trừ khỏi kho
exports.recordDamaged = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const p = await requireProduct(b.productId);
  const type = b.type === 'expired' ? 'expired' : 'damaged';
  if (b.batchId) validId(b.batchId, 'batch ID');
  const quantity = posInt(b.quantity, 'Quantity');
  const reason = text(b.reason, 'Reason', { required: true });
  const r = await stock.removeStock({ productId: p._id, quantity, batchId: b.batchId, type, reason, userId: req.user.id });
  await logActivity(req, { action: type === 'expired' ? 'STOCK_EXPIRED_REMOVE' : 'STOCK_DAMAGED', targetType: 'Product', targetId: p._id, detail: { quantity, reason } });
  res.status(201).json(r);
});

// UC-34.6 Lịch sử biến động kho (nhập, bán, điều chỉnh, kiểm kê, hỏng)
exports.getInventoryHistory = asyncHandler(async (req, res) => {
  const { page, limit } = paging(req.query);
  const filter = {};
  if (req.query.productId) { validId(req.query.productId, 'product ID'); filter.productId = req.query.productId; }
  if (req.query.type) {
    if (!InventoryLog.schema.path('type').enumValues.includes(req.query.type)) throw new ApiError(400, 'Invalid type');
    filter.type = req.query.type;
  }
  const range = {};
  if (req.query.from) { const d = new Date(req.query.from); if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid from date'); range.$gte = d; }
  if (req.query.to) { const d = new Date(req.query.to); if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid to date'); range.$lte = d; }
  if (Object.keys(range).length) filter.createdAt = range;
  const [docs, total] = await Promise.all([
    InventoryLog.find(filter).populate('productId', 'name sku unit').populate('performedBy', 'fullName role').populate('orderId', 'orderCode').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    InventoryLog.countDocuments(filter),
  ]);
  res.json({
    items: docs.map((l) => ({ _id: l._id, type: l.type, quantityChange: l.quantityChange, quantityAfter: l.quantityAfter, reason: l.reason, createdAt: l.createdAt,
      product: l.productId ? { _id: l.productId._id, name: l.productId.name, sku: l.productId.sku, unit: l.productId.unit } : null,
      order: l.orderId ? l.orderId.orderCode : null,
      performedBy: l.performedBy ? l.performedBy.fullName : null })),
    total, page, limit,
  });
});
