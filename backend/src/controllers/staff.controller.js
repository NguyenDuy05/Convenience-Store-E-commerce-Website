const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ActivityLog, Order, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/activity.service');

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Dữ liệu nhân viên trả về cho admin
const view = (u) => ({
  _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone || null, status: u.status,
  employeeCode: u.staffInfo?.employeeCode || null, position: u.staffInfo?.position || null, hiredAt: u.staffInfo?.hiredAt || null,
  lastLoginAt: u.lastLoginAt || null, createdAt: u.createdAt,
});

// Lấy nhân viên chưa bị xóa theo id (404 nếu không có)
async function loadStaff(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Staff not found');
  const u = await User.findOne({ _id: id, role: 'staff', status: { $ne: 'deleted' } });
  if (!u) throw new ApiError(404, 'Staff not found');
  return u;
}

// Kiểm tra ngày vào làm (không ở tương lai)
function parseHiredAt(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Hire date is invalid');
  if (d > new Date()) throw new ApiError(400, 'Hire date cannot be in the future');
  return d;
}

// Kiểm tra các trường chung khi thêm / sửa nhân viên
function parseCommon(body = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const fullName = str(body.fullName);
  if (!fullName) throw new ApiError(400, 'Full name is required');
  if (fullName.length > 100) throw new ApiError(400, 'Full name must be 100 characters or fewer');
  const phone = str(body.phone).replace(/[\s.-]/g, '');
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Phone number is invalid');
  const position = str(body.position);
  if (position.length > 80) throw new ApiError(400, 'Position must be 80 characters or fewer');
  return { fullName, phone: phone || undefined, position: position || undefined, hiredAt: parseHiredAt(body.hiredAt) };
}

// Sinh mã nhân viên tiếp theo (ST001, ST002…)
async function nextEmployeeCode() {
  const last = await User.find({ role: 'staff', 'staffInfo.employeeCode': /^ST\d+$/ }).select('staffInfo.employeeCode').lean();
  const max = last.reduce((m, u) => Math.max(m, parseInt(u.staffInfo.employeeCode.slice(2), 10) || 0), 0);
  return `ST${String(max + 1).padStart(4, '0')}`;
}

// UC-30.1 Admin xem / tìm nhân viên
exports.listStaff = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { status } = req.query;
  if (status && !['active', 'locked'].includes(status)) throw new ApiError(400, 'Invalid status');
  const filter = { role: 'staff', status: status || { $ne: 'deleted' } };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }, { 'staffInfo.employeeCode': rx }];
  }
  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items: docs.map(view), total, page, limit });
});

// UC-30.2 Thêm nhân viên
exports.addStaff = asyncHandler(async (req, res) => {
  const data = parseCommon(req.body);
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (password.length > 72) throw new ApiError(400, 'Password must be 72 characters or fewer');
  if (await User.exists({ email })) throw new ApiError(409, 'This email is already in use');

  let employeeCode = typeof req.body?.employeeCode === 'string' ? req.body.employeeCode.trim().toUpperCase() : '';
  if (employeeCode) {
    if (!/^[A-Z0-9-]{2,20}$/.test(employeeCode)) throw new ApiError(400, 'Employee code may only contain letters, digits and dashes (2-20 characters)');
    if (await User.exists({ role: 'staff', 'staffInfo.employeeCode': employeeCode })) throw new ApiError(409, 'This employee code is already in use');
  } else employeeCode = await nextEmployeeCode();

  const u = await User.create({
    role: 'staff', fullName: data.fullName, email, phone: data.phone, passwordHash: await bcrypt.hash(password, 10),
    staffInfo: { employeeCode, position: data.position, hiredAt: data.hiredAt || new Date() },
  });
  await logActivity(req, { action: 'STAFF_ADD', targetType: 'User', targetId: u._id, detail: { email, employeeCode } });
  res.status(201).json(view(u));
});

// UC-30.3 Sửa thông tin nhân viên (không đổi email, mật khẩu)
exports.updateStaff = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  const data = parseCommon(req.body);
  u.fullName = data.fullName;
  u.phone = data.phone;
  u.staffInfo = { ...(u.staffInfo?.toObject?.() || {}), position: data.position, hiredAt: data.hiredAt || u.staffInfo?.hiredAt };
  await u.save();
  await logActivity(req, { action: 'STAFF_UPDATE', targetType: 'User', targetId: u._id });
  res.json(view(u));
});

// UC-30.4 Khóa tài khoản nhân viên
exports.lockStaff = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  if (u.status === 'locked') throw new ApiError(409, 'This account is already locked');
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
  u.status = 'locked';
  await u.save();
  await logActivity(req, { action: 'STAFF_LOCK', targetType: 'User', targetId: u._id, detail: { reason } });
  res.json(view(u));
});

// UC-30.5 Mở khóa tài khoản nhân viên
exports.unlockStaff = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  if (u.status !== 'locked') throw new ApiError(409, 'This account is not locked');
  u.status = 'active';
  u.lockedUntil = undefined;
  u.failedLoginCount = 0;
  await u.save();
  await logActivity(req, { action: 'STAFF_UNLOCK', targetType: 'User', targetId: u._id });
  res.json(view(u));
});

