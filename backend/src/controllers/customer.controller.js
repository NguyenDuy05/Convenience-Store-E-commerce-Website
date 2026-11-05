const { notImplemented } = require('../utils/notImplemented');
const mongoose = require('mongoose');
const { User, Order, SupportRequest, MembershipTier } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { maskEmail, maskPhone } = require('../utils/mask');
const { logActivity } = require('../services/activity.service');

const OPEN = ['open', 'in_progress'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Nhân viên chỉ thấy thông tin liên hệ đã che bớt (UC-19: "chỉ các trường tối thiểu, che dữ liệu nhạy cảm không cần cho công việc").
// Admin (cùng endpoint, dùng cho UC-28) thấy đầy đủ email/số điện thoại. Địa chỉ, mật khẩu, thông tin đăng nhập không bao giờ trả ra.
const contact = (u, role) => (role === 'admin'
  ? { email: u.email, phone: u.phone || null, masked: false }
  : { email: maskEmail(u.email), phone: maskPhone(u.phone), masked: true });

const tierNames = async (users) => {
  const ids = [...new Set(users.map((u) => u.membership?.tierId).filter(Boolean).map(String))];
  const tiers = ids.length ? await MembershipTier.find({ _id: { $in: ids } }).select('name').lean() : [];
  return new Map(tiers.map((t) => [String(t._id), t.name]));
};

// UC-19.1 View Customers (staff). Catalog tài liệu ghi UC-19.x; code cũ ghi UC-20.x.
// GET /api/customers?q=&status=active|locked&hasComplaint=1&sort=newest|name&page=&limit=
// Chỉ xem, không sửa dữ liệu khách (POST-3). Tài khoản đã xóa không hiện.
exports.listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { status } = req.query;
  if (status && !['active', 'locked'].includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  const sort = req.query.sort === 'name' ? { fullName: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q && q.length < 2) throw new ApiError(400, 'Từ khóa tìm kiếm cần tối thiểu 2 ký tự');

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

// UC-19.2 View Customer Details (staff)
// GET /api/customers/:id  Thông tin tối thiểu + tóm tắt đơn hàng và khiếu nại để hỗ trợ khách. Có ghi nhật ký truy cập.
// Khách không tồn tại, đã xóa hoặc không phải khách hàng đều trả 404 giống nhau (không lộ bản ghi - E4).
exports.getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Không tìm thấy khách hàng');
  const u = await User.findOne({ _id: id, role: 'customer', status: { $ne: 'deleted' } }).select('fullName email phone status createdAt membership').lean();
  if (!u) throw new ApiError(404, 'Không tìm thấy khách hàng');

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

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.updateCustomer = notImplemented('UC-29.4 Update Customer');
exports.unlockCustomer = notImplemented('UC-29.5 Unlock Customer Account');
exports.deleteCustomer = notImplemented('UC-29.6 Delete Customer Account');
