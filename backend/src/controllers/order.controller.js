const mongoose = require('mongoose');
const { notImplemented } = require('../utils/notImplemented');
const { Order, Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const STATUSES = Order.schema.path('status').enumValues;
const STORE_FIELDS = 'name address phone openingHours status';
const NOT_FOUND = 'Không tìm thấy đơn hàng';

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

// UC-09.1 View Orders (catalog tài liệu; code cũ ghi UC-10.1)
// GET /api/orders/my?status=&page=&limit=
// Chỉ trả đơn của chính khách đang đăng nhập (BR-21). Mới nhất trước.
exports.listMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái đơn hàng không hợp lệ');

  const customerId = new mongoose.Types.ObjectId(req.user.id);
  const filter = { customerId };
  if (status) filter.status = status;

  const [docs, total, grouped, store] = await Promise.all([
    Order.find(filter)
      .select('orderCode source status items paymentMethod paymentStatus totalAmount readyAt pickedUpAt createdAt')
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

  const items = docs.map((o) => ({
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
  }));

  res.json({ items, total, page, limit, counts, store });
});

// UC-09.2 View Order Details (catalog tài liệu; code cũ ghi UC-10.2)
// GET /api/orders/my/:id
// Đơn không tồn tại HOẶC của người khác đều trả 404 giống nhau, không lộ đơn đó có tồn tại hay không.
// Chỉ đọc, không đổi trạng thái đơn/thanh toán. Không trả dữ liệu nội bộ (issues, createdBy, gateway...).
exports.getMyOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, NOT_FOUND);

  const [o, store] = await Promise.all([
    Order.findOne({ _id: id, customerId: req.user.id })
      .populate({ path: 'items.productId', select: 'images unit' })
      .lean(),
    Store.findOne().select(STORE_FIELDS).lean(),
  ]);
  if (!o) throw new ApiError(404, NOT_FOUND);

  res.json({
    _id: o._id,
    orderCode: o.orderCode,
    source: o.source,
    status: o.status,
    statusHistory: (o.statusHistory || []).map((h) => ({ status: h.status, changedAt: h.changedAt })),
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

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.createOrder = notImplemented('UC-09.1 Create Order');
exports.createStoreOrder = notImplemented('UC-22 Create Store Order');
exports.listOrders = notImplemented('UC-35.1, 35.2 View / Search Orders');
exports.getOrder = notImplemented('UC-35.3 View Order Details');
exports.updateOrderStatus = notImplemented('Chuyển trạng thái đơn: preparing, ready_for_pickup, completed');
exports.handleOrderIssue = notImplemented('UC-35.4 Handle Order Issue');