// UC-30.6 Xem nhật ký thao tác của nhân viên
exports.getStaffActivity = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = { actorId: u._id };
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ staff: { _id: u._id, fullName: u.fullName }, items, total, page, limit });
});

// Tên việc nhân viên đã làm với đơn, theo trạng thái mới của đơn
const STEP_LABEL = {
  confirmed: 'Confirmed the order', preparing: 'Started preparing', ready_for_pickup: 'Marked ready for pickup',
  completed: 'Handed over to the customer', cancelled: 'Cancelled the order', failed: 'Marked as failed', pending_payment: 'Created the order',
};
const METHOD_LABEL = { cash: 'cash', card: 'card', vnpay: 'VNPay QR', wallet: 'wallet' };

// Khoảng ngày từ query (from / to dạng YYYY-MM-DD, to tính hết ngày)
function rangeOf(q) {
  const at = (v, end) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid date');
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(v)) d.setHours(23, 59, 59, 999);
    return d;
  };
  const from = at(q.from), to = at(q.to, true);
  if (from && to && from > to) throw new ApiError(400, 'The start date must be before the end date');
  return from || to ? { ...(from && { $gte: from }), ...(to && { $lte: to }) } : null;
}

// Các việc một nhân viên đã làm với một đơn (đổi trạng thái, tạo bill tại quầy, thu tiền)
function stepsOf(order, staffId, txns) {
  const me = String(staffId);
  const steps = (order.statusHistory || []).filter((h) => String(h.changedBy) === me)
    .map((h) => ({ action: h.status, label: STEP_LABEL[h.status] || h.status, at: h.changedAt, note: h.note || null }));
  if (String(order.createdBy) === me && order.source === 'store' && !steps.some((x) => x.action === 'pending_payment')) steps.push({ action: 'counter_sale', label: 'Created the counter sale', at: order.createdAt });
  txns.filter((t) => String(t.orderId) === String(order._id))
    .forEach((t) => steps.push({ action: 'payment', label: `Collected ${METHOD_LABEL[t.method] || t.method} payment`, at: t.paidAt || t.createdAt, amount: t.amount }));
  // Tạo bill tại quầy luôn là bước đầu tiên
  return steps.sort((a, b) => (b.action === 'counter_sale') - (a.action === 'counter_sale') || new Date(a.at) - new Date(b.at));
}

// Admin xem chi tiết một nhân viên: thông tin + số liệu xử lý đơn (lọc theo khoảng ngày)
exports.getStaff = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  const range = rangeOf(req.query);
  const id = u._id;
  const txns = await Transaction.find({ processedBy: id, status: { $in: ['success', 'refunded'] }, ...(range && { createdAt: range }) }).select('orderId amount method status').lean();
  const step = (status) => Order.countDocuments({ statusHistory: { $elemMatch: { changedBy: id, status, ...(range && { changedAt: range }) } } });
  const [handled, prepared, handedOver, cancelled, counterSales] = await Promise.all([
    Order.countDocuments(handledFilter(id, range, txns)),
    step('preparing'), step('completed'), step('cancelled'),
    Order.countDocuments({ createdBy: id, source: 'store', status: 'completed', ...(range && { createdAt: range }) }),
  ]);
  res.json({
    staff: view(u),
    stats: { handled, prepared, handedOver, cancelled, counterSales, collected: txns.filter((t) => t.status === 'success').reduce((n, t) => n + t.amount, 0) },
  });
});

// Điều kiện tìm các đơn có nhân viên tham gia xử lý
function handledFilter(id, range, txns) {
  return { $or: [
    { statusHistory: { $elemMatch: { changedBy: id, ...(range && { changedAt: range }) } } },
    { createdBy: id, ...(range && { createdAt: range }) },
    { _id: { $in: [...new Set(txns.map((t) => String(t.orderId)))] } },
  ] };
}

// Admin xem danh sách đơn một nhân viên đã xử lý, kèm từng việc đã làm
exports.getStaffOrders = asyncHandler(async (req, res) => {
  const u = await loadStaff(req.params.id);
  const range = rangeOf(req.query);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const txns = await Transaction.find({ processedBy: u._id, ...(range && { createdAt: range }) }).select('orderId amount method paidAt createdAt').lean();
  const filter = handledFilter(u._id, range, txns);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('customerId', 'fullName').select('orderCode source status totalAmount customerId createdBy createdAt updatedAt statusHistory')
      .sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({
    items: orders.map((o) => {
      const steps = stepsOf(o, u._id, txns);
      return { _id: o._id, orderCode: o.orderCode, source: o.source, status: o.status, totalAmount: o.totalAmount,
        customer: o.customerId ? o.customerId.fullName : null, steps, lastAt: steps.length ? steps[steps.length - 1].at : o.updatedAt };
    }),
    total, page, limit,
  });
});
