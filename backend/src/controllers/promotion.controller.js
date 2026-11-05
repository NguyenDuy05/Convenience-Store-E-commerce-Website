const mongoose = require('mongoose');
const { Promotion, Product, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const promoService = require('../services/promotion.service');
const { logActivity } = require('../services/activity.service');

const MAX_LINES = 100;
const MAX_QTY = 999;

const publicPromo = (p) => ({
  _id: p._id, name: p.name, description: p.description, type: p.type, value: p.value, maxDiscount: p.maxDiscount,
  scope: p.scope, categories: (p.categoryIds || []).map((c) => (c && c.name ? { _id: c._id, name: c.name } : { _id: c })),
  products: (p.productIds || []).map((x) => (x && x.name ? { _id: x._id, name: x.name } : { _id: x })),
  startDate: p.startDate, endDate: p.endDate,
});

// UC-02.4, 20.1 View Promotions (active promotions within their date range; read only)
exports.listPromotions = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length > 100) throw new ApiError(400, 'Search must not exceed 100 characters');
  let items = await promoService.findRunning()
    .populate('categoryIds', 'name').populate('productIds', 'name').sort({ endDate: 1 });
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((p) => `${p.name} ${p.description || ''}`.toLowerCase().includes(needle));
  }
  res.json({ items: items.map(publicPromo), total: items.length });
});

// UC-20.2 Apply Promotion: validate eligibility and calculate discounts using database prices.
// Preview only; counter checkout (UC-22) evaluates the promotion again before saving the order.
exports.applyPromotion = asyncHandler(async (req, res) => {
  const { promotionId, items } = req.body || {};
  if (!mongoose.isValidObjectId(promotionId)) throw new ApiError(400, 'Select a valid promotion');
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'The order has no items');
  if (items.length > MAX_LINES) throw new ApiError(400, `An order can contain at most ${MAX_LINES} product lines`);

  // Combine duplicate lines and validate quantities
  const qtyById = new Map();
  for (const it of items) {
    const qty = Number(it?.quantity);
    if (!mongoose.isValidObjectId(it?.productId)) throw new ApiError(400, 'Invalid product in the order');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ApiError(400, `Quantity must be an integer between 1 and ${MAX_QTY}`);
    qtyById.set(String(it.productId), (qtyById.get(String(it.productId)) || 0) + qty);
  }

  const promo = await Promotion.findById(promotionId);
  if (!promo || promo.status === 'deleted') throw new ApiError(404, 'Promotion not found');
  if (promo.status !== 'active') throw new ApiError(409, 'This promotion is not active');
  const now = new Date();
  if (promo.startDate > now) throw new ApiError(409, 'This promotion has not started yet');
  if (promo.endDate < now) throw new ApiError(409, 'This promotion has expired');

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = [];
  for (const [id, quantity] of qtyById) {
    const p = byId.get(id);
    if (!p || p.status !== 'active') throw new ApiError(409, `Product "${p ? p.name : id}" is no longer available`);
    lines.push({ productId: p._id, categoryId: p.categoryId, name: p.name, unitPrice: p.price, quantity });
  }

  const result = promoService.evaluate(promo, lines);
  if (!result.applicable) throw new ApiError(422, result.reason);

  const subtotal = result.lines.reduce((s, l) => s + l.lineSubtotal, 0);
  res.json({
    promotion: { _id: promo._id, name: promo.name, type: promo.type, value: promo.value, maxDiscount: promo.maxDiscount, scope: promo.scope },
    lines: result.lines.map(({ categoryId, ...l }) => l),
    subtotal,
    discount: result.discount,
    totalAmount: subtotal - result.discount,
    appliedAt: now,
  });
});
const MANAGED_STATUSES = ['inactive', 'active', 'suspended', 'deleted'];
const EDITABLE_FIELDS = ['name', 'description', 'type', 'value', 'maxDiscount', 'scope', 'categoryIds', 'productIds', 'startDate', 'endDate'];
const validId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function readPromotion(body) {
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120)
    throw new ApiError(400, 'Name is required and must not exceed 120 characters');
  if (body.description != null && (typeof body.description !== 'string' || body.description.length > 2000))
    throw new ApiError(400, 'Description must not exceed 2000 characters');
  if (!['percent', 'fixed'].includes(body.type)) throw new ApiError(400, 'Invalid discount type');
  if (typeof body.value !== 'number' || !Number.isFinite(body.value) || body.value <= 0 || body.value > 100000000 ||
      (body.type === 'percent' && body.value > 100) || (body.type === 'fixed' && !Number.isInteger(body.value)))
    throw new ApiError(400, 'Discount must be positive: up to 100% or 100,000,000 VND in whole amounts');
  let maxDiscount = null;
  if (body.maxDiscount != null && body.maxDiscount !== '') {
    if (typeof body.maxDiscount !== 'number' || !Number.isInteger(body.maxDiscount) || body.maxDiscount <= 0 || body.maxDiscount > 100000000)
      throw new ApiError(400, 'Maximum discount must be a positive whole VND amount up to 100,000,000');
    if (body.type === 'percent') maxDiscount = body.maxDiscount;
  }
  const scope = body.scope ?? 'all';
  if (!['all', 'category', 'product'].includes(scope)) throw new ApiError(400, 'Invalid promotion scope');
  const date = (value) => (value instanceof Date || (typeof value === 'string' && value.trim())) ? new Date(value) : new Date(NaN);
  const startDate = date(body.startDate);
  const endDate = date(body.endDate);
  if (!Number.isFinite(+startDate) || !Number.isFinite(+endDate) || endDate <= startDate)
    throw new ApiError(400, 'End date must be later than start date; both dates must be valid');
  const selectedIds = (key) => {
    const ids = body[key] ?? [];
    if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => !validId(id)))
      throw new ApiError(400, 'Select up to 100 valid categories or products');
    return [...new Set(ids.map((id) => id.toLowerCase()))];
  };
  const categories = selectedIds('categoryIds');
  const products = selectedIds('productIds');
  const ids = scope === 'category' ? categories : scope === 'product' ? products : [];
  if (scope !== 'all') {
    if (!ids.length) throw new ApiError(400, `Select at least one ${scope === 'category' ? 'category' : 'product'}`);
    const model = scope === 'category' ? Category : Product;
    if (await model.countDocuments({ _id: { $in: ids }, status: 'active' }) !== ids.length)
      throw new ApiError(400, 'Selected categories or products must exist and be active');
  }
  return { name: body.name.trim(), description: (body.description || '').trim(), type: body.type,
    value: body.value, maxDiscount, scope, categoryIds: scope === 'category' ? categories : [],
    productIds: scope === 'product' ? products : [], startDate, endDate };
}

