const mongoose = require('mongoose');
const { DiscountCode, Order } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validateDiscountCode: checkCode, DiscountCodeError } = require('../services/pricing.service');
const { logActivity } = require('../services/activity.service');
const notifications = require('../services/inAppNotification.service');

// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

// Lấy mã giảm giá chưa bị xóa theo id (404 nếu không có)
async function loadCode(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Discount code not found');
  const d = await DiscountCode.findOne({ _id: id, status: { $ne: 'deleted' } });
  if (!d) throw new ApiError(404, 'Discount code not found');
  return d;
}

// Kiểm tra dữ liệu mã giảm giá (loại, giá trị, giới hạn lượt, thời gian)
function parseBody(body = {}, { partial } = {}) {
  const num = (v, label, { min = 0, max = 1e9, int = true, optional = false } = {}) => {
    if (v === undefined || v === null || v === '') {
      if (optional) return undefined;
      throw new ApiError(400, `${label} is required`);
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new ApiError(400, `${label} is invalid`);
    return n;
  };
  const out = {};
  if (!partial) {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!CODE_RE.test(code)) throw new ApiError(400, 'Code must be 3-30 characters: letters, digits, dash or underscore');
    out.code = code;
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > 300) throw new ApiError(400, 'Description must be 300 characters or fewer');
  out.description = description || undefined;
  if (!['percent', 'fixed'].includes(body.type)) throw new ApiError(400, 'Discount type must be percent or fixed');
  out.type = body.type;
  out.value = body.type === 'percent' ? num(body.value, 'Discount value', { min: 1, max: 100 }) : num(body.value, 'Discount value', { min: 1, max: 100000000 });
  out.maxDiscount = body.type === 'percent' ? num(body.maxDiscount, 'Maximum discount', { min: 1, max: 100000000, optional: true }) : undefined;
  out.minOrderAmount = num(body.minOrderAmount ?? 0, 'Minimum order amount', { min: 0, max: 100000000 });
  out.usageLimit = num(body.usageLimit, 'Usage limit', { min: 1, max: 10000000, optional: true });
  out.perUserLimit = num(body.perUserLimit ?? 1, 'Per-user limit', { min: 1, max: 1000 });
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Start and end dates are required');
  if (end <= start) throw new ApiError(400, 'End date must be later than start date');
  out.startDate = start;
  out.endDate = end;
  return out;
}

// Khách kiểm tra mã giảm giá khi thanh toán (hợp lệ không, giảm bao nhiêu)
exports.validateDiscountCode = asyncHandler(async (req, res) => {
  const text = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  if (!text) throw new ApiError(400, 'Enter a discount code');
  const found = await DiscountCode.findOne({ code: text, status: 'active' }).lean();
  const code = found && found.assignedTo && String(found.assignedTo) !== String(req.user.id) ? null : found;   // mã tặng riêng chỉ chủ mã dùng được
  const used = code ? await Order.countDocuments({ customerId: req.user.id, 'discountCode.codeId': code._id, status: { $ne: 'failed' } }) : 0;
  const amount = Number(req.body?.amount) || Infinity;
  try {
    checkCode(code, { amount, userUsedCount: used });
  } catch (err) {
    if (err instanceof DiscountCodeError) throw new ApiError(400, err.message, { code: 'INVALID_DISCOUNT_CODE' });
    throw err;
  }
  res.json({ valid: true, code: code.code, type: code.type, value: code.value, maxDiscount: code.maxDiscount ?? null, minOrderAmount: code.minOrderAmount });
});

