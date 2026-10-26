const crypto = require('crypto');
const mongoose = require('mongoose');
const { notImplemented } = require('../utils/notImplemented');
const { Order, Counter } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const stock = require('../services/stock.service');
const storeOrderService = require('../services/storeOrder.service');

const pad = (n, w = 2) => String(n).padStart(w, '0');
async function nextOrderCode() {
  const d = new Date();
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const c = await Counter.findOneAndUpdate({ _id: `order-${day}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `CM-${day}-${pad(c.seq, 4)}`;
}

// _id của đơn suy ra từ (nhân viên + idempotencyKey): gửi lại cùng key luôn ra cùng _id nên không thể tạo đơn trùng (21.0.E4)
const orderIdFromKey = (userId, key) =>
  new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`${userId}:${key}`).digest('hex').slice(0, 24));

const summary = (o) => ({
  _id: o._id, orderCode: o.orderCode, source: o.source, status: o.status, paymentStatus: o.paymentStatus,
  subtotal: o.subtotal, promotionDiscount: o.promotionDiscount, appliedPromotions: o.appliedPromotions,
  totalAmount: o.totalAmount, items: o.items, customerNote: o.customerNote, createdAt: o.createdAt,
});

// UC-21 (bước 21.3-21.4): báo giá + kiểm tra từng dòng, KHÔNG tạo đơn, KHÔNG trừ kho
exports.quoteStoreOrder = asyncHandler(async (req, res) => {
  const items = storeOrderService.normalizeItems(req.body?.items);
  const q = await storeOrderService.buildQuote(items, req.body?.promotionId);
  res.json({ ...q, canCreate: q.issues.length === 0 && !q.promoError && q.totalAmount > 0 });
});

// UC-21 Create Store Order: tạo đơn tại quầy ở trạng thái chờ thanh toán (thanh toán xử lý ở UC-22)
exports.createStoreOrder = asyncHandler(async (req, res) => {
  const { promotionId, expectedTotal, customerNote } = req.body || {};
  const key = String(req.body?.idempotencyKey || '').trim();
  if (key.length < 8 || key.length > 100) throw new ApiError(400, 'Thiếu mã chống tạo trùng (idempotencyKey, 8-100 ký tự)');
  if (customerNote != null && (typeof customerNote !== 'string' || customerNote.length > 500)) throw new ApiError(400, 'Ghi chú tối đa 500 ký tự');
  const items = storeOrderService.normalizeItems(req.body?.items);

  const orderId = orderIdFromKey(req.user.id, key);
  // Gửi lại cùng key (timeout / bấm 2 lần): trả lại đơn đã tạo, không tạo thêm
  const existing = await Order.findById(orderId);
  if (existing) return res.status(200).json({ order: summary(existing), idempotent: true });

  const q = await storeOrderService.buildQuote(items, promotionId);
  if (q.issues.length) return res.status(409).json({ message: 'Có sản phẩm cần chỉnh sửa trước khi tạo đơn', code: 'LINE_ISSUES', issues: q.issues, quote: q });
  if (q.promoError) return res.status(422).json({ message: q.promoError, code: 'PROMOTION_INVALID', quote: q });
  if (q.totalAmount <= 0) throw new ApiError(400, 'Tổng tiền đơn hàng phải lớn hơn 0');
  if (expectedTotal != null && Number(expectedTotal) !== q.totalAmount) {
    return res.status(409).json({ message: 'Giá hoặc khuyến mãi đã thay đổi, vui lòng kiểm tra lại số tiền', code: 'TOTAL_CHANGED', quote: q });
  }

  const orderItems = q.lines.map((l) => ({
    productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unitPrice, quantity: l.quantity,
    discountAmount: l.discountAmount, lineTotal: l.lineTotal,
  }));
  const now = new Date();
  let order;
  try {
    // Ghi đơn TRƯỚC (giữ chỗ _id): hai yêu cầu cùng key chạy song song thì chỉ một yêu cầu tạo được
    order = await Order.create({
      _id: orderId, orderCode: await nextOrderCode(), source: 'store', createdBy: req.user.id,
      items: orderItems, subtotal: q.subtotal,
      appliedPromotions: q.promotion ? [{ promotionId: q.promotion._id, name: q.promotion.name, amount: q.discount }] : [],
      promotionDiscount: q.discount, totalAmount: q.totalAmount,
      status: 'pending_payment', paymentStatus: 'unpaid',          // chưa thanh toán: không bao giờ ghi là đã trả (POST-3)
      customerNote: customerNote ? customerNote.trim() : undefined,
      statusHistory: [{ status: 'pending_payment', changedBy: req.user.id, changedAt: now, note: 'Tạo đơn tại quầy' }],
    });
  } catch (err) {
    if (err.code === 11000) {   // trùng _id: yêu cầu song song cùng key đã tạo đơn này
      const dup = await Order.findById(orderId);
      if (dup) return res.status(200).json({ order: summary(dup), idempotent: true });
    }
    throw err;
  }

  // Trừ kho (chính sách: trừ ngay khi tạo đơn — theo ghi chú của stock.service; thời điểm này còn TBD trong report BR-32)
  try {
    await stock.deductStock(orderItems.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
      { orderId: order._id, userId: req.user.id, reason: 'Bán tại quầy' });
  } catch (err) {
    await Order.deleteOne({ _id: order._id });      // trừ kho lỗi -> không để lại đơn mà kho chưa trừ (21.0.E5)
    if (err instanceof stock.InsufficientStockError) {
      const fresh = await storeOrderService.buildQuote(items, promotionId);
      return res.status(409).json({ message: err.message, code: 'LINE_ISSUES', issues: fresh.issues.length ? fresh.issues : [{ productId: err.productId, type: 'insufficient_stock', available: err.available, message: err.message }], quote: fresh });
    }
    throw err;
  }
  res.status(201).json({ order: summary(order), idempotent: false });
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.createOrder = notImplemented('UC-09.1 Create Order');
exports.listMyOrders = notImplemented('UC-10.1, 10.4 View Orders / Order History');
exports.getMyOrder = notImplemented('UC-10.2, 10.3 View Order Details / Track Order Status');
exports.listOrders = notImplemented('UC-35.1, 35.2 View / Search Orders');
exports.getOrder = notImplemented('UC-35.3 View Order Details');
exports.updateOrderStatus = notImplemented('Chuyển trạng thái đơn: preparing, ready_for_pickup, completed');
exports.handleOrderIssue = notImplemented('UC-35.4 Handle Order Issue');