async function loadManaged(id) {
  if (!validId(id)) throw new ApiError(404, 'Promotion not found');
  const promotion = await Promotion.findOne({ _id: id, status: { $ne: 'deleted' } }).lean();
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  return promotion;
}

async function saveManaged(req, current, fields, action) {
  // Compare-and-swap prevents concurrent administrators from overwriting this operation.
  const promotion = await Promotion.findOneAndUpdate(
    { _id: current._id, __v: current.__v, status: current.status },
    { $set: fields, $inc: { __v: 1 } }, { new: true, runValidators: true },
  );
  if (!promotion) throw new ApiError(409, 'This promotion was updated by someone else. Please refresh and try again.');
  await logActivity(req, { action, targetType: 'Promotion', targetId: current._id, detail: { name: promotion.name, status: promotion.status } });
  return promotion;
}

exports.listAllPromotions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { status, scope } = req.query;
  if (status && !MANAGED_STATUSES.includes(status)) throw new ApiError(400, 'Invalid promotion status');
  if (scope && !['all', 'category', 'product'].includes(scope)) throw new ApiError(400, 'Invalid promotion scope');
  if (req.query.q !== undefined && typeof req.query.q !== 'string') throw new ApiError(400, 'Invalid search query');
  const q = (req.query.q || '').trim();
  if (q.length > 100) throw new ApiError(400, 'Search must not exceed 100 characters');
  const filter = { status: status || { $ne: 'deleted' }, ...(scope ? { scope } : {}) };
  if (q) filter.$or = [{ name: new RegExp(escapeRegex(q), 'i') }, { description: new RegExp(escapeRegex(q), 'i') }];
  const [items, total] = await Promise.all([
    Promotion.find(filter).populate('categoryIds', 'name').populate('productIds', 'name sku')
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Promotion.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

exports.createPromotion = asyncHandler(async (req, res) => {
  const fields = await readPromotion(req.body || {});
  if (fields.endDate <= new Date()) throw new ApiError(400, 'A new promotion must end in the future');
  const promotion = await Promotion.create({ ...fields, status: 'inactive', createdBy: req.user.id });
  await logActivity(req, { action: 'PROMOTION_CREATE', targetType: 'Promotion', targetId: promotion._id, detail: { name: promotion.name } });
  res.status(201).json(promotion);
});

exports.updatePromotion = asyncHandler(async (req, res) => {
  const current = await loadManaged(req.params.id);
  if (!EDITABLE_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key)))
    throw new ApiError(400, 'Provide at least one editable promotion field');
  const merged = { ...current };
  for (const key of EDITABLE_FIELDS) if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) merged[key] = req.body[key];
  // MongoDB returns ObjectIds; normalize existing references before validating a partial update.
  for (const key of ['categoryIds', 'productIds']) if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) merged[key] = (current[key] || []).map(String);
  const fields = await readPromotion(merged);
  if (fields.endDate <= new Date()) throw new ApiError(400, 'Updated promotions must end in the future');
  res.json(await saveManaged(req, current, fields, 'PROMOTION_UPDATE'));
});

exports.activatePromotion = asyncHandler(async (req, res) => {
  const current = await loadManaged(req.params.id);
  if (current.endDate <= new Date()) throw new ApiError(409, 'Expired promotions cannot be activated. Update the dates first.');
  await readPromotion({ ...current, categoryIds: (current.categoryIds || []).map(String), productIds: (current.productIds || []).map(String) });
  if (current.status === 'active') return res.json(current);
  res.json(await saveManaged(req, current, { status: 'active' }, 'PROMOTION_ACTIVATE'));
});

exports.suspendPromotion = asyncHandler(async (req, res) => {
  const current = await loadManaged(req.params.id);
  if (current.status !== 'active') throw new ApiError(409, 'Only active promotions can be suspended');
  res.json(await saveManaged(req, current, { status: 'suspended' }, 'PROMOTION_SUSPEND'));
});

exports.deletePromotion = asyncHandler(async (req, res) => {
  const current = await loadManaged(req.params.id);
  res.json(await saveManaged(req, current, { status: 'deleted' }, 'PROMOTION_DELETE'));
});
