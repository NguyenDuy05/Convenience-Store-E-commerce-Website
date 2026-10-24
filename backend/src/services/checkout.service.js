// UC-08.1 Create Order (và bước xem trước đơn). Mọi giá/tồn kho đều tính lại ở server.
const { Cart, Product, Promotion, DiscountCode, Order, Store } = require('../models');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');
const stock = require('./stock.service');
const { generateOrderCode } = require('./orderCode.service');
const { computePricing, DiscountCodeError } = require('./pricing.service');

const METHODS = ['cash', 'vnpay', 'momo'];          // khách tự đặt online chỉ dùng 3 cách này ('card' là của nhân viên tại quầy)
const ttlMs = () => (parseInt(process.env.PAYMENT_TTL_MINUTES, 10) || 15) * 60 * 1000;

// Đọc giỏ -> danh sách dòng hợp lệ + các vấn đề (ngừng bán, thiếu hàng)
async function loadCartLines(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const items = cart?.items || [];
  if (!items.length) return { lines: [], issues: [] };
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).lean();
  const pMap = new Map(products.map((p) => [String(p._id), p]));
  const lines = [];
  const issues = [];
  items.forEach((it) => {
    const p = pMap.get(String(it.productId));
    if (!p || p.status !== 'active') {
      issues.push({ type: 'unavailable', productId: it.productId, name: p?.name || 'Sản phẩm không còn bán' });
      return;
    }
    if (p.stockQuantity < it.quantity) {
      issues.push({ type: 'insufficient_stock', productId: p._id, name: p.name, available: p.stockQuantity, requested: it.quantity });
    }
    lines.push({
      productId: p._id, categoryId: p.categoryId, name: p.name, sku: p.sku, unit: p.unit,
      image: p.images?.[0] || null, unitPrice: p.price, quantity: it.quantity,
    });
  });
  return { lines, issues };
}

async function loadDiscount(userId, input) {
  const text = typeof input === 'string' ? input.trim().toUpperCase() : '';
  if (!text) return { discountCode: null, userUsedCount: 0 };
  const discountCode = await DiscountCode.findOne({ code: text, status: 'active' }).lean();
  if (!discountCode) throw new DiscountCodeError('Mã giảm giá không tồn tại hoặc không còn hiệu lực');
  const userUsedCount = await Order.countDocuments({ customerId: userId, 'discountCode.codeId': discountCode._id, status: { $ne: 'failed' } });
  return { discountCode, userUsedCount };
}

const toSummary = (pricing, issues, discountError) => ({
  items: pricing.lines.map((l) => ({
    productId: l.productId, name: l.name, image: l.image, unit: l.unit,
    unitPrice: l.unitPrice, quantity: l.quantity, discountAmount: l.discountAmount, lineTotal: l.lineTotal,
  })),
  subtotal: pricing.subtotal,
  appliedPromotions: pricing.appliedPromotions.map((p) => ({ name: p.name, amount: p.amount })),
  promotionDiscount: pricing.promotionDiscount,
  discountCode: pricing.discountCode ? { code: pricing.discountCode.code, amount: pricing.discountCode.amount } : null,
  discountError: discountError || null,
  totalAmount: pricing.totalAmount,
  issues,
  canCheckout: pricing.lines.length > 0 && issues.length === 0 && pricing.totalAmount > 0,
});

// Dựng tóm tắt giá. throwOnCodeError=true (khi tạo đơn): mã sai -> lỗi; false (xem trước): bỏ mã và báo discountError.
async function buildSummary(userId, codeInput, { throwOnCodeError }) {
  const { lines, issues } = await loadCartLines(userId);
  const now = new Date();
  const promotions = lines.length
    ? await Promotion.find({ status: 'active', startDate: { $lte: now }, endDate: { $gte: now } }).sort({ createdAt: 1 }).lean()
    : [];
  let pricing;
  let discountError = null;
  try {
    const { discountCode, userUsedCount } = await loadDiscount(userId, codeInput);
    pricing = computePricing({ lines, promotions, discountCode, userUsedCount, now });
  } catch (err) {
    if (!(err instanceof DiscountCodeError)) throw err;
    if (throwOnCodeError) throw new ApiError(400, err.message, { code: 'INVALID_DISCOUNT_CODE' });
    discountError = err.message;
    pricing = computePricing({ lines, promotions, now });
  }
  return { pricing, issues, discountError };
}

// Xem trước đơn (UC-08.1 bước 2-3): hiển thị lại sản phẩm, giá, khuyến mãi, tổng tiền THỜI ĐIỂM HIỆN TẠI
exports.previewCheckout = async (userId, { discountCode } = {}) => {
  const { pricing, issues, discountError } = await buildSummary(userId, discountCode, { throwOnCodeError: false });
  const store = await Store.findOne().select('name address phone openingHours').lean();
  return { ...toSummary(pricing, issues, discountError), store };
};

const orderView = (o) => ({
  _id: o._id, orderCode: o.orderCode, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
  totalAmount: o.totalAmount, createdAt: o.createdAt,
  expiresAt: o.status === 'pending_payment' ? new Date(new Date(o.createdAt).getTime() + ttlMs()) : null,
});

