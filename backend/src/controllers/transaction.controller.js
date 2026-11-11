const mongoose = require('mongoose');
const { Transaction, Order } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const STATUSES = ['pending', 'success', 'failed', 'refunded'];
const METHODS = ['cash', 'card', 'vnpay', 'wallet'];
const MAX_RANGE_DAYS = 366;
// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const POPULATE = [
  { path: 'orderId', select: 'orderCode source status paymentStatus paymentMethod totalAmount createdAt' },
  { path: 'customerId', select: 'fullName email phone' },
  { path: 'processedBy', select: 'fullName email' },
];

// Phạm vi giao dịch staff được xem (hiện chỉ có 1 cửa hàng nên xem tất cả)
const scopeFilter = () => ({});

// Che email khi staff xem
const maskEmail = (e) => (e ? e.replace(/^(.{1,2})[^@]*(@.*)$/, '$1***$2') : e);
// Che mã giao dịch cổng, chỉ giữ vài ký tự cuối
const maskTail = (v, keep = 4) => (v && String(v).length > keep ? `${'*'.repeat(String(v).length - keep)}${String(v).slice(-keep)}` : v);
// Che số điện thoại khi staff xem
const maskPhone = (v) => maskTail(v, 3);

// Dữ liệu giao dịch trả về (staff thấy liên hệ đã che, không lộ dữ liệu cổng)
function serialize(t, role = 'admin') {
  const o = t.toObject ? t.toObject() : t;
  const g = o.gateway || {};
  const isStaff = role === 'staff';
  const customer = o.customerId && o.customerId._id ? o.customerId : null;
  const processedBy = o.processedBy && o.processedBy._id ? o.processedBy : null;
  return {
    _id: o._id,
    order: o.orderId && o.orderId._id ? o.orderId : null,
    orderId: o.orderId && o.orderId._id ? o.orderId._id : o.orderId,
    customer: customer && isStaff ? { _id: customer._id, fullName: customer.fullName, email: maskEmail(customer.email), phone: maskPhone(customer.phone) } : customer,
    processedBy: processedBy && isStaff ? { _id: processedBy._id, fullName: processedBy.fullName } : processedBy,
    method: o.method,
    amount: o.amount,
    status: o.status,
    txnRef: o.txnRef,
    gateway: { provider: g.provider, transactionNo: isStaff ? maskTail(g.transactionNo) : g.transactionNo, responseCode: g.responseCode, bankCode: g.bankCode, payDate: g.payDate },
    cash: o.cash,
    paidAt: o.paidAt,
    refund: o.refund?.refundedAt ? o.refund : null,
    failureReason: o.failureReason,
    errorHandling: o.errorHandling,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// Đọc ngày từ query; sai định dạng thì báo lỗi 400
function parseDate(value, name, endOfDay) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Date "${name}" is invalid`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) d.setHours(23, 59, 59, 999);
  return d;
}

const VN_OFFSET = 7 * 3600 * 1000, DAY = 86400000;
// Tổng tiền đã thu trong hôm nay (từ 00:00 giờ VN), không tính giao dịch đã hoàn
async function collectedToday(now = new Date()) {
  const start = new Date(Math.floor((now.getTime() + VN_OFFSET) / DAY) * DAY - VN_OFFSET);
  const rows = await Transaction.find({ status: 'success', $or: [{ paidAt: { $gte: start } }, { paidAt: { $exists: false }, createdAt: { $gte: start } }] }).select('amount').lean();
  return { amount: rows.reduce((s, t) => s + t.amount, 0), count: rows.length, since: start };
}

// UC-35.1 Xem / tìm giao dịch (admin thấy tổng tiền; staff chỉ thấy tiền thu hôm nay)
exports.listTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { q, status, method } = req.query;
  if (q !== undefined && typeof q !== 'string') throw new ApiError(400, "Invalid search query");

  if (status && !STATUSES.includes(status)) throw new ApiError(400, "Invalid transaction status");
  if (method && !METHODS.includes(method)) throw new ApiError(400, "Invalid payment method");
  const from = parseDate(req.query.from, "from date", false);
  const to = parseDate(req.query.to, "to date", true);
  if (from && to && from > to) throw new ApiError(400, "Invalid date range: the start date must be before the end date");
  if (from && to && (to - from) / 86400000 > MAX_RANGE_DAYS) throw new ApiError(400, `Maximum date range: ${MAX_RANGE_DAYS} days`);

  const filter = { ...scopeFilter(req) };
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const keyword = (q || '').trim();
  if (keyword) {
    if (keyword.length > 100) throw new ApiError(400, "Search must not exceed 100 characters");
    const re = new RegExp(escapeRegex(keyword), 'i');
    const orders = await Order.find({ orderCode: re }).select('_id').limit(500);
    const or = [{ txnRef: re }, { 'gateway.transactionNo': re }, { orderId: { $in: orders.map((o) => o._id) } }];
    if (mongoose.isValidObjectId(keyword)) or.push({ _id: keyword }, { orderId: keyword });
    filter.$or = or;
  }

  const [items, total, agg] = await Promise.all([
    Transaction.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter),
    Transaction.find({ ...filter, status: 'success' }).select('amount'),
  ]);
  res.json({
    items: items.map((t) => serialize(t, req.user.role)),
    total, page, limit,
    summary: {
      ...(req.user.role === 'admin' ? { successAmount: agg.reduce((s, t) => s + t.amount, 0) } : {}),
      successCount: agg.length,
      ...(req.user.role === 'staff' ? { today: await collectedToday() } : {}),
    },
  });
});

// UC-35.2 Xem chi tiết một giao dịch
exports.getTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, "Transaction not found");
  const txn = await Transaction.findOne({ _id: req.params.id, ...scopeFilter(req) }).populate(POPULATE);
  if (!txn) throw new ApiError(404, "Transaction not found");

  const out = serialize(txn, req.user.role);
  const siblings = await Transaction.find({ orderId: out.orderId, _id: { $ne: txn._id } })
    .select('method amount status txnRef createdAt paidAt').sort({ createdAt: -1 });
  const timeline = [{ label: "Transaction created", at: out.createdAt }];
  if (out.paidAt) timeline.push({ label: "Payment successful", at: out.paidAt });
  else if (out.status === 'failed') timeline.push({ label: "Payment failed", at: out.updatedAt, note: out.failureReason });
  if (out.errorHandling?.handledAt) timeline.push({ label: "Payment issue resolved", at: out.errorHandling.handledAt, note: out.errorHandling.resolution });
  res.json({ ...out, relatedTransactions: siblings, timeline });
});
