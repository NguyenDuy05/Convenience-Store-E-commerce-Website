// Tính tiền đơn tại quầy (UC-21) từ dữ liệu có thẩm quyền: giá lấy từ Product, khuyến mãi tính bằng promotion.service.
// Không bao giờ tin số tiền client gửi lên. Dùng chung cho "báo giá" (quote) và "tạo đơn".
const mongoose = require('mongoose');
const { Product, Promotion, Order } = require('../models');
const { runAtomic } = require('../utils/atomic');
const { generateOrderCode } = require('./orderCode.service');
const stock = require('./stock.service');
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
  const sellable = await stock.sellableMap(products.map((p) => p._id));   // chỉ tính hàng còn hạn dùng
  const byId = new Map(products.map((p) => [String(p._id), Object.assign(p, { stockQuantity: sellable.get(String(p._id)) ?? 0 })]));
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

// UC-22 Tạo đơn tại quầy: giá/khuyến mãi tính lại từ database, trừ kho, đơn ở trạng thái chờ thanh toán (thu tiền ở UC-23).
// Trả { order, idempotent }. Cùng idempotencyKey gửi lại -> trả đúng đơn cũ, không tạo đơn thứ hai.
exports.createStoreOrder = async (staffId, body) => {
  const key = typeof body.idempotencyKey === 'string' && body.idempotencyKey.length <= 100 ? body.idempotencyKey : undefined;
  const findExisting = () => (key ? Order.findOne({ source: 'store', createdBy: staffId, idempotencyKey: key }).lean() : null);
  const existing = await findExisting();
  if (existing) return { order: existing, idempotent: true };

  const items = exports.normalizeItems(body.items);
  const quote = await exports.buildQuote(items, body.promotionId);
  if (quote.issues.length || quote.lines.length === 0) {
    throw new ApiError(409, quote.issues[0]?.message || 'Đơn hàng có sản phẩm không hợp lệ', { code: 'ORDER_ISSUES', quote });
  }
  if (quote.promoError) throw new ApiError(409, quote.promoError, { code: 'PROMOTION_INVALID', quote });
  if (quote.totalAmount <= 0) throw new ApiError(400, 'Tổng thanh toán phải lớn hơn 0');
  if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== quote.totalAmount) {
    throw new ApiError(409, 'Giá hoặc khuyến mãi đã thay đổi', { code: 'TOTAL_CHANGED', quote });
  }
  const note = typeof body.customerNote === 'string' ? body.customerNote.trim().slice(0, 500) : '';
  const now = new Date();

  try {
    const order = await runAtomic(async ({ session, onRollback }) => {
      const opts = session ? { session } : {};
      const [doc] = await Order.create([{
        orderCode: await generateOrderCode(),
        source: 'store',
        createdBy: staffId,
        items: quote.lines.map((l) => ({
          productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unitPrice, quantity: l.quantity,
          discountAmount: l.discountAmount, lineTotal: l.lineTotal,
        })),
        subtotal: quote.subtotal,
        appliedPromotions: quote.promotion ? [{ promotionId: quote.promotion._id, name: quote.promotion.name, amount: quote.discount }] : [],
        promotionDiscount: quote.discount,
        totalAmount: quote.totalAmount,
        status: 'pending_payment',
        statusHistory: [{ status: 'pending_payment', changedAt: now, changedBy: staffId, note: 'Tạo đơn tại quầy' }],
        paymentStatus: 'unpaid',
        ...(note ? { customerNote: note } : {}),
        ...(key ? { idempotencyKey: key } : {}),
      }], opts);
      onRollback(() => Order.deleteOne({ _id: doc._id }));
      await stock.deductStock(
        quote.lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity })),
        { orderId: doc._id, userId: staffId, session },
      );
      onRollback(() => stock.releaseStock(doc._id));
      return doc;
    });
    return { order: order.toObject ? order.toObject() : order, idempotent: false };
  } catch (err) {
    if (key && err && err.code === 11000) {
      const again = await findExisting();
      if (again) return { order: again, idempotent: true };
    }
    throw err;
  }
};
