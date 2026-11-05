// Tính tiền đơn tại quầy (UC-21) từ dữ liệu có thẩm quyền: giá lấy từ Product, khuyến mãi tính bằng promotion.service.
// Không bao giờ tin số tiền client gửi lên. Dùng chung cho "báo giá" (quote) và "tạo đơn".
const mongoose = require('mongoose');
const { Product, Promotion } = require('../models');
const ApiError = require('../utils/ApiError');
const promoService = require('./promotion.service');

const MAX_LINES = 100;
const MAX_QTY = 999;

// items: [{ productId, quantity }] -> gộp dòng trùng, kiểm tra định dạng (ném ApiError 400 nếu sai)
exports.normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Đơn hàng chưa có sản phẩm nào');
  if (items.length > MAX_LINES) throw new ApiError(400, `Đơn hàng tối đa ${MAX_LINES} dòng sản phẩm`);
  const map = new Map();
  for (const it of items) {
    const qty = Number(it?.quantity);
    if (!mongoose.isValidObjectId(it?.productId)) throw new ApiError(400, 'Sản phẩm trong đơn không hợp lệ');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ApiError(400, `Số lượng phải là số nguyên từ 1 đến ${MAX_QTY}`);
    map.set(String(it.productId), (map.get(String(it.productId)) || 0) + qty);
  }
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
};

// Trả { lines, issues, subtotal, promotion, promoError, discount, totalAmount }
//  - issues: lỗi theo từng dòng (sản phẩm không bán / không đủ hàng) -> phải sửa trước khi tạo đơn (21.0.E2)
//  - promoError: lý do khuyến mãi không áp dụng được (chưa trừ gì vào tổng)
exports.buildQuote = async (items, promotionId) => {
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const issues = [];
  const lines = [];
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p || p.status !== 'active') {
      issues.push({ productId: it.productId, type: 'unavailable', message: `Sản phẩm "${p ? p.name : 'không tồn tại'}" hiện không được bán` });
      if (p) lines.push({ productId: p._id, categoryId: p.categoryId, name: p.name, sku: p.sku, unit: p.unit, unitPrice: p.price, quantity: it.quantity, available: 0 });
      continue;
    }
    if (p.stockQuantity < it.quantity) {
      issues.push({ productId: it.productId, type: 'insufficient_stock', available: p.stockQuantity, message: `Sản phẩm "${p.name}" không đủ hàng (còn ${p.stockQuantity})` });
    }
    lines.push({ productId: p._id, categoryId: p.categoryId, name: p.name, sku: p.sku, unit: p.unit, unitPrice: p.price, quantity: it.quantity, available: p.stockQuantity });
  }

  let promotion = null;
  let promoError = null;
  let discount = 0;
  let priced = lines.map((l) => ({ ...l, lineSubtotal: l.unitPrice * l.quantity, discountAmount: 0, lineTotal: l.unitPrice * l.quantity }));
  if (promotionId) {
    const promo = mongoose.isValidObjectId(promotionId) ? await Promotion.findById(promotionId) : null;
    if (!promo || promo.status === 'deleted') promoError = 'Không tìm thấy khuyến mãi';
    else if (!promoService.isRunning(promo)) promoError = 'Khuyến mãi hiện không còn hiệu lực';
    else {
      const r = promoService.evaluate(promo, lines);
      if (!r.applicable) promoError = r.reason;
      else {
        promotion = { _id: promo._id, name: promo.name, type: promo.type, value: promo.value };
        discount = r.discount;
        priced = r.lines;
      }
    }
  }
  const subtotal = priced.reduce((s, l) => s + l.lineSubtotal, 0);
  return {
    lines: priced.map(({ categoryId, eligible, ...l }) => l),
    issues, subtotal, promotion, promoError, discount, totalAmount: subtotal - discount,
  };
};
