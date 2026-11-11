const mongoose = require('mongoose');
const { User, Order, SupportRequest, MembershipTier } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { maskEmail, maskPhone } = require('../utils/mask');
const { logActivity } = require('../services/activity.service');

const OPEN = ['open', 'in_progress'];
// Escape ký tự đặc biệt để tìm kiếm bằng regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Thông tin liên hệ theo vai trò: admin thấy đầy đủ, staff thấy đã che bớt
const contact = (u, role) => (role === 'admin'
  ? { email: u.email, phone: u.phone || null, masked: false }
  : { email: maskEmail(u.email), phone: maskPhone(u.phone), masked: true });

// Lấy tên hạng thành viên của danh sách khách
const tierNames = async (users) => {
  const ids = [...new Set(users.map((u) => u.membership?.tierId).filter(Boolean).map(String))];
  const tiers = ids.length ? await MembershipTier.find({ _id: { $in: ids } }).select('name').lean() : [];
  return new Map(tiers.map((t) => [String(t._id), t.name]));
};

// UC-19.1 Xem / tìm danh sách khách hàng (staff thấy liên hệ đã che)
exports.listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { status } = req.query;
  if (status && !['active', 'locked'].includes(status)) throw new ApiError(400, "Invalid status");
  const sort = req.query.sort === 'name' ? { fullName: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q && q.length < 2) throw new ApiError(400, "Enter at least 2 characters to search");

  const filter = { role: 'customer', status: status || { $ne: 'deleted' } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
  }
  if (req.query.hasComplaint === '1' || req.query.hasComplaint === 'true') {
    const open = await SupportRequest.find({ status: { $in: OPEN } }).select('customerId').lean();
    filter._id = { $in: [...new Set(open.map((r) => String(r.customerId)))] };
  }

  const [docs, total] = await Promise.all([
    User.find(filter).select('fullName email phone status createdAt membership').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const ids = docs.map((u) => u._id);
  const [orderAgg, complaintAgg, tiers] = ids.length ? await Promise.all([
    Order.aggregate([{ $match: { customerId: { $in: ids } } }, { $group: { _id: '$customerId', n: { $sum: 1 } } }]),
    SupportRequest.aggregate([{ $match: { customerId: { $in: ids }, status: { $in: OPEN } } }, { $group: { _id: '$customerId', n: { $sum: 1 } } }]),
    tierNames(docs),
  ]) : [[], [], new Map()];
  const orders = new Map(orderAgg.map((g) => [String(g._id), g.n]));
  const complaints = new Map(complaintAgg.map((g) => [String(g._id), g.n]));

  res.json({
    items: docs.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      ...contact(u, req.user.role),
      status: u.status,
      tier: tiers.get(String(u.membership?.tierId)) || null,
      joinedAt: u.createdAt,
      orderCount: orders.get(String(u._id)) || 0,
      openComplaints: complaints.get(String(u._id)) || 0,
    })),
    total, page, limit,
  });
});

