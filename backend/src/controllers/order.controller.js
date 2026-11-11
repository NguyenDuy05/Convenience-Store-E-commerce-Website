const mongoose = require('mongoose');
const { notImplemented } = require('../utils/notImplemented');
const { Order, Store, Transaction, User } = require('../models');
const storeOrder = require('../services/storeOrder.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const checkout = require('../services/checkout.service');
const payment = require('../services/payment.service');

const STATUSES = Order.schema.path('status').enumValues;
const STORE_FIELDS = 'name address phone website openingHours status';
const NOT_FOUND = "Order not found";
const HISTORY_STATUSES = ['completed', 'failed', 'cancelled'];

const { toItem } = require('../utils/orderDto');

// Tóm tắt một đơn cho danh sách đơn của khách
const toListItem = (o) => ({
  _id: o._id,
  orderCode: o.orderCode,
  source: o.source,
  status: o.status,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  totalAmount: o.totalAmount,
  itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
  items: o.items.map(toItem),
  readyAt: o.readyAt,
  pickedUpAt: o.pickedUpAt,
  createdAt: o.createdAt,
});

const LIST_FIELDS = 'orderCode source status items paymentMethod paymentStatus totalAmount readyAt pickedUpAt createdAt';

// Đọc page/limit từ query
const parsePaging = (query, defLimit = 10) => ({
  page: Math.max(parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), 50),
});

// Lịch sử trạng thái cho khách (chỉ trạng thái + thời điểm, không lộ ghi chú nội bộ)
const toHistory = (list) =>
  (list || [])
    .map((h) => ({ status: h.status, changedAt: h.changedAt }))
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

// Tự hủy các đơn quá hạn thanh toán khi khách mở trang (bỏ qua lỗi)
const expireQuietly = (customerId) => payment.expireStaleOrders({ customerId }).catch((e) => console.error("Order expiry failed:", e));

// Hạn thanh toán và giao dịch gần nhất của đơn (để biết còn thanh toán được không)
const paymentInfo = async (o) => {
  const latest = await Transaction.find({ orderId: o._id }).sort({ createdAt: -1 }).limit(1).lean();
  return {
    expiresAt: o.status === 'pending_payment' ? payment.expiresAtOf(o) : null,
    latestPayment: latest[0] ? { method: latest[0].method, status: latest[0].status } : null,
  };
};

// UC-09.1 Khách xem danh sách đơn của mình (lọc theo trạng thái)
exports.listMyOrders = asyncHandler(async (req, res) => {
  await expireQuietly(req.user.id);
  const { page, limit } = parsePaging(req.query);
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, "Invalid order status");

  const customerId = new mongoose.Types.ObjectId(req.user.id);
  const filter = { customerId };
  if (status) filter.status = status;

  const [docs, total, grouped, store] = await Promise.all([
    Order.find(filter)
      .select(LIST_FIELDS)
      .populate({ path: 'items.productId', select: 'images unit' })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: { customerId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Store.findOne().select('name address').lean(),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => { counts[g._id] = g.n; });
  counts.all = grouped.reduce((sum, g) => sum + g.n, 0);

  const items = docs.map(toListItem);

  res.json({ items, total, page, limit, counts, store });
});

// UC-09.2 Khách xem chi tiết đơn (đơn của người khác trả 404)
exports.getMyOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, NOT_FOUND);
  await expireQuietly(req.user.id);

  const [o, store] = await Promise.all([
    Order.findOne({ _id: id, customerId: req.user.id })
      .populate({ path: 'items.productId', select: 'images unit' })
      .lean(),
    Store.findOne().select(STORE_FIELDS).lean(),
  ]);
  if (!o) throw new ApiError(404, NOT_FOUND);
  const pay = await paymentInfo(o);

  res.json({
    ...pay,
    _id: o._id,
    orderCode: o.orderCode,
    source: o.source,
    status: o.status,
    statusHistory: toHistory(o.statusHistory),
    items: o.items.map(toItem),
    subtotal: o.subtotal,
    appliedPromotions: (o.appliedPromotions || []).map((p) => ({ name: p.name, amount: p.amount })),
    promotionDiscount: o.promotionDiscount || 0,
    discountCode: o.discountCode?.code ? { code: o.discountCode.code, amount: o.discountCode.amount || 0 } : null,
    pointsUsed: o.pointsUsed || 0,
    pointsDiscount: o.pointsDiscount || 0,
    walletAmount: o.walletAmount || 0, payableAmount: o.payableAmount ?? o.totalAmount,
    refund: o.refund?.refundedAt ? o.refund : null,
    canCancel: ['pending_payment', 'confirmed'].includes(o.status),
    totalAmount: o.totalAmount,
    pickupSchedule: require('../services/pickupSchedule.service').pickupSchedule(store),
    preparationStartsAt: o.preparationStartsAt || null,
    pointsEarned: o.pointsEarned || 0,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paidAt: o.paidAt,
    customerNote: o.customerNote,
    readyAt: o.readyAt,
    pickedUpAt: o.pickedUpAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    store,
  });
});

