// Tính tiền đơn tại quầy (UC-21) từ dữ liệu có thẩm quyền: giá lấy từ Product, khuyến mãi tính bằng promotion.service.
// Không bao giờ tin số tiền client gửi lên. Dùng chung cho "báo giá" (quote) và "tạo đơn".
const mongoose = require('mongoose');
const { Product, Promotion, Order, User } = require('../models');
const { runAtomic } = require('../utils/atomic');
const { generateOrderCode } = require('./orderCode.service');
const stock = require('./stock.service');
const ApiError = require('../utils/ApiError');
const promoService = require('./promotion.service');
const { Transaction } = require('../models');
const crypto = require('node:crypto');

const MAX_LINES = 100;
const MAX_QTY = 999;

// items: [{ productId, quantity }] -> gộp dòng trùng, kiểm tra định dạng (ném ApiError 400 nếu sai)
exports.normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, "The order has no items");
  if (items.length > MAX_LINES) throw new ApiError(400, `An order can have at most ${MAX_LINES} product lines`);
  const map = new Map();
  for (const it of items) {
    const qty = Number(it?.quantity);
    if (typeof it?.productId !== 'string' || !/^[a-f\d]{24}$/i.test(it.productId)) throw new ApiError(400, "Invalid product in the order");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ApiError(400, `Quantity must be an integer from 1 to ${MAX_QTY}`);
    map.set(String(it.productId), (map.get(String(it.productId)) || 0) + qty);
  }
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
};