// Khách xem kho voucher: mã đang chạy, còn lượt cho mình (kể cả mã tặng riêng như voucher xin lỗi)
exports.listAvailableDiscountCodes = asyncHandler(async (req, res) => {
  const now = new Date();
  const codes = await DiscountCode.find({
    status: 'active', startDate: { $lte: now }, endDate: { $gte: now },
    $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }, { assignedTo: req.user.id }],
    $expr: { $lt: [{ $ifNull: ['$usedCount', 0] }, { $ifNull: ['$usageLimit', Number.MAX_SAFE_INTEGER] }] },
  }).sort({ endDate: 1 }).limit(50).lean();
  const used = await Order.aggregate([
    { $match: { customerId: new (require('mongoose').Types.ObjectId)(String(req.user.id)), 'discountCode.codeId': { $in: codes.map((c) => c._id) }, status: { $ne: 'failed' } } },
    { $group: { _id: '$discountCode.codeId', n: { $sum: 1 } } },
  ]);
  const usedMap = new Map(used.map((u) => [String(u._id), u.n]));
  const items = codes
    .map((c) => ({ _id: c._id, code: c.code, description: c.description || '', type: c.type, value: c.value, maxDiscount: c.maxDiscount ?? null, minOrderAmount: c.minOrderAmount || 0,
      startDate: c.startDate, endDate: c.endDate, personal: !!c.assignedTo, remainingUses: (c.perUserLimit || 1) - (usedMap.get(String(c._id)) || 0) }))
    .filter((c) => c.remainingUses > 0)
    .sort((a, b) => Number(b.personal) - Number(a.personal));
  res.json({ items });
});

// UC-38.1 Admin xem / tìm mã giảm giá
exports.listDiscountCodes = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { status } = req.query;
  if (status && !['inactive', 'active', 'suspended', 'deleted'].includes(status)) throw new ApiError(400, 'Invalid status');
  const filter = { status: status || { $ne: 'deleted' } };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ code: rx }, { description: rx }]; }
  const [items, total] = await Promise.all([
    DiscountCode.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    DiscountCode.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

// UC-38.2 Tạo mã giảm giá (mặc định chưa kích hoạt)
exports.createDiscountCode = asyncHandler(async (req, res) => {
  const data = parseBody(req.body);
  if (await DiscountCode.exists({ code: data.code })) throw new ApiError(409, 'This code already exists');
  const d = await DiscountCode.create({ ...data, createdBy: req.user.id });
  await logActivity(req, { action: 'DISCOUNT_CODE_CREATE', targetType: 'DiscountCode', targetId: d._id, detail: { code: d.code } });
  res.status(201).json(d);
});

// UC-38.3 Sửa mã giảm giá (không đổi được mã code)
exports.updateDiscountCode = asyncHandler(async (req, res) => {
  const d = await loadCode(req.params.id);
  const data = parseBody(req.body, { partial: true });
  if (data.usageLimit != null && data.usageLimit < d.usedCount) throw new ApiError(400, `Usage limit cannot be lower than the ${d.usedCount} uses already recorded`);
  Object.assign(d, data);
  if (data.maxDiscount === undefined) d.maxDiscount = undefined;
  if (data.usageLimit === undefined) d.usageLimit = undefined;
  await d.save();
  await logActivity(req, { action: 'DISCOUNT_CODE_UPDATE', targetType: 'DiscountCode', targetId: d._id });
  res.json(d);
});

// UC-38.4 Kích hoạt mã giảm giá
exports.activateDiscountCode = asyncHandler(async (req, res) => {
  const d = await loadCode(req.params.id);
  if (d.status === 'active') throw new ApiError(409, 'This code is already active');
  if (d.endDate <= new Date()) throw new ApiError(409, 'This code has already expired. Update its dates first.');
  d.status = 'active';
  await d.save();
  void notifications.announceOffer(d, 'voucher');
  await logActivity(req, { action: 'DISCOUNT_CODE_ACTIVATE', targetType: 'DiscountCode', targetId: d._id });
  res.json(d);
});

// UC-38.5 Tạm ngưng mã giảm giá
exports.suspendDiscountCode = asyncHandler(async (req, res) => {
  const d = await loadCode(req.params.id);
  if (d.status !== 'active') throw new ApiError(409, 'Only active codes can be suspended');
  d.status = 'suspended';
  await d.save();
  void notifications.withdrawOffer(d, 'voucher');
  await logActivity(req, { action: 'DISCOUNT_CODE_SUSPEND', targetType: 'DiscountCode', targetId: d._id });
  res.json(d);
});

// UC-38.6 Xóa mềm mã giảm giá (đơn cũ vẫn giữ tham chiếu)
exports.deleteDiscountCode = asyncHandler(async (req, res) => {
  const d = await loadCode(req.params.id);
  d.status = 'deleted';
  await d.save();
  void notifications.withdrawOffer(d, 'voucher');
  await logActivity(req, { action: 'DISCOUNT_CODE_DELETE', targetType: 'DiscountCode', targetId: d._id, detail: { code: d.code } });
  res.json({ message: 'Discount code deleted' });
});
