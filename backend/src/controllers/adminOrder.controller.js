// UC-34 Manage Orders (Admin). Catalog tài liệu ghi UC-34.x; code cũ ghi UC-35.x.
const mongoose = require('mongoose');
const { Order, User, Transaction, Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');
const { toItem } = require('../utils/orderDto');
const { logActivity } = require('../services/activity.service');

const STATUSES = Order.schema.path('status').enumValues;
const SOURCES = ['online', 'store'];
const PAY_STATUSES = ['unpaid', 'paid', 'failed'];
const PAY_METHODS = ['cash', 'card', 'vnpay', 'momo'];
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  total_desc: { totalAmount: -1, _id: -1 },
  total_asc: { totalAmount: 1, _id: -1 },
};
// Chuyển trạng thái theo đúng thứ tự xử lý đơn nhận tại cửa hàng
const NEXT_STATUS = { confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'completed' };
const NOT_FOUND = 'Không tìm thấy đơn hàng';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => mongoose.isValidObjectId(v);

const parseDate = (value, label) => {
  if (value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} không hợp lệ`);
  return d;
};

const pick = (value, allowed, label) => {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value)) throw new ApiError(400, `${label} không hợp lệ`);
  return value;
};

const openIssues = (o) => (o.issues || []).filter((i) => i.status === 'open').length;

// UC-34.1 View Orders + UC-34.2 Search Orders
// GET /api/orders?q=&status=&source=&paymentStatus=&paymentMethod=&from=&to=&hasIssue=1&sort=&page=&limit=
// q tìm theo: mã đơn, tên/email/số điện thoại khách, tên sản phẩm trong đơn (không phân biệt hoa thường). Các bộ lọc kết hợp bằng AND.
exports.listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const status = pick(req.query.status, STATUSES, 'Trạng thái');
  const source = pick(req.query.source, SOURCES, 'Nguồn đơn');
  const paymentStatus = pick(req.query.paymentStatus, PAY_STATUSES, 'Trạng thái thanh toán');
  const paymentMethod = pick(req.query.paymentMethod, PAY_METHODS, 'Phương thức thanh toán');
  const sortKey = pick(req.query.sort, Object.keys(SORTS), 'Cách sắp xếp') || 'newest';
  const from = parseDate(req.query.from, 'Ngày bắt đầu');
  const to = parseDate(req.query.to, 'Ngày kết thúc');
  if (from && to && from > to) throw new ApiError(400, 'Ngày bắt đầu phải trước ngày kết thúc');

  const base = {};
  if (source) base.source = source;
  if (paymentStatus) base.paymentStatus = paymentStatus;
  if (paymentMethod) base.paymentMethod = paymentMethod;
  if (from || to) base.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.query.hasIssue === '1' || req.query.hasIssue === 'true') base['issues.status'] = 'open';

  const text = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    const users = await User.find({ role: 'customer', $or: [{ fullName: rx }, { email: rx }, { phone: rx }] }).select('_id').limit(200).lean();
    base.$or = [{ orderCode: rx }, { 'items.name': rx }];
    if (users.length) base.$or.push({ customerId: { $in: users.map((u) => u._id) } });
    if (isId(text)) base.$or.push({ _id: text });
  }
  const filter = status ? { ...base, status } : base;

  const [docs, total, grouped, openTotal] = await Promise.all([
    Order.find(filter)
      .select('orderCode source customerId status items paymentMethod paymentStatus totalAmount createdAt issues.status')
      .sort(SORTS[sortKey])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    // Số đơn theo trạng thái (theo các bộ lọc khác, không theo trạng thái) để hiện trên các tab
    Order.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.countDocuments({ 'issues.status': 'open' }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => { counts[g._id] = g.n; });
  counts.all = grouped.reduce((s, g) => s + g.n, 0);

  const ids = [...new Set(docs.filter((o) => o.customerId).map((o) => String(o.customerId)))];
  const customers = ids.length ? await User.find({ _id: { $in: ids } }).select('fullName email phone').lean() : [];
  const cMap = new Map(customers.map((c) => [String(c._id), c]));

  res.json({
    items: docs.map((o) => {
      const c = o.customerId ? cMap.get(String(o.customerId)) : null;
      return {
        _id: o._id,
        orderCode: o.orderCode,
        source: o.source,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        totalAmount: o.totalAmount,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        customer: c ? { _id: c._id, fullName: c.fullName, email: c.email, phone: c.phone } : null,
        openIssues: openIssues(o),
        createdAt: o.createdAt,
      };
    }),
    total, page, limit, counts, openIssueTotal: openTotal,
  });
});

// Điều kiện xem được từng bước chuyển (giao diện dùng để hiện nút)
const allowedTransition = (o) => {
  const next = NEXT_STATUS[o.status];
  if (!next) return null;
  return { to: next, needsCashConfirm: next === 'completed' && o.paymentStatus !== 'paid' && o.paymentMethod === 'cash' };
};

// UC-34.3 View Order Details
// GET /api/orders/:id  Toàn bộ thông tin kể cả nội bộ: khách, giao dịch thanh toán, lịch sử trạng thái kèm người thao tác, sự cố.
exports.getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const [o, txns, store] = await Promise.all([
    Order.findById(id).populate({ path: 'items.productId', select: 'images unit' }).lean(),
    Transaction.find({ orderId: id }).sort({ createdAt: 1 }).lean(),
    Store.findOne().select('name address phone').lean(),
  ]);
  if (!o) throw new ApiError(404, NOT_FOUND);

  const userIds = new Set();
  [o.customerId, o.createdBy].forEach((u) => u && userIds.add(String(u)));
  (o.statusHistory || []).forEach((h) => h.changedBy && userIds.add(String(h.changedBy)));
  (o.issues || []).forEach((i) => { if (i.reportedBy) userIds.add(String(i.reportedBy)); if (i.handledBy) userIds.add(String(i.handledBy)); });
  txns.forEach((t) => t.processedBy && userIds.add(String(t.processedBy)));
  const users = userIds.size ? await User.find({ _id: { $in: [...userIds] } }).select('fullName email phone role').lean() : [];
  const uMap = new Map(users.map((u) => [String(u._id), u]));
  const name = (uid) => (uid && uMap.get(String(uid)) ? uMap.get(String(uid)).fullName : null);
  const customer = o.customerId ? uMap.get(String(o.customerId)) : null;

  res.json({
    _id: o._id,
    orderCode: o.orderCode,
    source: o.source,
    status: o.status,
    customer: customer ? { _id: customer._id, fullName: customer.fullName, email: customer.email, phone: customer.phone } : null,
    createdBy: name(o.createdBy),
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
    statusHistory: (o.statusHistory || []).map((h) => ({ status: h.status, changedAt: h.changedAt, note: h.note || null, changedBy: name(h.changedBy) }))
      .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)),
    transactions: txns.map((t) => ({
      _id: t._id, method: t.method, amount: t.amount, status: t.status, txnRef: t.txnRef, paidAt: t.paidAt, createdAt: t.createdAt,
      failureReason: t.failureReason || null,
      gateway: t.gateway ? { provider: t.gateway.provider, transactionNo: t.gateway.transactionNo, responseCode: t.gateway.responseCode, bankCode: t.gateway.bankCode } : null,
      processedBy: name(t.processedBy),
      // Cần quản trị viên rà soát: tiền về sau khi đơn hết hạn, hoặc còn "đang chờ" trên đơn đã đóng (BR-29)
      needsReview: (t.status === 'success' && !!t.failureReason) || (t.status === 'pending' && ['failed', 'completed'].includes(o.status)),
    })),
    issues: (o.issues || []).map((i) => ({
      _id: i._id, description: i.description, status: i.status, resolution: i.resolution || null,
      reportedBy: i.reportedBy ? name(i.reportedBy) : 'Hệ thống', handledBy: name(i.handledBy),
      createdAt: i.createdAt, resolvedAt: i.resolvedAt || null,
    })),
    nextTransition: allowedTransition(o),
    store,
  });
});

const text = (v, label, min, max) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw new ApiError(400, `${label} cần tối thiểu ${min} ký tự`);
  if (s.length > max) throw new ApiError(400, `${label} tối đa ${max} ký tự`);
  return s;
};

// Chuyển trạng thái đơn theo thứ tự confirmed -> preparing -> ready_for_pickup -> completed (không có hủy đơn, BR-24).
// PATCH /api/orders/:id/status  body: { status, note?, cashCollected? }
// Đơn tiền mặt chưa thu: khi chuyển "completed" admin phải xác nhận đã thu tiền; hệ thống ghi giao dịch tiền mặt.
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const target = req.body.status;
  if (!STATUSES.includes(target)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  const note = req.body.note ? text(req.body.note, 'Ghi chú', 1, 300) : undefined;

  const o = await Order.findById(id).lean();
  if (!o) throw new ApiError(404, NOT_FOUND);
  if (NEXT_STATUS[o.status] !== target) {
    throw new ApiError(409, `Không thể chuyển đơn từ "${o.status}" sang "${target}"`, { code: 'INVALID_TRANSITION' });
  }
  const needsCash = target === 'completed' && o.paymentStatus !== 'paid';
  if (needsCash && o.paymentMethod !== 'cash') {
    throw new ApiError(409, 'Đơn chưa thanh toán nên không thể hoàn tất', { code: 'NOT_PAID' });
  }
  if (needsCash && req.body.cashCollected !== true) {
    throw new ApiError(409, 'Đơn tiền mặt: vui lòng xác nhận đã thu đủ tiền của khách trước khi hoàn tất', { code: 'CASH_NOT_COLLECTED' });
  }

  const now = new Date();
  const set = { status: target };
  if (target === 'ready_for_pickup') set.readyAt = now;
  if (target === 'completed') { set.pickedUpAt = now; if (needsCash) { set.paymentStatus = 'paid'; set.paidAt = now; } }
  const entry = { status: target, changedAt: now, changedBy: req.user.id, ...(note ? { note } : {}) };

  const updated = await runAtomic(async ({ session, onRollback }) => {
    const opts = session ? { session } : {};
    // Điều kiện status hiện tại: hai admin bấm cùng lúc thì chỉ một người thành công
    const upd = await Order.findOneAndUpdate({ _id: id, status: o.status }, { $set: set, $push: { statusHistory: entry } }, { new: true, ...opts });
    if (!upd) throw new ApiError(409, 'Trạng thái đơn vừa được thay đổi bởi người khác. Vui lòng tải lại.', { code: 'STALE_STATUS' });
    onRollback(() => {
      // Khôi phục đúng giá trị cũ; trường trước đó chưa có thì gỡ bỏ (không truyền undefined vào $set)
      const back = { status: o.status, paymentStatus: o.paymentStatus };
      const unset = {};
      ['readyAt', 'pickedUpAt', 'paidAt'].forEach((f) => { if (o[f]) back[f] = o[f]; else if (f in set) unset[f] = ''; });
      return Order.updateOne({ _id: id }, { $set: back, ...(Object.keys(unset).length ? { $unset: unset } : {}), $pull: { statusHistory: { status: target, changedAt: now } } });
    });
    if (needsCash) {
      await Transaction.create([{
        orderId: o._id, customerId: o.customerId, processedBy: req.user.id, method: 'cash', amount: o.totalAmount,
        status: 'success', paidAt: now, cash: { received: o.totalAmount, change: 0 },
      }], opts);
    }
    return upd;
  });

  await logActivity(req, { action: 'ORDER_STATUS_CHANGE', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, from: o.status, to: target, note, cashCollected: needsCash || undefined } });
  res.json({ _id: updated._id, status: updated.status, paymentStatus: updated.paymentStatus, readyAt: updated.readyAt, pickedUpAt: updated.pickedUpAt });
});

// UC-34.4 Handle Order Issue: ghi nhận sự cố của đơn
// POST /api/orders/:id/issues  body: { description }
exports.handleOrderIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const description = text(req.body.description, 'Mô tả sự cố', 5, 1000);
  const o = await Order.findOneAndUpdate(
    { _id: id },
    { $push: { issues: { description, status: 'open', reportedBy: req.user.id } } },
    { new: true },
  );
  if (!o) throw new ApiError(404, NOT_FOUND);
  const issue = o.issues[o.issues.length - 1];
  await logActivity(req, { action: 'ORDER_ISSUE_CREATE', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, issueId: issue._id, description } });
  res.status(201).json({ issue: { _id: issue._id, description: issue.description, status: issue.status } });
});

// UC-34.4 Handle Order Issue: xử lý xong, ghi hướng giải quyết
// PATCH /api/orders/:id/issues/:issueId  body: { resolution }
exports.resolveOrderIssue = asyncHandler(async (req, res) => {
  const { id, issueId } = req.params;
  if (!isId(id) || !isId(issueId)) throw new ApiError(404, 'Không tìm thấy sự cố');
  const resolution = text(req.body.resolution, 'Hướng xử lý', 3, 1000);
  const now = new Date();
  // Chỉ chuyển được khi sự cố còn "open": bấm lặp hoặc hai admin cùng xử lý không ghi đè nhau
  const o = await Order.findOneAndUpdate(
    { _id: id, 'issues._id': issueId, 'issues.status': 'open' },
    { $set: { 'issues.$.status': 'resolved', 'issues.$.resolution': resolution, 'issues.$.handledBy': req.user.id, 'issues.$.resolvedAt': now } },
    { new: true },
  );
  if (!o) {
    const exists = await Order.findOne({ _id: id, 'issues._id': issueId }).select('_id').lean();
    if (!exists) throw new ApiError(404, 'Không tìm thấy sự cố');
    throw new ApiError(409, 'Sự cố này đã được xử lý trước đó', { code: 'ALREADY_RESOLVED' });
  }
  await logActivity(req, { action: 'ORDER_ISSUE_RESOLVE', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, issueId, resolution } });
  res.json({ issue: { _id: issueId, status: 'resolved', resolution, resolvedAt: now } });
});
