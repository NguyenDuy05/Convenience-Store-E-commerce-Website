const { Cart, Product, Promotion, DiscountCode, Order, Store } = require('../models');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');
const stock = require('./stock.service');
const { generateOrderCode } = require('./orderCode.service');
const { computePricing, DiscountCodeError } = require('./pricing.service');
const { notifyOrder } = require('./notification.service');

const wallet = require('./wallet.service');
const { pickupSchedule } = require('./pickupSchedule.service');
const METHODS = ['vnpay'];
// Thời gian giữ hàng chờ thanh toán (mặc định 15 phút)
const ttlMs = () => (parseInt(process.env.PAYMENT_TTL_MINUTES, 10) || 15) * 60 * 1000;

// Đọc giỏ thành các dòng hợp lệ + vấn đề (ngừng bán, thiếu hàng)
async function loadCartLines(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const items = cart?.items || [];
  if (!items.length) return { lines: [], issues: [] };
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).lean();
  const sellable = await stock.sellableMap(products.map((p) => p._id));
  const pMap = new Map(products.map((p) => [String(p._id), { ...p, stockQuantity: sellable.get(String(p._id)) ?? 0 }]));
  const lines = [];
  const issues = [];
  items.forEach((it) => {
    const p = pMap.get(String(it.productId));
    if (!p || p.status !== 'active') {
      issues.push({ type: 'unavailable', productId: it.productId, name: p?.name || "Product is no longer available" });
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

// Tìm mã giảm giá đang bật và số lần khách đã dùng
async function loadDiscount(userId, input) {
  const text = typeof input === 'string' ? input.trim().toUpperCase() : '';
  if (!text) return { discountCode: null, userUsedCount: 0 };
  const discountCode = await DiscountCode.findOne({ code: text, status: 'active' }).lean();
  if (discountCode?.assignedTo && String(discountCode.assignedTo) !== String(userId)) throw new DiscountCodeError("This discount code does not exist or is unavailable");
  if (!discountCode) throw new DiscountCodeError("This discount code does not exist or is unavailable");
  const userUsedCount = await Order.countDocuments({ customerId: userId, 'discountCode.codeId': discountCode._id, status: { $nin: ['failed', 'cancelled'] } });
  return { discountCode, userUsedCount };
}

// Dựng tóm tắt giá trả về cho trang thanh toán
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

// Tính tóm tắt giá của giỏ (khi tạo đơn thì mã sai báo lỗi; khi xem trước thì chỉ cảnh báo)
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

// Xem trước đơn: giá, khuyến mãi, mã giảm giá, ví, giờ nhận hàng
exports.previewCheckout = async (userId, { discountCode } = {}) => {
  const { pricing, issues, discountError } = await buildSummary(userId, discountCode, { throwOnCodeError: false });
  const store = await Store.findOne({ status: 'open' }).select('name address phone openingHours status').lean()
    || await Store.findOne().select('name address phone openingHours status closedReason').lean();
  const schedule = pickupSchedule(store);
  const storeClosed = !schedule.acceptingOrders;
  const summary = toSummary(pricing, issues, discountError);
  return { ...summary, pickupSchedule: schedule, walletBalance: await wallet.balance(userId), estimatedPoints: Math.floor(pricing.totalAmount / 10000), canCheckout: summary.canCheckout && !storeClosed, storeClosed, store };
};

// Dữ liệu đơn trả về sau khi tạo
const orderView = (o) => ({
  _id: o._id, orderCode: o.orderCode, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
  preparationStartsAt: o.preparationStartsAt || null,
  walletAmount: o.walletAmount || 0, payableAmount: o.payableAmount ?? o.totalAmount, totalAmount: o.totalAmount, createdAt: o.createdAt,
  expiresAt: o.status === 'pending_payment' ? new Date(new Date(o.createdAt).getTime() + ttlMs()) : null,
});

// Tạo đơn: kiểm tra giá, trừ kho, giữ mã giảm giá, trừ ví (chống đặt trùng bằng idempotencyKey)
exports.createOrder = async (userId, { paymentMethod, discountCode, customerNote, expectedTotal, idempotencyKey, expectedWalletAmount }) => {
  if (!METHODS.includes(paymentMethod)) throw new ApiError(400, "Website orders use VNPay only");
  const key = typeof idempotencyKey === 'string' && idempotencyKey.trim() ? idempotencyKey.trim().slice(0, 100) : null;

  const store = await Store.findOne().lean();
  const schedule = pickupSchedule(store);
  if (!schedule.acceptingOrders) throw new ApiError(409, schedule.notice || 'The store is temporarily closed.', { code: 'STORE_CLOSED' });

  if (key) {
    const existing = await Order.findOne({ customerId: userId, idempotencyKey: key }).lean();
    if (existing?.checkoutReady === false) throw new ApiError(409, 'Order creation is still processing. Please retry shortly.', { code: 'CHECKOUT_PROCESSING' });
    if (existing) return { order: orderView(existing), replayed: true };
  }

  const { pricing, issues } = await buildSummary(userId, discountCode, { throwOnCodeError: true });
  if (pricing.lines.length === 0 && issues.length === 0) throw new ApiError(400, "Your cart is empty", { code: 'EMPTY_CART' });
  if (issues.length) {
    throw new ApiError(409, "Some items in your cart have insufficient stock", {
      code: 'CART_ISSUES', issues, summary: toSummary(pricing, issues, null),
    });
  }
  if (pricing.totalAmount <= 0) throw new ApiError(400, "Order total must be greater than zero");
  if (expectedTotal !== undefined && Number(expectedTotal) !== pricing.totalAmount) {
    throw new ApiError(409, "Prices or promotions have changed. Please review your order.", {
      code: 'PRICE_CHANGED', summary: toSummary(pricing, issues, null),
    });
  }

  await wallet.ensure(userId);
  const walletAmount = Math.min(await wallet.balance(userId), pricing.totalAmount);
  if (expectedWalletAmount !== undefined && Number(expectedWalletAmount) !== walletAmount) throw new ApiError(409, 'Your wallet balance changed. Please review checkout.', { code: 'WALLET_BALANCE_CHANGED' });
  const payableAmount = pricing.totalAmount - walletAmount;
  const online = payableAmount > 0;
  const status = online ? 'pending_payment' : 'confirmed';
  const note = typeof customerNote === 'string' ? customerNote.trim().slice(0, 500) : '';
  const now = new Date();

  try {
    const order = await runAtomic(async ({ session, onRollback }) => {
      const opts = session ? { session } : {};
      const orderCode = await generateOrderCode();
      const [doc] = await Order.create([{
        orderCode,
        source: 'online',
        preparationStartsAt: schedule.isOpen ? undefined : schedule.nextOpenAt,
        customerId: userId,
        items: pricing.lines.map((l) => ({
          productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unitPrice,
          quantity: l.quantity, discountAmount: l.discountAmount, lineTotal: l.lineTotal,
        })),
        subtotal: pricing.subtotal,
        appliedPromotions: pricing.appliedPromotions,
        promotionDiscount: pricing.promotionDiscount,
        ...(pricing.discountCode ? { discountCode: pricing.discountCode } : {}),
        discountReservationVersion: pricing.discountCode ? 1 : undefined,
        totalAmount: pricing.totalAmount,
        status,
        statusHistory: [{ status, changedAt: now }],
        walletPolicy: true, walletAmount, payableAmount, checkoutReady: false,
        paymentMethod: online ? 'vnpay' : 'wallet',
        paymentStatus: online ? 'unpaid' : 'paid',
        ...(!online ? { paidAt: now } : {}),
        ...(note ? { customerNote: note } : {}),
        ...(key ? { idempotencyKey: key } : {}),
      }], opts);
      onRollback(() => Order.deleteOne({ _id: doc._id }));

      await stock.deductStock(
        pricing.lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity })),
        { orderId: doc._id, userId, session },
      );
      onRollback(() => stock.releaseStock(doc._id));

      if (pricing.discountCode) {
        const reservations = require('./discountReservation.service');
        await reservations.reserve(pricing.discountCode.codeId, userId, doc._id, { session });
        onRollback(() => reservations.release(doc));
      }

      if (walletAmount > 0) {
        await wallet.move(userId, { key: 'pay:' + doc._id, amount: -walletAmount, orderId: doc._id, orderCode, description: 'Order payment' }, { session });
        onRollback(() => wallet.move(userId, { key: 'return:' + doc._id, amount: walletAmount, orderId: doc._id, orderCode, description: 'Checkout reversed' }));
      }
      if (walletAmount > 0) {
        const { Transaction } = require('../models');
        const [txn] = await Transaction.create([{ orderId: doc._id, customerId: userId, method: 'wallet', amount: walletAmount, status: 'success', paidAt: now }], opts);
        onRollback(() => Transaction.deleteOne({ _id: txn._id }));
      }
      const cartService = require('./cart.service');
      const removed = await cartService.removePurchasedItems(userId, pricing.lines, { session });
      onRollback(() => cartService.restorePurchasedItems(userId, removed));
      doc.checkoutReady = true;
      await doc.save(opts);
      return doc;
    });
    void notifyOrder(order, 'order_created');
    return { order: orderView(order.toObject ? order.toObject() : order), replayed: false };
  } catch (err) {
    if (key && err && err.code === 11000) {
      const existing = await Order.findOne({ customerId: userId, idempotencyKey: key }).lean();
      if (existing?.checkoutReady === false) throw new ApiError(409, 'Order creation is still processing. Please retry shortly.', { code: 'CHECKOUT_PROCESSING' });
      if (existing) return { order: orderView(existing), replayed: true };
    }
    throw err;
  }
};

exports.PAYMENT_METHODS = METHODS;