// POS confirmation records a completed sale, its payment and stock movement together.
exports.checkoutSale = async (staffId, body = {}) => {
  if (typeof body.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.idempotencyKey)) throw new ApiError(400, 'A valid checkout key is required');
  const items = exports.normalizeItems(body.items).sort((a, b) => a.productId.localeCompare(b.productId));
  if (items.some((item) => item.quantity > MAX_QTY)) throw new ApiError(400, `Maximum quantity per item is ${MAX_QTY}`);
  const method = body.method;
  if (!['cash', 'card', 'vnpay'].includes(method)) throw new ApiError(400, 'Select a supported payment method');
  const received = Number(body.received);
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (method === 'cash' && (!Number.isSafeInteger(received) || received < 0 || received > 1e9)) throw new ApiError(400, 'Enter a valid cash amount');
  if (method !== 'cash' && (!/^[A-Za-z0-9-]{4,40}$/.test(reference) || body.paymentConfirmed !== true)) throw new ApiError(400, 'Confirm the approved terminal/QR payment and enter its transaction reference');
  const note = typeof body.customerNote === 'string' ? body.customerNote.trim().slice(0, 500) : '';
  // Thành viên (tùy chọn): gắn đơn cho khách để tích điểm
  let customerId = null;
  if (body.customerId !== undefined && body.customerId !== null && body.customerId !== '') {
    if (typeof body.customerId !== 'string' || !/^[a-f\d]{24}$/i.test(body.customerId)) throw new ApiError(400, 'Invalid member');
    const member = await User.findOne({ _id: body.customerId, role: 'customer', status: 'active' }).select('_id').lean();
    if (!member) throw new ApiError(404, 'This member is not available', { code: 'MEMBER_NOT_FOUND' });
    customerId = member._id;
  }
  const hash = crypto.createHash('sha256').update(JSON.stringify({ items, method, payment: method === 'cash' ? received : reference, promotion: body.promotionId || '', note, customer: customerId ? String(customerId) : '' })).digest('hex');
  const key = `pos:${staffId}:${body.idempotencyKey}`;
  const resultOf = async (order, replayed) => {
    if (order.checkoutHash !== hash) throw new ApiError(409, 'This checkout key was used for a different sale', { code: 'CHECKOUT_KEY_REUSED' });
    const transaction = await Transaction.findOne({ orderId: order._id, status: 'success' }).lean();
    if (!transaction) throw new ApiError(409, 'This checkout is still being confirmed. Retry the same request.', { code: 'CHECKOUT_PENDING' });
    return { order, transaction, change: transaction.cash?.change || 0, replayed };
  };
  const findExisting = () => Order.findOne({ source: 'store', createdBy: staffId, idempotencyKey: key }).lean();
  const existing = await findExisting();
  if (existing) return resultOf(existing, true);
  const quote = await exports.buildQuote(items, body.promotionId);
  if (quote.issues.length || !quote.lines.length) throw new ApiError(409, quote.issues[0]?.message || 'No valid items in the bill', { code: 'ORDER_ISSUES', quote });
  if (quote.promoError) throw new ApiError(409, quote.promoError, { code: 'PROMOTION_INVALID', quote });
  if (quote.totalAmount <= 0) throw new ApiError(400, 'The bill total must be greater than zero');
  if (Number(body.expectedTotal) !== quote.totalAmount) throw new ApiError(409, 'Prices or promotions changed. Review the updated bill before collecting payment.', { code: 'TOTAL_CHANGED', quote });
  if (method === 'cash' && received < quote.totalAmount) throw new ApiError(400, 'The cash amount is less than the bill total', { code: 'INSUFFICIENT_CASH' });
  if (method !== 'cash' && await Transaction.exists({ 'gateway.provider': 'pos', 'gateway.transactionNo': reference, status: 'success' })) throw new ApiError(409, 'This transaction reference has already been recorded', { code: 'DUPLICATE_REFERENCE' });
  try {
    const sale = await runAtomic(async ({ session, onRollback }) => {
      const opts = session ? { session } : {};
      const now = new Date();
      const [order] = await Order.create([{
        orderCode: await generateOrderCode(), source: 'store', createdBy: staffId, idempotencyKey: key, checkoutHash: hash, ...(customerId ? { customerId } : {}),
        items: quote.lines.map((l) => ({ productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unitPrice, quantity: l.quantity, discountAmount: l.discountAmount, lineTotal: l.lineTotal })),
        subtotal: quote.subtotal, promotionDiscount: quote.discount, totalAmount: quote.totalAmount,
        appliedPromotions: quote.promotion ? [{ promotionId: quote.promotion._id, name: quote.promotion.name, amount: quote.discount }] : [],
        status: 'completed', paymentStatus: 'paid', paymentMethod: method, paidAt: now, pickedUpAt: now, customerNote: note,
        statusHistory: [{ status: 'completed', changedAt: now, changedBy: staffId, note: 'In-store POS sale confirmed; payment collected and items handed over' }],
      }], opts);
      onRollback(() => Order.deleteOne({ _id: order._id }));
      await stock.deductStock(quote.lines, { orderId: order._id, userId: staffId, session, reason: 'POS counter sale' });
      onRollback(() => stock.releaseStock(order._id));
      const [transaction] = await Transaction.create([{
        orderId: order._id, ...(customerId ? { customerId } : {}), processedBy: staffId, method, amount: quote.totalAmount, status: 'success', paidAt: now,
        ...(method === 'cash' ? { cash: { received, change: received - quote.totalAmount } } : { gateway: { provider: 'pos', transactionNo: reference, payDate: now } }),
      }], opts);
      onRollback(() => Transaction.deleteOne({ _id: transaction._id }));
      return { order, transaction, change: method === 'cash' ? received - quote.totalAmount : 0, replayed: false };
    });
    return sale;
  } catch (error) {
    if (error.code === 11000) {
      const replay = await findExisting();
      if (replay) return resultOf(replay, true);
      throw new ApiError(409, 'This payment reference is already in use. Check order history before retrying.', { code: 'DUPLICATE_REFERENCE' });
    }
    throw error;
  }
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
      issues.push({ productId: it.productId, type: 'unavailable', message: `Product "${p ? p.name : "does not exist"}" is not available for sale` });
      if (p) lines.push({ productId: p._id, categoryId: p.categoryId, name: p.name, sku: p.sku, unit: p.unit, unitPrice: p.price, quantity: it.quantity, available: 0 });
      continue;
    }
    if (p.stockQuantity < it.quantity) {
      issues.push({ productId: it.productId, type: 'insufficient_stock', available: p.stockQuantity, message: `Product "${p.name}" has insufficient stock (available: ${p.stockQuantity})` });
    }
    lines.push({ productId: p._id, categoryId: p.categoryId, name: p.name, sku: p.sku, unit: p.unit, unitPrice: p.price, quantity: it.quantity, available: p.stockQuantity });
  }

  let promotion = null;
  let promoError = null;
  let discount = 0;
  let priced = lines.map((l) => ({ ...l, lineSubtotal: l.unitPrice * l.quantity, discountAmount: 0, lineTotal: l.unitPrice * l.quantity }));
  if (promotionId) {
    const promo = mongoose.isValidObjectId(promotionId) ? await Promotion.findById(promotionId) : null;
    if (!promo || promo.status === 'deleted') promoError = "Promotion not found";
    else if (!promoService.isRunning(promo)) promoError = "This promotion is no longer available";
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
    throw new ApiError(409, quote.issues[0]?.message || "The order contains invalid products", { code: 'ORDER_ISSUES', quote });
  }
  if (quote.promoError) throw new ApiError(409, quote.promoError, { code: 'PROMOTION_INVALID', quote });
  if (quote.totalAmount <= 0) throw new ApiError(400, "Payment total must be greater than zero");
  if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== quote.totalAmount) {
    throw new ApiError(409, "Prices or promotions have changed", { code: 'TOTAL_CHANGED', quote });
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
        statusHistory: [{ status: 'pending_payment', changedAt: now, changedBy: staffId, note: "Create store order" }],
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
