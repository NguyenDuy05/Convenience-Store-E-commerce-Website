const mongoose = require('mongoose');
const { Transaction, Order } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const STATUSES = ['pending', 'success', 'failed'];
const METHODS = ['cash', 'card', 'vnpay', 'momo'];
const MAX_RANGE_DAYS = 366;   // giới hạn khoảng ngày tìm kiếm (UC-23.0.E2)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const POPULATE = [
  { path: 'orderId', select: 'orderCode source status paymentStatus paymentMethod totalAmount createdAt' },
  { path: 'customerId', select: 'fullName email phone' },
  { path: 'processedBy', select: 'fullName email' },
];

// Chỉ trả các trường được phép hiển thị: không trả gateway.raw (select:false) và không lộ dữ liệu thanh toán nhạy cảm
function serialize(t) {
  const o = t.toObject ? t.toObject() : t;
  const g = o.gateway || {};
  return {
    _id: o._id,
    order: o.orderId && o.orderId._id ? o.orderId : null,
    orderId: o.orderId && o.orderId._id ? o.orderId._id : o.orderId,
    customer: o.customerId && o.customerId._id ? o.customerId : null,
    processedBy: o.processedBy && o.processedBy._id ? o.processedBy : null,
    method: o.method,
    amount: o.amount,
    status: o.status,
    txnRef: o.txnRef,
    gateway: { provider: g.provider, transactionNo: g.transactionNo, responseCode: g.responseCode, bankCode: g.bankCode, payDate: g.payDate },
    cash: o.cash,
    paidAt: o.paidAt,
    failureReason: o.failureReason,
    errorHandling: o.errorHandling,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function parseDate(value, name, endOfDay) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Ngày "${name}" không hợp lệ`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) d.setHours(23, 59, 59, 999);
  return d;
}

// UC-35.1 View Transactions (tìm theo mã giao dịch / mã đơn, trạng thái, phương thức, khoảng ngày)
exports.listTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { q, status, method } = req.query;

  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái giao dịch không hợp lệ');
  if (method && !METHODS.includes(method)) throw new ApiError(400, 'Phương thức thanh toán không hợp lệ');
  const from = parseDate(req.query.from, 'từ ngày', false);
  const to = parseDate(req.query.to, 'đến ngày', true);
  if (from && to && from > to) throw new ApiError(400, 'Khoảng ngày không hợp lệ: "từ ngày" phải trước "đến ngày"');
  if (from && to && (to - from) / 86400000 > MAX_RANGE_DAYS) throw new ApiError(400, `Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`);

  const filter = {};
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const keyword = (q || '').trim();
  if (keyword) {
    if (keyword.length > 100) throw new ApiError(400, 'Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)');
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
    items: items.map(serialize),
    total, page, limit,
    summary: { successAmount: agg.reduce((s, t) => s + t.amount, 0), successCount: agg.length },
  });
});

// UC-35.2 View Transaction Details (chỉ đọc, không sửa dữ liệu thanh toán/đơn hàng)
exports.getTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Không tìm thấy giao dịch');
  const txn = await Transaction.findById(req.params.id).populate(POPULATE);
  if (!txn) throw new ApiError(404, 'Không tìm thấy giao dịch');

  const out = serialize(txn);
  // Các giao dịch khác của cùng đơn (lần thử trước / thử lại) để đối soát
  const siblings = await Transaction.find({ orderId: out.orderId, _id: { $ne: txn._id } })
    .select('method amount status txnRef createdAt paidAt').sort({ createdAt: -1 });
  const timeline = [{ label: 'Khởi tạo giao dịch', at: out.createdAt }];
  if (out.paidAt) timeline.push({ label: 'Thanh toán thành công', at: out.paidAt });
  else if (out.status === 'failed') timeline.push({ label: 'Thanh toán thất bại', at: out.updatedAt, note: out.failureReason });
  if (out.errorHandling?.handledAt) timeline.push({ label: 'Đã xử lý lỗi thanh toán', at: out.errorHandling.handledAt, note: out.errorHandling.resolution });
  res.json({ ...out, relatedTransactions: siblings, timeline });
});
