const { Order, User, Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { toItem } = require('../utils/orderDto');
const payment = require('../services/payment.service');

const ACTIVE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
const HISTORY = ['completed', 'cancelled', 'failed'];
const NEXT = { confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'completed' };
// Thông tin khách của đơn để staff xem (id, tên, SĐT)
const customerOf = (customer) => customer ? { _id: customer._id, fullName: customer.fullName, phone: customer.phone || '' } : null;
// Staff xem hàng đợi / lịch sử đơn (đơn online và đơn tại quầy)
exports.list = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'Invalid page or page size');
  const source = req.query.source || 'online', status = req.query.status || 'active';
  if (!['online', 'store', 'all'].includes(source) || !['active', 'history', 'all', ...ACTIVE, ...HISTORY].includes(status)) throw new ApiError(400, 'Invalid order filter');
  if (req.query.q && (typeof req.query.q !== 'string' || req.query.q.length > 100)) throw new ApiError(400, 'Invalid order search');
  await payment.expireStaleOrders();
  const base = { ...(source !== 'all' ? { source } : {}) };
  if (req.query.q) base.orderCode = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = { ...base, ...(status === 'active' ? { status: { $in: ACTIVE } } : status === 'history' ? { status: { $in: HISTORY } } : status !== 'all' ? { status } : {}) };
  const [items, total, groups] = await Promise.all([
    Order.find(filter).populate('customerId', 'fullName phone').select('orderCode source status paymentMethod paymentStatus totalAmount items customerId createdAt readyAt pickedUpAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter), Order.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ items: items.map((order) => ({ ...order, customerId: undefined, customer: customerOf(order.customerId), itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) })), total, page, limit, counts: Object.fromEntries(groups.map((g) => [g._id, g.count])) });
});
// Staff xem chi tiết đơn để chuẩn bị và giao hàng
exports.get = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new ApiError(404, 'Order not found');
  const order = await Order.findById(req.params.id).populate({ path: 'items.productId', select: 'images unit' }).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  const [customer, store] = await Promise.all([
    order.customerId ? User.findById(order.customerId).select('fullName phone').lean() : null,
    Store.findOne().select('name address phone website openingHours status').lean(),
  ]);
  res.json({
    _id: order._id, orderCode: order.orderCode, source: order.source, status: order.status,
    paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, totalAmount: order.totalAmount,
    subtotal: order.subtotal, promotionDiscount: order.promotionDiscount, customerNote: order.customerNote,
    customer: customerOf(customer), items: order.items.map(toItem), store, createdAt: order.createdAt,
    pickupSchedule: require('../services/pickupSchedule.service').pickupSchedule(store), preparationStartsAt: order.preparationStartsAt || null,
    readyAt: order.readyAt, pickedUpAt: order.pickedUpAt,
    cancelledAt: order.cancelledAt || null, cancelReason: order.cancelReason || '', refund: order.refund?.refundedAt ? { amount: order.refund.amount, refundedAt: order.refund.refundedAt } : null, cancelFault: order.cancelFault || null, compensation: order.compensation?.code ? order.compensation : null,
    statusHistory: (order.statusHistory || []).map(({ status, changedAt }) => ({ status, changedAt })),
    nextTransition: order.source === 'online' && NEXT[order.status] ? { to: NEXT[order.status], needsCashConfirm: NEXT[order.status] === 'completed' && order.paymentStatus !== 'paid' } : null,
  });
});
