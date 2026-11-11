const mongoose = require('mongoose');
const { Order, User, Transaction, Store, DiscountCode } = require('../models');
const stockService = require('../services/stock.service');
const { awardPointsForOrder } = require('../services/points.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { runAtomic } = require('../utils/atomic');
const { toItem } = require('../utils/orderDto');
const { logActivity } = require('../services/activity.service');
const { pickupSchedule } = require('../services/pickupSchedule.service');
const { notifyOrder } = require('../services/notification.service');

const STATUSES = Order.schema.path('status').enumValues;
const SOURCES = ['online', 'store'];
const PAY_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'];
const PAY_METHODS = ['cash', 'card', 'vnpay', 'wallet'];
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  total_desc: { totalAmount: -1, _id: -1 },
  total_asc: { totalAmount: 1, _id: -1 },
};
const NEXT_STATUS = { confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'completed' };
const NOT_FOUND = "Order not found";

// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Kiểm tra chuỗi có phải ObjectId hợp lệ
const isId = (v) => mongoose.isValidObjectId(v);

// Đọc ngày từ query; sai định dạng thì báo lỗi 400
const parseDate = (value, label) => {
  if (value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} is invalid`);
  return d;
};

// Lấy giá trị query nếu nằm trong danh sách cho phép
const pick = (value, allowed, label) => {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value)) throw new ApiError(400, `${label} is invalid`);
  return value;
};

// Đếm số sự cố chưa xử lý của đơn
const openIssues = (o) => (o.issues || []).filter((i) => i.status === 'open').length;

// UC-34.1/34.2 Admin xem và tìm kiếm đơn (lọc theo trạng thái, nguồn, thanh toán, ngày, có sự cố)
exports.listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const status = pick(req.query.status, STATUSES, "Status");
  const source = pick(req.query.source, SOURCES, "Order source");
  const paymentStatus = pick(req.query.paymentStatus, PAY_STATUSES, "Payment status");
  const paymentMethod = pick(req.query.paymentMethod, PAY_METHODS, "Payment method");
  const sortKey = pick(req.query.sort, Object.keys(SORTS), "Sort order") || 'newest';
  const from = parseDate(req.query.from, "Start date");
  const to = parseDate(req.query.to, "End date");
  if (from && to && from > to) throw new ApiError(400, "Start date must be before end date");

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

// Bước chuyển trạng thái tiếp theo của đơn (và có cần xác nhận đã thu tiền mặt không)
const allowedTransition = (o) => {
  const next = NEXT_STATUS[o.status];
  if (!next) return null;
  return { to: next, needsCashConfirm: next === 'completed' && o.paymentStatus !== 'paid' && o.paymentMethod === 'cash' };
};

// UC-34.3 Admin xem chi tiết đơn: khách, sản phẩm, giao dịch, lịch sử trạng thái, sự cố
exports.getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const [o, txns, store] = await Promise.all([
    Order.findById(id).populate({ path: 'items.productId', select: 'images unit' }).lean(),
    Transaction.find({ orderId: id }).sort({ createdAt: 1 }).lean(),
    Store.findOne().select('name address phone openingHours status').lean(),
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
    walletAmount: o.walletAmount || 0, payableAmount: o.payableAmount ?? o.totalAmount,
    pointsEarned: o.pointsEarned || 0,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paidAt: o.paidAt,
    cancelledAt: o.cancelledAt || null,
    cancelReason: o.cancelReason || null,
    refund: o.refund?.refundedAt ? { amount: o.refund.amount, method: o.refund.method, reason: o.refund.reason, refundedAt: o.refund.refundedAt } : null,
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
      needsReview: (t.status === 'success' && !!t.failureReason) || (t.status === 'pending' && ['failed', 'completed'].includes(o.status)),
    })),
    issues: (o.issues || []).map((i) => ({
      _id: i._id, description: i.description, status: i.status, resolution: i.resolution || null,
      reportedBy: i.reportedBy ? name(i.reportedBy) : "System", handledBy: name(i.handledBy),
      createdAt: i.createdAt, resolvedAt: i.resolvedAt || null,
    })),
    pickupSchedule: pickupSchedule(store), preparationStartsAt: o.preparationStartsAt || null,
    nextTransition: allowedTransition(o),
    store,
  });
});

// Kiểm tra chuỗi bắt buộc có độ dài trong giới hạn
const text = (v, label, min, max) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min) throw new ApiError(400, `${label} must contain at least ${min} characters`);
  if (s.length > max) throw new ApiError(400, `${label} at most ${max} characters`);
  return s;
};

// Chuyển đơn sang bước kế tiếp (confirmed → preparing → ready_for_pickup → completed); đơn tiền mặt phải xác nhận đã thu; hoàn tất thì cộng điểm
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const target = req.body.status;
  if (!STATUSES.includes(target)) throw new ApiError(400, "Invalid status");
  const note = req.body.note ? text(req.body.note, "Note", 1, 300) : undefined;

  const o = await Order.findById(id).lean();
  if (!o) throw new ApiError(404, NOT_FOUND);
  if (req.user.role === 'staff' && o.source !== 'online') throw new ApiError(403, 'Use POS checkout to complete an in-store sale');
  if (NEXT_STATUS[o.status] !== target) {
    throw new ApiError(409, `Cannot change order status from "${o.status}" sang "${target}"`, { code: 'INVALID_TRANSITION' });
  }
  if (target === 'preparing' && o.source === 'online') {
    const schedule = pickupSchedule(await Store.findOne().lean());
    if (!schedule.isOpen) throw new ApiError(409, schedule.notice, { code: 'STORE_NOT_OPEN', pickupSchedule: schedule });
  }
  const needsCash = target === 'completed' && o.paymentStatus !== 'paid';
  if (needsCash && o.paymentMethod !== 'cash') {
    throw new ApiError(409, "An unpaid order cannot be completed", { code: 'NOT_PAID' });
  }
  if (needsCash && req.body.cashCollected !== true) {
    throw new ApiError(409, "Confirm that the full cash amount has been collected before completing this order", { code: 'CASH_NOT_COLLECTED' });
  }
  const cashReceived = req.body.received === undefined ? o.totalAmount : Number(req.body.received);
  if (needsCash && (!Number.isSafeInteger(cashReceived) || cashReceived < o.totalAmount || cashReceived > 1e9)) throw new ApiError(400, 'Cash received must cover the order total');

  const now = new Date();
  const set = { status: target };
  if (target === 'ready_for_pickup') set.readyAt = now;
  if (target === 'completed') { set.pickedUpAt = now; if (needsCash) { set.paymentStatus = 'paid'; set.paidAt = now; } }
  const entry = { status: target, changedAt: now, changedBy: req.user.id, ...(note ? { note } : {}) };

  const updated = await runAtomic(async ({ session, onRollback }) => {
    const opts = session ? { session } : {};
    const upd = await Order.findOneAndUpdate({ _id: id, status: o.status }, { $set: set, $push: { statusHistory: entry } }, { new: true, ...opts });
    if (!upd) throw new ApiError(409, "The order status changed. Please refresh and try again.", { code: 'STALE_STATUS' });
    onRollback(() => {
      const back = { status: o.status, paymentStatus: o.paymentStatus };
      const unset = {};
      ['readyAt', 'pickedUpAt', 'paidAt'].forEach((f) => { if (o[f]) back[f] = o[f]; else if (f in set) unset[f] = ''; });
      return Order.updateOne({ _id: id }, { $set: back, ...(Object.keys(unset).length ? { $unset: unset } : {}), $pull: { statusHistory: { status: target, changedAt: now } } });
    });
    if (needsCash) {
      await Transaction.create([{
        orderId: o._id, customerId: o.customerId, processedBy: req.user.id, method: 'cash', amount: o.totalAmount,
        status: 'success', paidAt: now, cash: { received: cashReceived, change: cashReceived - o.totalAmount },
      }], opts);
    }
    return upd;
  });

  void notifyOrder(updated, 'status_updated');
  if (target === 'completed') await awardPointsForOrder(o._id);
  await logActivity(req, { action: 'ORDER_STATUS_CHANGE', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, from: o.status, to: target, note, cashCollected: needsCash || undefined } });
  res.json({ _id: updated._id, status: updated.status, paymentStatus: updated.paymentStatus, readyAt: updated.readyAt, pickedUpAt: updated.pickedUpAt });
});

// UC-34.4 Ghi nhận sự cố của đơn
exports.handleOrderIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const description = text(req.body.description, "Issue description", 5, 1000);
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

// UC-34.4 Đóng sự cố, ghi hướng xử lý
exports.resolveOrderIssue = asyncHandler(async (req, res) => {
  const { id, issueId } = req.params;
  if (!isId(id) || !isId(issueId)) throw new ApiError(404, "Issue not found");
  const resolution = text(req.body.resolution, "Resolution", 3, 1000);
  const now = new Date();
  const o = await Order.findOneAndUpdate(
    { _id: id, 'issues._id': issueId, 'issues.status': 'open' },
    { $set: { 'issues.$.status': 'resolved', 'issues.$.resolution': resolution, 'issues.$.handledBy': req.user.id, 'issues.$.resolvedAt': now } },
    { new: true },
  );
  if (!o) {
    const exists = await Order.findOne({ _id: id, 'issues._id': issueId }).select('_id').lean();
    if (!exists) throw new ApiError(404, "Issue not found");
    throw new ApiError(409, "This issue has already been resolved", { code: 'ALREADY_RESOLVED' });
  }
  await logActivity(req, { action: 'ORDER_ISSUE_RESOLVE', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, issueId, resolution } });
  res.json({ issue: { _id: issueId, status: 'resolved', resolution, resolvedAt: now } });
});

// Hủy đơn (khách/staff/admin): kiểm tra quyền và trạng thái, trả kho, trả mã giảm giá, hoàn tiền vào ví
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const reason = text(req.body?.reason, "Cancellation reason", 3, 500);
  const o = await Order.findOne({ _id: id, ...(req.user.role === 'customer' ? { customerId: req.user.id, source: 'online' } : {}) });
  if (!o) throw new ApiError(404, NOT_FOUND);
  const allowed = req.user.role === 'customer' ? ['pending_payment', 'confirmed'] : ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
  if (!allowed.includes(o.status) || !o.checkoutReady) throw new ApiError(409, req.user.role === 'customer' ? 'You can cancel only before staff starts preparing your order.' : 'Only active, incomplete orders can be cancelled', { code: 'NOT_CANCELLABLE' });
  if (!o.customerId && o.paymentStatus === 'paid') throw new ApiError(409, 'This counter sale has no customer wallet. Handle it through the counter return process.');
  const now = new Date();
  const wasPaid = o.paymentStatus === 'paid';
  const upd = await Order.findOneAndUpdate({ _id: id, status: o.status }, {
    $set: { status: 'cancelled', cancelledAt: now, cancelReason: reason, walletPolicy: true },
    $push: { statusHistory: { status: 'cancelled', changedAt: now, changedBy: req.user.id, note: reason } },
  }, { new: true });
  if (!upd) throw new ApiError(409, 'The order status changed. Please refresh and try again.', { code: 'STALE_STATUS' });
  await Transaction.updateMany({ orderId: o._id, status: 'pending' }, { $set: { status: 'failed', failureReason: 'Order cancelled' } });
  try { await stockService.releaseStock(o._id, { reason: 'Stock returned: cancelled order ' + o.orderCode }); }
  catch (e) { console.error('Stock return failed for cancelled order:', String(o._id), e); }
  await require('../services/discountReservation.service').release(o);
  await require('../services/wallet.service').settleClosedOrder(o._id);
  const settled = await Order.findById(id).lean();
  void notifyOrder(settled, 'status_updated');

  await logActivity(req, { action: 'ORDER_CANCEL', targetType: 'Order', targetId: o._id, detail: { orderCode: o.orderCode, reason, refunded: wasPaid ? o.totalAmount : 0 } });
  res.json({ _id: upd._id, status: upd.status, paymentStatus: settled.paymentStatus, refund: settled.refund?.refundedAt ? settled.refund : null });
});

// Admin xem lịch sử hoàn tiền (lọc theo mã đơn, khoảng ngày)
exports.listRefunds = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = { 'refund.refundedAt': { $exists: true } };
  const from = parseDate(req.query.from, "From date");
  const to = parseDate(req.query.to, "To date");
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) to.setHours(23, 59, 59, 999);
  if (from || to) filter['refund.refundedAt'] = { $exists: true, ...(from && { $gte: from }), ...(to && { $lte: to }) };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) filter.orderCode = new RegExp(escapeRegex(q), 'i');

  const [docs, total, agg] = await Promise.all([
    Order.find(filter).populate('customerId', 'fullName email').populate('refund.refundedBy', 'fullName')
      .select('orderCode source customerId totalAmount paymentMethod refund cancelledAt').sort({ 'refund.refundedAt': -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$refund.amount' } } }]),
  ]);
  res.json({
    items: docs.map((o) => ({
      _id: o._id, orderCode: o.orderCode, source: o.source,
      customer: o.customerId ? { _id: o.customerId._id, fullName: o.customerId.fullName, email: o.customerId.email } : null,
      amount: o.refund.amount, method: o.refund.method, reason: o.refund.reason, refundedAt: o.refund.refundedAt,
      refundedBy: o.refund.refundedBy ? o.refund.refundedBy.fullName : null,
    })),
    total, page, limit, summary: { totalAmount: agg[0]?.amount || 0 },
  });
});
