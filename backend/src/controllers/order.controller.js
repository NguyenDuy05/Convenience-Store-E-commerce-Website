const mongoose = require('mongoose');
const { notImplemented } = require('../utils/notImplemented');
const { Order, Store, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const checkout = require('../services/checkout.service');
const payment = require('../services/payment.service');

const STATUSES = Order.schema.path('status').enumValues;
const STORE_FIELDS = 'name address phone openingHours status';
const NOT_FOUND = 'Không tìm thấy đơn hàng';
// Đơn đã kết thúc (thuộc lịch sử): đã nhận hàng hoặc thanh toán lỗi
const HISTORY_STATUSES = ['completed', 'failed'];

// Dòng hàng trả về cho khách: snapshot trong đơn + ảnh/đơn vị lấy từ Product (đơn cũ vẫn đúng giá, tên)
const toItem = (it) => {
  const product = it.productId && it.productId._id ? it.productId : null;
  return {
    productId: product ? product._id : null,
    name: it.name,
    sku: it.sku,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
    discountAmount: it.discountAmount || 0,
    lineTotal: it.lineTotal,
    image: product?.images?.[0] || null,
    unit: product?.unit || null,
  };
};

// Tóm tắt một đơn cho danh sách (dùng chung cho View Orders và View Order History)
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

const parsePaging = (query, defLimit = 10) => ({
  page: Math.max(parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), 50),
});

// Chỉ lịch sử StatusHistory cần cho khách: trạng thái + thời điểm (không lộ changedBy/note nội bộ)
const toHistory = (list) =>
  (list || [])
    .map((h) => ({ status: h.status, changedAt: h.changedAt }))
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

// Đơn chờ thanh toán quá hạn thì chuyển failed + hoàn kho ngay khi khách xem (job nền cũng làm việc này mỗi phút).
// Lỗi ở bước này không được làm hỏng việc xem đơn.
const expireQuietly = (customerId) => payment.expireStaleOrders({ customerId }).catch((e) => console.error('Hết hạn đơn lỗi:', e));

// Thông tin để giao diện biết còn thanh toán được không: hạn thanh toán + giao dịch gần nhất (không lộ dữ liệu cổng)
const paymentInfo = async (o) => {
  const latest = await Transaction.find({ orderId: o._id }).sort({ createdAt: -1 }).limit(1).lean();
  return {
    expiresAt: o.status === 'pending_payment' ? payment.expiresAtOf(o) : null,
    latestPayment: latest[0] ? { method: latest[0].method, status: latest[0].status } : null,
  };
};

// UC-09.1 View Orders (catalog tài liệu; code cũ ghi UC-10.1)
// GET /api/orders/my?status=&page=&limit=
// Chỉ trả đơn của chính khách đang đăng nhập (BR-21). Mới nhất trước.
exports.listMyOrders = asyncHandler(async (req, res) => {
  await expireQuietly(req.user.id);
  const { page, limit } = parsePaging(req.query);
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái đơn hàng không hợp lệ');

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
    // Số đơn theo từng trạng thái (không phụ thuộc bộ lọc) để hiện trên các tab
    Order.aggregate([{ $match: { customerId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Store.findOne().select('name address').lean(),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => { counts[g._id] = g.n; });
  counts.all = grouped.reduce((sum, g) => sum + g.n, 0);

  const items = docs.map(toListItem);

  res.json({ items, total, page, limit, counts, store });
});

// UC-09.2 View Order Details (catalog tài liệu; code cũ ghi UC-10.2)
// GET /api/orders/my/:id
// Đơn không tồn tại HOẶC của người khác đều trả 404 giống nhau, không lộ đơn đó có tồn tại hay không.
// Chỉ đọc, không đổi trạng thái đơn/thanh toán. Không trả dữ liệu nội bộ (issues, createdBy, gateway...).
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
    totalAmount: o.totalAmount,
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

// UC-09.3 Track Order Status
// GET /api/orders/my/:id/tracking
// Trả trạng thái hiện tại + các mốc đã xảy ra (kèm thời điểm). Đơn nhận tại cửa hàng nên không có hãng vận chuyển:
// fulfillment.carrier/trackingNumber = null để giao diện giải thích. updatedAt + serverTime giúp khách biết dữ liệu cập nhật lúc nào.
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

// Chuyển 'from'/'to' (ISO) thành Date; null nếu không gửi; ném 400 nếu sai định dạng
const parseDate = (value, label) => {
  if (value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} không hợp lệ`);
  return d;
};

// UC-09.4 View Order History
// GET /api/orders/my/history?status=completed|failed&from=&to=&page=&limit=
// Chỉ đơn đã kết thúc (completed, failed) của chính khách (BR-21), lọc theo ngày đặt. Dữ liệu lấy từ snapshot lưu trong đơn.
// summary: số đơn đã nhận và tổng chi tiêu trong khoảng đã lọc.
exports.listMyOrderHistory = asyncHandler(async (req, res) => {
  const { page, limit } = parsePaging(req.query);
  const { status } = req.query;
  if (status && !HISTORY_STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái lịch sử không hợp lệ');
  const from = parseDate(req.query.from, 'Ngày bắt đầu');
  const to = parseDate(req.query.to, 'Ngày kết thúc');
  if (from && to && from > to) throw new ApiError(400, 'Ngày bắt đầu phải trước ngày kết thúc');

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

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
// UC-08.1 Create Order, bước xem trước (hiển thị lại sản phẩm, giá, khuyến mãi, tổng tiền hiện tại)
// POST /api/orders/preview  body: { discountCode? }
exports.previewCheckout = asyncHandler(async (req, res) => {
  res.json(await checkout.previewCheckout(req.user.id, { discountCode: req.body.discountCode }));
});

// UC-08.1 Create Order (catalog tài liệu; code cũ ghi UC-09.1)
// POST /api/orders  header Idempotency-Key  body: { paymentMethod: cash|vnpay|momo, discountCode?, customerNote?, expectedTotal }
// Tạo đơn + trừ kho + dọn giỏ trong một khối atomic. Đơn online ở trạng thái pending_payment (giữ hàng), tiếp theo gọi
// POST /api/payments/online để lấy link thanh toán. Tiền mặt: xác nhận ngay, trả khi nhận hàng.
exports.createOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;
  const { order, replayed } = await checkout.createOrder(req.user.id, { ...req.body, idempotencyKey });
  res.status(replayed ? 200 : 201).json({ order, replayed });
});
exports.createStoreOrder = notImplemented('UC-22 Create Store Order');
exports.listOrders = notImplemented('UC-35.1, 35.2 View / Search Orders');
exports.getOrder = notImplemented('UC-35.3 View Order Details');
exports.updateOrderStatus = notImplemented('Chuyển trạng thái đơn: preparing, ready_for_pickup, completed');
exports.handleOrderIssue = notImplemented('UC-35.4 Handle Order Issue');