// UC-19.2 Xem chi tiết khách: thông tin, hạng, tóm tắt đơn hàng và khiếu nại
exports.getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Customer not found");
  const u = await User.findOne({ _id: id, role: 'customer', status: { $ne: 'deleted' } }).select('fullName email phone status createdAt membership').lean();
  if (!u) throw new ApiError(404, "Customer not found");

  const [byStatus, recentOrders, complaints, tiers] = await Promise.all([
    Order.aggregate([{ $match: { customerId: u._id } }, { $group: { _id: '$status', n: { $sum: 1 }, spent: { $sum: '$totalAmount' } } }]),
    Order.find({ customerId: u._id }).select('orderCode status totalAmount paymentMethod createdAt').sort({ createdAt: -1 }).limit(5).lean(),
    SupportRequest.find({ customerId: u._id }).select('subject type status createdAt').sort({ createdAt: -1 }).limit(10).lean(),
    tierNames([u]),
  ]);
  const completed = byStatus.find((g) => g._id === 'completed');
  await logActivity(req, { action: 'CUSTOMER_VIEW', targetType: 'User', targetId: u._id, detail: { fullName: u.fullName } });

  res.json({
    _id: u._id,
    fullName: u.fullName,
    ...contact(u, req.user.role),
    status: u.status,
    joinedAt: u.createdAt,
    membership: { tier: tiers.get(String(u.membership?.tierId)) || null, points: u.membership?.points || 0 },
    stats: {
      orderCount: byStatus.reduce((s, g) => s + g.n, 0),
      completedCount: completed ? completed.n : 0,
      totalSpent: completed ? completed.spent : 0,
      lastOrderAt: recentOrders[0]?.createdAt || null,
    },
    recentOrders: recentOrders.map((o) => ({ _id: o._id, orderCode: o.orderCode, status: o.status, totalAmount: o.totalAmount, paymentMethod: o.paymentMethod, createdAt: o.createdAt })),
    complaints: {
      openCount: complaints.filter((c) => OPEN.includes(c.status)).length,
      recent: complaints.map((c) => ({ _id: c._id, subject: c.subject, type: c.type, status: c.status, createdAt: c.createdAt })),
    },
  });
});

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const IN_PROGRESS = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];

// Lấy khách hàng chưa bị xóa theo id (404 nếu không có)
async function loadCustomerOr404(id, { allowLocked = true } = {}) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Customer not found');
  const u = await User.findOne({ _id: id, role: 'customer', status: { $ne: 'deleted' } });
  if (!u) throw new ApiError(404, 'Customer not found');
  if (!allowLocked && u.status === 'locked') throw new ApiError(409, 'Customer account is locked');
  return u;
}

// Dữ liệu khách trả về cho admin sau khi sửa / mở khóa
const adminView = (u) => ({
  _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone || null, status: u.status,
  lockedUntil: u.lockedUntil || null, joinedAt: u.createdAt,
});

// UC-29.4 Admin sửa họ tên, số điện thoại của khách
exports.updateCustomer = asyncHandler(async (req, res) => {
  const u = await loadCustomerOr404(req.params.id);
  const { fullName, phone } = req.body || {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  if (!name) throw new ApiError(400, 'Full name is required');
  if (name.length > 100) throw new ApiError(400, 'Full name must be 100 characters or fewer');
  const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[\s.-]/g, '') : '';
  if (cleanPhone && !PHONE_RE.test(cleanPhone)) throw new ApiError(400, 'Phone number is invalid');
  u.fullName = name;
  u.phone = cleanPhone || undefined;
  await u.save();
  await logActivity(req, { action: 'CUSTOMER_UPDATE', targetType: 'User', targetId: u._id, detail: { fullName: name } });
  res.json(adminView(u));
});

// UC-29.5 Admin mở khóa tài khoản khách
exports.unlockCustomer = asyncHandler(async (req, res) => {
  const u = await loadCustomerOr404(req.params.id);
  const tempLocked = u.lockedUntil && u.lockedUntil > new Date();
  if (u.status !== 'locked' && !tempLocked) throw new ApiError(409, 'This account is not locked');
  u.status = 'active';
  u.lockedUntil = undefined;
  u.failedLoginCount = 0;
  await u.save();
  await logActivity(req, { action: 'CUSTOMER_UNLOCK', targetType: 'User', targetId: u._id });
  res.json(adminView(u));
});