// UC-09.3 Theo dõi trạng thái đơn và các mốc thời gian
exports.trackMyOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, NOT_FOUND);
  await expireQuietly(req.user.id);

  const [o, store] = await Promise.all([
    Order.findOne({ _id: id, customerId: req.user.id })
      .select('orderCode status statusHistory paymentMethod paymentStatus totalAmount readyAt pickedUpAt createdAt updatedAt')
      .lean(),
    Store.findOne().select('name address phone').lean(),
  ]);
  if (!o) throw new ApiError(404, NOT_FOUND);
  const pay = await paymentInfo(o);

  res.json({
    ...pay,
    _id: o._id,
    orderCode: o.orderCode,
    status: o.status,
    statusHistory: toHistory(o.statusHistory),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    readyAt: o.readyAt,
    pickedUpAt: o.pickedUpAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    fulfillment: { method: 'store_pickup', carrier: null, trackingNumber: null },
    store,
    serverTime: new Date(),
  });
});

// Đọc ngày from/to từ query; sai định dạng thì báo lỗi 400
const parseDate = (value, label) => {
  if (value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} is invalid`);
  return d;
};

// UC-09.4 Lịch sử đơn đã kết thúc của khách (lọc theo kết quả, khoảng ngày)
exports.listMyOrderHistory = asyncHandler(async (req, res) => {
  const { page, limit } = parsePaging(req.query);
  const { status } = req.query;
  if (status && !HISTORY_STATUSES.includes(status)) throw new ApiError(400, "Invalid history status");
  const from = parseDate(req.query.from, "Start date");
  const to = parseDate(req.query.to, "End date");
  if (from && to && from > to) throw new ApiError(400, "Start date must be before end date");

  const customerId = new mongoose.Types.ObjectId(req.user.id);
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  const base = { customerId };
  if (from || to) base.createdAt = dateFilter;
  const filter = { ...base, status: status || { $in: HISTORY_STATUSES } };

  const [docs, total, spent, store] = await Promise.all([
    Order.find(filter)
      .select(LIST_FIELDS)
      .populate({ path: 'items.productId', select: 'images unit' })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: { ...base, status: 'completed' } },
      { $group: { _id: null, completedCount: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
    ]),
    Store.findOne().select('name address').lean(),
  ]);

  res.json({
    items: docs.map(toListItem),
    total,
    page,
    limit,
    summary: { completedCount: spent[0]?.completedCount || 0, totalSpent: spent[0]?.totalSpent || 0 },
    store,
  });
});

const admin = require('./adminOrder.controller');
exports.listOrders = admin.listOrders;
exports.getOrder = admin.getOrder;
exports.updateOrderStatus = admin.updateOrderStatus;
exports.handleOrderIssue = admin.handleOrderIssue;
exports.resolveOrderIssue = admin.resolveOrderIssue;
exports.cancelOrder = admin.cancelOrder;
exports.listRefunds = admin.listRefunds;

// UC-08.1 Xem trước đơn: giá, khuyến mãi, mã giảm giá, ví, tồn kho tại thời điểm hiện tại
exports.previewCheckout = asyncHandler(async (req, res) => {
  res.json(await checkout.previewCheckout(req.user.id, { discountCode: req.body.discountCode }));
});

// UC-08.1 Tạo đơn từ giỏ hàng (chống đặt trùng bằng Idempotency-Key)
exports.createOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;
  const { order, replayed } = await checkout.createOrder(req.user.id, { ...req.body, idempotencyKey });
  res.status(replayed ? 200 : 201).json({ order, replayed });
});

// UC-22 Báo giá hóa đơn tại quầy (giá và khuyến mãi tính lại từ database)
exports.quoteStoreOrder = asyncHandler(async (req, res) => {
  const items = storeOrder.normalizeItems(req.body?.items);
  const quote = await storeOrder.buildQuote(items, req.body?.promotionId);
  res.json({ ...quote, canCreate: quote.issues.length === 0 && !quote.promoError && quote.lines.length > 0 && quote.totalAmount > 0 });
});

// UC-22 Tạo đơn tại quầy chờ thu tiền
exports.createStoreOrder = asyncHandler(async (req, res) => {
  const out = await storeOrder.createStoreOrder(req.user.id, req.body || {});
  res.status(out.idempotent ? 200 : 201).json(out);
});

// POS: chốt bán tại quầy (thu tiền, trừ kho); có gắn thành viên thì cộng điểm
exports.checkoutStoreSale = asyncHandler(async (req, res) => {
  const sale = await storeOrder.checkoutSale(req.user.id, { ...req.body, idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey });
  if (!sale.replayed) await require('../services/activity.service').logActivity(req, { action: 'POS_SALE', targetType: 'Order', targetId: sale.order._id, detail: { orderCode: sale.order.orderCode, method: sale.order.paymentMethod, amount: sale.order.totalAmount, member: sale.order.customerId ? String(sale.order.customerId) : undefined } });
  let points = null;
  if (sale.order.customerId) {
    await require('../services/points.service').awardPointsForOrder(sale.order._id);
    const [o, u] = await Promise.all([Order.findById(sale.order._id).select('pointsEarned').lean(), User.findById(sale.order.customerId).select('fullName membership.points').lean()]);
    points = { earned: o?.pointsEarned || 0, balance: u?.membership?.points || 0, member: u?.fullName || '' };
  }
  res.status(sale.replayed ? 200 : 201).json({ ...sale, points });
});
