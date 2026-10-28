const { notImplemented } = require('../utils/notImplemented');
const mongoose = require('mongoose');
const { SupportRequest, User, Order } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { maskEmail } = require('../utils/mask');
const { logActivity } = require('../services/activity.service');

const STATUSES = ['open', 'in_progress', 'resolved'];
const TYPES = ['support', 'complaint'];
// Luồng xử lý khiếu nại: mới -> đang xử lý -> đã giải quyết (đã giải quyết là kết thúc, không mở lại)
const TRANSITIONS = { open: ['in_progress', 'resolved'], in_progress: ['resolved'], resolved: [] };
const NOT_FOUND = 'Không tìm thấy yêu cầu';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => mongoose.isValidObjectId(v);

const userMap = async (ids) => {
  const list = [...new Set(ids.filter(Boolean).map(String))];
  const users = list.length ? await User.find({ _id: { $in: list } }).select('fullName email').lean() : [];
  return new Map(users.map((u) => [String(u._id), u]));
};

// Chi tiết đầy đủ của một yêu cầu (dùng cho GET và kết quả sau khi xử lý)
async function detailOf(r, role) {
  const [users, order] = await Promise.all([
    userMap([r.customerId, r.handledBy, ...r.responses.map((x) => x.responderId)]),
    r.orderId ? Order.findById(r.orderId).select('orderCode status totalAmount createdAt').lean() : null,
  ]);
  const name = (id) => (id && users.get(String(id)) ? users.get(String(id)).fullName : null);
  const c = users.get(String(r.customerId));
  return {
    _id: r._id,
    type: r.type,
    subject: r.subject,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    resolvedAt: r.resolvedAt || null,
    customer: c ? { _id: c._id, fullName: c.fullName, email: role === 'admin' ? c.email : maskEmail(c.email) } : null,
    order: order ? { _id: order._id, orderCode: order.orderCode, status: order.status, totalAmount: order.totalAmount, createdAt: order.createdAt } : null,
    handledBy: name(r.handledBy),
    responses: r.responses.map((x) => ({ _id: x._id, message: x.message, responder: name(x.responderId), createdAt: x.createdAt })),
    allowedStatuses: TRANSITIONS[r.status],
  };
}

// UC-19.3 Handle Customer Complaint: danh sách (catalog tài liệu ghi UC-19.3; code cũ ghi UC-20.3)
// GET /api/support?status=&type=&q=&page=&limit=   (staff, admin)
exports.listSupportRequests = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { status, type } = req.query;
  if (status && !STATUSES.includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  if (type && !TYPES.includes(type)) throw new ApiError(400, 'Loại yêu cầu không hợp lệ');
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

  const base = {};
  if (type) base.type = type;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ role: 'customer', fullName: rx }).select('_id').limit(200).lean();
    base.$or = [{ subject: rx }, { message: rx }];
    if (users.length) base.$or.push({ customerId: { $in: users.map((u) => u._id) } });
  }
  const filter = status ? { ...base, status } : base;

  const [docs, total, grouped] = await Promise.all([
    SupportRequest.find(filter).select('customerId type subject status orderId responses handledBy createdAt updatedAt')
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SupportRequest.countDocuments(filter),
    SupportRequest.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const counts = { open: 0, in_progress: 0, resolved: 0 };
  grouped.forEach((g) => { counts[g._id] = g.n; });
  counts.all = grouped.reduce((s, g) => s + g.n, 0);

  const [users, orders] = await Promise.all([
    userMap(docs.flatMap((r) => [r.customerId, r.handledBy])),
    docs.some((r) => r.orderId) ? Order.find({ _id: { $in: docs.filter((r) => r.orderId).map((r) => r.orderId) } }).select('orderCode').lean() : [],
  ]);
  const oMap = new Map(orders.map((o) => [String(o._id), o.orderCode]));

  res.json({
    items: docs.map((r) => ({
      _id: r._id, type: r.type, subject: r.subject, status: r.status,
      customer: users.get(String(r.customerId)) ? { _id: r.customerId, fullName: users.get(String(r.customerId)).fullName } : null,
      orderCode: r.orderId ? oMap.get(String(r.orderId)) || null : null,
      responseCount: r.responses.length,
      handledBy: r.handledBy && users.get(String(r.handledBy)) ? users.get(String(r.handledBy)).fullName : null,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    })),
    total, page, limit, counts,
  });
});