// Tạo đơn. Trả { order, replayed }. replayed=true nếu cùng idempotencyKey đã tạo đơn trước đó (không tạo đơn thứ hai).
exports.createOrder = async (userId, { paymentMethod, discountCode, customerNote, expectedTotal, idempotencyKey }) => {
  if (!METHODS.includes(paymentMethod)) throw new ApiError(400, 'Vui lòng chọn phương thức thanh toán hợp lệ (tiền mặt, VNPay hoặc MoMo)');
  const key = typeof idempotencyKey === 'string' && idempotencyKey.trim() ? idempotencyKey.trim().slice(0, 100) : null;

  if (key) {
    const existing = await Order.findOne({ customerId: userId, idempotencyKey: key }).lean();
    if (existing) return { order: orderView(existing), replayed: true };
  }

  const { pricing, issues } = await buildSummary(userId, discountCode, { throwOnCodeError: true });
  if (pricing.lines.length === 0 && issues.length === 0) throw new ApiError(400, 'Giỏ hàng trống', { code: 'EMPTY_CART' });
  if (issues.length) {
    throw new ApiError(409, 'Một số sản phẩm trong giỏ không còn đủ để đặt hàng', {
      code: 'CART_ISSUES', issues, summary: toSummary(pricing, issues, null),
    });
  }
  if (pricing.totalAmount <= 0) throw new ApiError(400, 'Tổng tiền đơn hàng phải lớn hơn 0');
  // E1: giá/khuyến mãi đã đổi so với lúc khách xem -> dừng, hiển thị lại để khách xác nhận
  if (expectedTotal !== undefined && Number(expectedTotal) !== pricing.totalAmount) {
    throw new ApiError(409, 'Giá hoặc khuyến mãi đã thay đổi so với lúc bạn xem. Vui lòng kiểm tra lại đơn hàng.', {
      code: 'PRICE_CHANGED', summary: toSummary(pricing, issues, null),
    });
  }

  const online = paymentMethod !== 'cash';
  const status = online ? 'pending_payment' : 'confirmed';   // tiền mặt: xác nhận ngay, trả khi nhận hàng
  const note = typeof customerNote === 'string' ? customerNote.trim().slice(0, 500) : '';
  const now = new Date();

  try {
    const order = await runAtomic(async ({ session, onRollback }) => {
      const opts = session ? { session } : {};
      const orderCode = await generateOrderCode();
      const [doc] = await Order.create([{
        orderCode,
        source: 'online',
        customerId: userId,
        items: pricing.lines.map((l) => ({
          productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unitPrice,
          quantity: l.quantity, discountAmount: l.discountAmount, lineTotal: l.lineTotal,
        })),
        subtotal: pricing.subtotal,
        appliedPromotions: pricing.appliedPromotions,
        promotionDiscount: pricing.promotionDiscount,
        ...(pricing.discountCode ? { discountCode: pricing.discountCode } : {}),
        totalAmount: pricing.totalAmount,
        status,
        statusHistory: [{ status, changedAt: now }],
        paymentMethod,
        paymentStatus: 'unpaid',
        ...(note ? { customerNote: note } : {}),
        ...(key ? { idempotencyKey: key } : {}),
      }], opts);
      onRollback(() => Order.deleteOne({ _id: doc._id }));

      // Trừ kho theo thời gian thực (BR-19): thiếu hàng thì ném 409 và toàn bộ được hoàn tác
      await stock.deductStock(
        pricing.lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity })),
        { orderId: doc._id, userId, session },
      );
      onRollback(() => stock.releaseStock(doc._id));

      if (pricing.discountCode) {
        const cond = { _id: pricing.discountCode.codeId, status: 'active' };
        const limited = await DiscountCode.findOne({ _id: pricing.discountCode.codeId }, null, opts).lean();
        if (limited && typeof limited.usageLimit === 'number') cond.usedCount = { $lt: limited.usageLimit };
        const used = await DiscountCode.findOneAndUpdate(cond, { $inc: { usedCount: 1 } }, { new: true, ...opts });
        if (!used) throw new ApiError(409, 'Mã giảm giá vừa hết lượt sử dụng. Vui lòng bỏ mã hoặc chọn mã khác.', { code: 'INVALID_DISCOUNT_CODE' });
        onRollback(() => DiscountCode.updateOne({ _id: used._id }, { $inc: { usedCount: -1 } }));
      }

      // Bước cuối: dọn giỏ (chỉ bỏ các sản phẩm đã đặt, sản phẩm khách mới thêm trong lúc này vẫn giữ)
      await Cart.updateOne(
        { userId }, { $pull: { items: { productId: { $in: pricing.lines.map((l) => l.productId) } } } }, opts,
      );
      return doc;
    });
    return { order: orderView(order.toObject ? order.toObject() : order), replayed: false };
  } catch (err) {
    // Hai yêu cầu cùng idempotencyKey chạy song song: yêu cầu thua trả lại đơn của yêu cầu thắng
    if (key && err && err.code === 11000) {
      const existing = await Order.findOne({ customerId: userId, idempotencyKey: key }).lean();
      if (existing) return { order: orderView(existing), replayed: true };
    }
    throw err;
  }
};

exports.PAYMENT_METHODS = METHODS;