// UC-29.6 Admin xóa mềm tài khoản khách (không xóa khi còn đơn đang xử lý)
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const u = await loadCustomerOr404(req.params.id);
  const open = await Order.countDocuments({ customerId: u._id, status: { $in: IN_PROGRESS } });
  if (open > 0) throw new ApiError(409, `This customer still has ${open} order(s) in progress. Finish them before deleting the account.`);
  u.status = 'deleted';
  await u.save();
  await logActivity(req, { action: 'CUSTOMER_DELETE', targetType: 'User', targetId: u._id, detail: { fullName: u.fullName } });
  res.json({ message: 'Customer account deleted' });
});

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { memberCode, memberIdFromCode } = require('../utils/memberCode');
const { sendSetPasswordInvite } = require('../services/memberInvite.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Chuẩn hóa số điện thoại: bỏ khoảng trắng/dấu, +84 → 0
const normPhone = (v) => {
  const d = String(v || '').trim().replace(/[\s.-]/g, '');
  if (!d) return '';
  return d.replace(/^\+?84/, '0');
};
// Các cách viết của cùng một số điện thoại (0…, +84…, 84…) để tìm kiếm
const phoneVariants = (p) => [p, p.replace(/^0/, '+84'), p.replace(/^0/, '84')];

// Thông tin thành viên tối thiểu staff cần ở quầy (mã, hạng, điểm, liên hệ đã che)
const memberCard = async (u, role) => {
  const tiers = await tierNames([u]);
  return {
    _id: u._id, fullName: u.fullName, memberCode: memberCode(u._id),
    ...contact(u, role),
    hasEmail: !!u.email,
    points: u.membership?.points || 0,
    tier: tiers.get(String(u.membership?.tierId)) || null,
  };
};

// Đăng ký thành viên tại quầy: họ tên + email (bắt buộc), SĐT tùy chọn; gửi email mời đặt mật khẩu
exports.registerMember = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
  const phone = normPhone(body.phone);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (fullName.length < 2 || fullName.length > 100) throw new ApiError(400, "Enter the customer's full name (2–100 characters)");
  if (!email) throw new ApiError(400, "Enter the customer's email address (required so they can sign in and receive their password link)");
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Phone number is invalid (e.g. 0901234567)');
  if (email && (!EMAIL_RE.test(email) || email.length > 254)) throw new ApiError(400, 'Email address is invalid');

  const or = [...(email ? [{ email }] : []), ...(phone ? [{ phone: { $in: phoneVariants(phone) } }] : [])];
  const existing = await User.findOne({ $or: or, status: { $ne: 'deleted' } }).lean();
  if (existing) {
    if (existing.role !== 'customer') throw new ApiError(409, 'This phone number or email belongs to a staff account');
    const field = email && existing.email === email ? 'email' : 'phone number';
    throw new ApiError(409, `A member with this ${field} already exists`, { code: 'MEMBER_EXISTS', member: await memberCard(existing, req.user.role) });
  }

  const tier = await MembershipTier.findOne().sort({ minPoints: 1 }).lean();
  let user;
  try {
    user = await User.create({
      role: 'customer', fullName, ...(email ? { email } : {}), ...(phone ? { phone } : {}),
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      signupChannel: 'counter', registeredBy: req.user.id,
      membership: tier ? { tierId: tier._id } : undefined,
    });
  } catch (e) {
    if (e.code === 11000) throw new ApiError(409, 'This email is already in use', { code: 'MEMBER_EXISTS' });
    throw e;
  }
  const code = memberCode(user._id);
  const invited = email ? await sendSetPasswordInvite(user, code) : false;
  await logActivity(req, { action: 'CUSTOMER_REGISTER_COUNTER', targetType: 'User', targetId: user._id, detail: { fullName, hasPhone: !!phone, hasEmail: !!email } });
  res.status(201).json({ member: await memberCard(user.toObject(), req.user.role), invited });
});

// Tìm thành viên ở quầy theo SĐT, email hoặc mã thành viên
exports.findMember = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 3 || q.length > 254) throw new ApiError(400, 'Enter a phone number, email or member code');
  let filter;
  const id = memberIdFromCode(q);
  if (id) filter = { _id: id };
  else if (q.includes('@')) filter = { email: q.toLowerCase() };
  else {
    const phone = normPhone(q);
    if (!PHONE_RE.test(phone)) throw new ApiError(400, 'Enter a full phone number, an email or a member code');
    filter = { phone: { $in: phoneVariants(phone) } };
  }
  const u = await User.findOne({ ...filter, role: 'customer', status: 'active' }).lean();
  if (!u) throw new ApiError(404, 'No active member found', { code: 'MEMBER_NOT_FOUND' });
  res.json({ member: await memberCard(u, req.user.role) });
});
