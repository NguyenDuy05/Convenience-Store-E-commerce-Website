const mongoose = require('mongoose');
const { notImplemented } = require('../utils/notImplemented');
const { Promotion, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const promoService = require('../services/promotion.service');

const MAX_LINES = 100;
const MAX_QTY = 999;

const publicPromo = (p) => ({
  _id: p._id, name: p.name, description: p.description, type: p.type, value: p.value, maxDiscount: p.maxDiscount,
  scope: p.scope, categories: (p.categoryIds || []).map((c) => (c && c.name ? { _id: c._id, name: c.name } : { _id: c })),
  products: (p.productIds || []).map((x) => (x && x.name ? { _id: x._id, name: x.name } : { _id: x })),
  startDate: p.startDate, endDate: p.endDate,
});

// UC-02.4, 20.1 View Promotions (chỉ khuyến mãi đang hoạt động và còn hạn; chỉ đọc)
exports.listPromotions = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length > 100) throw new ApiError(400, 'Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)');
  let items = await promoService.findRunning()
    .populate('categoryIds', 'name').populate('productIds', 'name').sort({ endDate: 1 });
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((p) => `${p.name} ${p.description || ''}`.toLowerCase().includes(needle));
  }
  res.json({ items: items.map(publicPromo), total: items.length });
});

// UC-20.2 Apply Promotion: kiểm tra điều kiện + tính giảm giá từ giá trong DB.
// Chưa lưu gì vào đơn (đơn tại quầy UC-22 sẽ gọi lại service này khi chốt đơn); thất bại thì không có khoản giảm nào được áp dụng.
exports.applyPromotion = asyncHandler(async (req, res) => {
  const { promotionId, items } = req.body || {};
  if (!mongoose.isValidObjectId(promotionId)) throw new ApiError(400, 'Vui lòng chọn khuyến mãi hợp lệ');
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Đơn hàng chưa có sản phẩm nào');
  if (items.length > MAX_LINES) throw new ApiError(400, `Đơn hàng tối đa ${MAX_LINES} dòng sản phẩm`);

  // Gộp dòng trùng + kiểm tra số lượng
  const qtyById = new Map();
  for (const it of items) {
    const qty = Number(it?.quantity);
    if (!mongoose.isValidObjectId(it?.productId)) throw new ApiError(400, 'Sản phẩm trong đơn không hợp lệ');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ApiError(400, `Số lượng phải là số nguyên từ 1 đến ${MAX_QTY}`);
    qtyById.set(String(it.productId), (qtyById.get(String(it.productId)) || 0) + qty);
  }

  const promo = await Promotion.findById(promotionId);
  if (!promo || promo.status === 'deleted') throw new ApiError(404, 'Không tìm thấy khuyến mãi');
  if (promo.status !== 'active') throw new ApiError(409, 'Khuyến mãi hiện không hoạt động');
  const now = new Date();
  if (promo.startDate > now) throw new ApiError(409, 'Khuyến mãi chưa đến thời gian áp dụng');
  if (promo.endDate < now) throw new ApiError(409, 'Khuyến mãi đã hết hạn');

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = [];
  for (const [id, quantity] of qtyById) {
    const p = byId.get(id);
    if (!p || p.status !== 'active') throw new ApiError(409, `Sản phẩm "${p ? p.name : id}" không còn được bán`);
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
exports.listAllPromotions = notImplemented('UC-37.1 View Promotions (tất cả trạng thái)');
exports.createPromotion = notImplemented('UC-37.2 Create Promotion');
exports.updatePromotion = notImplemented('UC-37.3 Update Promotion');
exports.activatePromotion = notImplemented('UC-37.4 Activate Promotion');
exports.suspendPromotion = notImplemented('UC-37.5 Suspend Promotion');
exports.deletePromotion = notImplemented('UC-37.6 Delete Promotion');