// UC-19.3: xem một yêu cầu/khiếu nại kèm trạng thái hiện tại và các bước chuyển được phép
// GET /api/support/:id
exports.getSupportRequest = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw new ApiError(404, NOT_FOUND);
  const r = await SupportRequest.findById(req.params.id).lean();
  if (!r) throw new ApiError(404, NOT_FOUND);
  res.json(await detailOf(r, req.user.role));
});

// UC-19.3: phản hồi và/hoặc chuyển trạng thái
// PATCH /api/support/:id/handle   header Idempotency-Key   body: { message?, status? }
// - Trạng thái phải theo luồng (409 INVALID_TRANSITION kèm danh sách được phép); "resolved" bắt buộc có phản hồi cho khách.
// - Gửi lại cùng Idempotency-Key (lỗi mạng) không ghi trùng phản hồi; hai người xử lý cùng lúc thì chỉ một người thành công.
// - Chưa có chính sách thông báo được duyệt nên không gửi thông báo (notification: 'not_required'); trạng thái đã LƯU luôn tách bạch với thông báo.
exports.handleComplaint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) throw new ApiError(404, NOT_FOUND);
  const key = (req.get('Idempotency-Key') || req.body.idempotencyKey || '').toString().trim().slice(0, 100) || null;
  const target = req.body.status;
  if (target !== undefined && !STATUSES.includes(target)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  let message;
  if (req.body.message !== undefined && req.body.message !== null && String(req.body.message).trim() !== '') {
    message = String(req.body.message).trim();
    if (message.length > 2000) throw new ApiError(400, 'Phản hồi tối đa 2000 ký tự');
  }

  const r = await SupportRequest.findById(id).lean();
  if (!r) throw new ApiError(404, NOT_FOUND);

  // Gửi lại do lỗi mạng: phản hồi với khoá này đã được lưu -> trả lại trạng thái hiện tại, không ghi thêm
  if (key && r.responses.some((x) => x.requestKey === key)) {
    return res.json({ ...(await detailOf(r, req.user.role)), replayed: true, notification: 'not_required' });
  }

  const changing = target !== undefined && target !== r.status;
  if (!message && !changing) throw new ApiError(400, 'Cần nhập phản hồi hoặc chọn trạng thái mới');
  if (r.status === 'resolved') throw new ApiError(409, 'Yêu cầu này đã được giải quyết và đóng, không thể xử lý thêm', { code: 'CLOSED', allowed: [] });
  if (changing && !TRANSITIONS[r.status].includes(target)) {
    throw new ApiError(409, `Không thể chuyển từ "${r.status}" sang "${target}"`, { code: 'INVALID_TRANSITION', allowed: TRANSITIONS[r.status] });
  }
  if (target === 'resolved' && !message) throw new ApiError(400, 'Cần nhập phản hồi gửi khách khi đánh dấu đã giải quyết');

  const now = new Date();
  const set = { handledBy: req.user.id };
  if (changing) set.status = target;
  if (target === 'resolved' && changing) set.resolvedAt = now;
  const update = { $set: set };
  if (message) update.$push = { responses: { responderId: req.user.id, message, createdAt: now, ...(key ? { requestKey: key } : {}) } };

  // Điều kiện status hiện tại + chưa có khoá này: không ghi đè khi người khác vừa xử lý, không ghi trùng khi gửi song song
  const cond = { _id: id, status: r.status, ...(key ? { 'responses.requestKey': { $ne: key } } : {}) };
  const updated = await SupportRequest.findOneAndUpdate(cond, update, { new: true });
  if (!updated) {
    const again = await SupportRequest.findById(id).lean();
    if (again && key && again.responses.some((x) => x.requestKey === key)) {
      return res.json({ ...(await detailOf(again, req.user.role)), replayed: true, notification: 'not_required' });
    }
    throw new ApiError(409, 'Yêu cầu vừa được cập nhật bởi người khác. Vui lòng tải lại.', { code: 'STALE_STATUS' });
  }

  await logActivity(req, { action: 'COMPLAINT_HANDLE', targetType: 'SupportRequest', targetId: r._id, detail: { subject: r.subject, from: r.status, to: changing ? target : r.status, responded: !!message } });
  const plain = updated.toObject ? updated.toObject() : updated;
  res.json({ ...(await detailOf(plain, req.user.role)), replayed: false, notification: 'not_required' });
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.submitSupportRequest = notImplemented('UC-12.1 Submit Support Request');
exports.listMySupportRequests = notImplemented('UC-12.2 View Support Request');
