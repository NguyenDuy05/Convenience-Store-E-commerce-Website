const { Order, Transaction, Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const payment = require('../services/payment.service');
const vnpay = require('../services/vnpay.service');
const mock = require('../services/mock.service');
const { notifyOrder } = require('../services/notification.service');

const frontend = () => process.env.FRONTEND_URL || 'http://localhost:5173';
// Trang kết quả KHÔNG tin tham số trên URL: nó đọc lại trạng thái đơn từ server
const resultUrl = (orderId) => `${frontend()}/payment/result${orderId ? `?orderId=${orderId}` : '?error=unknown'}`;

const clientIp = (req) => {
  const raw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
  const ip = raw.replace(/^::ffff:/, '');
  return ip === '::1' ? '127.0.0.1' : ip;
};

// UC-08.2 Make Payment (catalog tài liệu; code cũ ghi UC-09.2): tạo link thanh toán VNPay cho đơn đang chờ thanh toán.
// Body: { orderId, method: 'vnpay' }. Gọi lại khi còn giao dịch đang chờ cùng cổng -> trả lại đúng link cũ (không tạo giao dịch mới).
exports.createOnlinePayment = asyncHandler(async (req, res) => {
  const { orderId, method, returnTo = 'web' } = req.body;
  if (!['web', 'mobile'].includes(returnTo)) throw new ApiError(400, 'Invalid payment return destination');
  if (!orderId || !mongoose.isValidObjectId(orderId)) throw new ApiError(404, "Order not found");
  const order = await Order.findOne({ _id: orderId, customerId: req.user.id }).lean();
  if (!order) throw new ApiError(404, "Order not found");
  const out = await payment.startOnlinePayment({ order, method, ipAddr: clientIp(req), returnTo });
  res.json(out);
});

// Áp kết quả đã xác thực chữ ký và trả về orderId để chuyển trang
async function applyVerified(v) {
  const r = await payment.applyGatewayResult(v);
  return { ...r, orderId: r.txn ? String(r.txn.orderId) : undefined };
}

// VNPay chuyển TRÌNH DUYỆT của khách về đây sau khi thanh toán. Cũng áp kết quả (IPN không tới được khi chạy localhost).
exports.vnpayReturn = asyncHandler(async (req, res) => {
  const v = vnpay.verifyCallback(req.query);
  if (!v.valid) return res.redirect(`${frontend()}/payment/result?error=invalid_signature`);
  const r = await applyVerified(v);
  res.redirect(resultUrl(r.orderId));
});

// A fixed app scheme prevents open redirects. The app still reads its owned order
// from the API; neither a deep link nor an unsigned URL can mark an order paid.
exports.vnpayMobileReturn = asyncHandler(async (req, res) => {
  const v = vnpay.verifyCallback(req.query);
  if (!v.valid) return res.redirect('quickstore://payment-result?error=invalid_signature');
  const r = await applyVerified(v);
  res.redirect(r.orderId ? `quickstore://payment-result?orderId=${encodeURIComponent(r.orderId)}` : 'quickstore://payment-result?error=unknown');
});

// VNPay gọi SERVER báo kết quả (IPN). Phản hồi theo mã VNPay quy định.
exports.vnpayIpn = asyncHandler(async (req, res) => {
  const v = vnpay.verifyCallback(req.query);
  if (!v.valid) return res.json({ RspCode: '97', Message: 'Invalid signature' });
  const r = await applyVerified(v);
  if (r.result === 'unknown_txn') return res.json({ RspCode: '01', Message: 'Order not found' });
  if (r.result === 'amount_mismatch') return res.json({ RspCode: '04', Message: 'Invalid amount' });
  if (r.result === 'duplicate') return res.json({ RspCode: '02', Message: 'Order already confirmed' });
  res.json({ RspCode: '00', Message: 'Confirm Success' });
});

// ---- Cổng giả lập (chỉ khi PAYMENT_MOCK=true) ----
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.mockPay = asyncHandler(async (req, res) => {
  if (!mock.enabled()) return res.status(404).json({ message: "Page not found" });
  const txn = await Transaction.findOne({ txnRef: String(req.query.txnRef || '') }).lean();
  if (!txn) return res.status(404).send("Transaction not found");
  const order = await Order.findById(txn.orderId).select('orderCode').lean();
  const btn = (result, label, color) => `<a href="${esc(mock.completeUrl(txn.txnRef, result))}" style="display:block;margin:10px 0;padding:14px;border-radius:10px;background:${color};color:#fff;text-decoration:none;font-weight:700;text-align:center">${label}</a>`;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock payment gateway</title></head>
<body style="font-family:system-ui,sans-serif;background:#f3f2ff;margin:0;padding:24px">
<div style="max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 6px 18px rgba(25,36,78,.12)">
<p style="margin:0;font-size:12px;font-weight:700;color:#b45309;letter-spacing:.05em">MOCK PAYMENT GATEWAY (${esc(txn.method.toUpperCase())}) - FOR TESTING ONLY</p>
<h2 style="margin:12px 0 4px">Order ${esc(order ? order.orderCode : '')}</h2>
<p style="margin:0 0 4px;color:#555">Transaction reference: <b>${esc(txn.txnRef)}</b></p>
<p style="margin:0 0 20px;font-size:22px;font-weight:700">${new Intl.NumberFormat('vi-VN').format(txn.amount)} ₫</p>
${btn('success', "Payment successful", '#356b0a')}${btn('failed', "Payment failed / cancelled", '#ba1a1a')}${btn('pending', "Awaiting confirmation (no result yet)", '#6f5d0e')}
</div></body></html>`);
});

exports.mockComplete = asyncHandler(async (req, res) => {
  if (!mock.enabled()) return res.status(404).json({ message: "Page not found" });
  const { txnRef, result, sig } = req.query;
  if (!mock.RESULTS.includes(result) || !mock.verify(txnRef, result, sig)) return res.status(400).send("Invalid request");
  const txn = await Transaction.findOne({ txnRef }).lean();
  if (!txn) return res.status(404).send("Transaction not found");
  const r = await applyVerified({
    txnRef, amount: txn.amount, outcome: result,
    gateway: { provider: 'mock', transactionNo: `MOCK${Date.now()}`, responseCode: result === 'success' ? '00' : result === 'pending' ? '07' : '24' },
    reason: result === 'failed' ? "Customer cancelled / mock payment failed" : undefined,
  });
  res.redirect(resultUrl(r.orderId || String(txn.orderId)));
});

// ---------- Staff: thu tiền tại quầy (UC-23) ----------
const { logActivity } = require('../services/activity.service');
const escapeRx = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function loadPayableStoreOrder(orderId) {
  if (!orderId || !mongoose.isValidObjectId(orderId)) throw new ApiError(404, "Order not found");
  await payment.expireStaleOrders();
  const order = await Order.findById(orderId).lean();
  if (!order || order.source !== 'store') throw new ApiError(404, "Store order not found");
  if (order.status === 'failed') throw new ApiError(409, "This order expired and its stock was released. Please create a new order.", { code: 'ORDER_EXPIRED' });
  if (order.status !== 'pending_payment' || order.paymentStatus === 'paid') throw new ApiError(409, "This order is no longer awaiting payment", { code: 'NOT_PAYABLE' });
  return order;
}

// Ghi nhận đã thu tiền: đơn tại quầy giao hàng ngay nên chuyển thẳng sang completed. Chỉ một yêu cầu thắng (điều kiện trạng thái).
async function settleStoreOrder({ order, staffId, method, extra }) {
  const now = new Date();
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: 'pending_payment', paymentStatus: 'unpaid' },
    {
      $set: { status: 'completed', paymentStatus: 'paid', paymentMethod: method, paidAt: now, pickedUpAt: now },
      $push: { statusHistory: { status: 'completed', changedAt: now, changedBy: staffId, note: "Paid at the counter" } },
    },
    { new: true },
  );
  if (!claimed) throw new ApiError(409, "This order was just paid or expired. Please refresh.", { code: 'NOT_PAYABLE' });
  try {
    const txn = await Transaction.create({
      orderId: order._id, processedBy: staffId, method, amount: order.totalAmount, status: 'success', paidAt: now, ...extra,
    });
    void notifyOrder(claimed, 'payment_success', { amount: order.totalAmount, txnRef: String(txn._id) });
    return { order: claimed, transaction: txn };
  } catch (err) {
    await Order.updateOne({ _id: order._id }, { $set: { status: 'pending_payment', paymentStatus: 'unpaid' }, $unset: { paidAt: '', pickedUpAt: '', paymentMethod: '' }, $pop: { statusHistory: 1 } });
    throw err;
  }
}

// GET /api/payments/orders?q=  Đơn tại quầy đang chờ thanh toán (mới nhất trước), tìm theo mã đơn
exports.listStoreOrdersToPay = asyncHandler(async (req, res) => {
  await payment.expireStaleOrders();
  const filter = { source: 'store', status: 'pending_payment', paymentStatus: 'unpaid' };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
  if (q) filter.orderCode = new RegExp(escapeRx(q), 'i');
  const items = await Order.find(filter).select('orderCode items subtotal promotionDiscount totalAmount customerNote createdAt').sort({ createdAt: -1 }).limit(30).lean();
  res.json({ items: items.map((o) => ({ ...o, expiresAt: payment.expiresAtOf(o) })), total: items.length });
});

// UC-23.1 Process Cash Payment. body: { orderId, received }
exports.processCashPayment = asyncHandler(async (req, res) => {
  const order = await loadPayableStoreOrder(req.body?.orderId);
  const received = Number(req.body?.received);
  if (!Number.isInteger(received) || received < 0 || received > 1000000000) throw new ApiError(400, "Invalid cash amount");
  if (received < order.totalAmount) throw new ApiError(400, `Insufficient cash. Amount due: ${new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ.`, { code: 'INSUFFICIENT_CASH' });
  const out = await settleStoreOrder({ order, staffId: req.user.id, method: 'cash', extra: { cash: { received, change: received - order.totalAmount } } });
  await logActivity(req, { action: 'PAYMENT_CASH', targetType: 'Order', targetId: order._id, detail: { orderCode: order.orderCode, amount: order.totalAmount } });
  res.status(201).json({ order: out.order, transaction: out.transaction, change: received - order.totalAmount });
});

// UC-23.2 Process Card/E-wallet Payment. body: { orderId, method: card|vnpay, reference, outcome?: success|failed, reason? }
// Thanh toán thực hiện trên máy POS / ví của khách; nhân viên nhập mã chuẩn chi hoặc báo thất bại để ghi nhận giao dịch lỗi.
exports.processCardPayment = asyncHandler(async (req, res) => {
  const order = await loadPayableStoreOrder(req.body?.orderId);
  const method = req.body?.method || 'card';
  if (!['card', 'vnpay'].includes(method)) throw new ApiError(400, "Invalid payment method");
  const outcome = req.body?.outcome === 'failed' ? 'failed' : 'success';

  if (outcome === 'failed') {
    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim().slice(0, 300) : "In-store transaction failed";
    const txn = await Transaction.create({ orderId: order._id, processedBy: req.user.id, method, amount: order.totalAmount, status: 'failed', failureReason: reason });
    await logActivity(req, { action: 'PAYMENT_FAILED', targetType: 'Order', targetId: order._id, detail: { orderCode: order.orderCode, method, reason } });
    return res.status(201).json({ order, transaction: txn, outcome });
  }
  const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
  if (!/^[A-Za-z0-9-]{4,40}$/.test(reference)) throw new ApiError(400, "Enter a transaction / authorization reference (4–40 letters or digits)");
  if (await Transaction.exists({ 'gateway.transactionNo': reference, status: 'success' })) throw new ApiError(409, "This transaction reference has already been used for another order", { code: 'DUPLICATE_REFERENCE' });
  const out = await settleStoreOrder({ order, staffId: req.user.id, method, extra: { gateway: { provider: 'pos', transactionNo: reference, payDate: new Date() } } });
  await logActivity(req, { action: 'PAYMENT_CARD', targetType: 'Order', targetId: order._id, detail: { orderCode: order.orderCode, method, amount: order.totalAmount } });
  res.status(201).json({ order: out.order, transaction: out.transaction, outcome });
});

// Print Receipt: dữ liệu hóa đơn của đơn đã thanh toán. GET /api/payments/receipt/:orderId (staff, admin)
exports.getReceipt = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!mongoose.isValidObjectId(orderId)) throw new ApiError(404, "Order not found");
  const order = await Order.findById(orderId).populate('createdBy', 'fullName').lean();
  if (!order) throw new ApiError(404, "Order not found");
  if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') throw new ApiError(409, "A receipt is not available until this order is paid", { code: 'NOT_PAID' });
  const [txn, store] = await Promise.all([
    Transaction.findOne({ orderId: order._id, status: 'success' }).sort({ paidAt: -1 }).populate('processedBy', 'fullName').lean(),
    Store.findOne().select('name address phone website openingHours').lean(),
  ]);
  res.json({
    store: store || null,
    orderCode: order.orderCode, source: order.source, paidAt: order.paidAt || txn?.paidAt, createdAt: order.createdAt,
    cashier: txn?.processedBy?.fullName || order.createdBy?.fullName || null,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, discountAmount: i.discountAmount, lineTotal: i.lineTotal })),
    subtotal: order.subtotal, promotionDiscount: order.promotionDiscount, discountCode: order.discountCode?.code ? { code: order.discountCode.code, amount: order.discountCode.amount } : null,
    totalAmount: order.totalAmount,
    payment: { method: order.paymentMethod, cashReceived: txn?.cash?.received ?? null, change: txn?.cash?.change ?? null, reference: txn?.gateway?.transactionNo || txn?.txnRef || null },
    refunded: order.paymentStatus === 'refunded',
  });
});

// ---------- Admin: Manage Payments (UC-41) ----------
const POP = [{ path: 'orderId', select: 'orderCode source status paymentStatus totalAmount' }, { path: 'customerId', select: 'fullName email' }, { path: 'processedBy', select: 'fullName' }];
const dateOf = (v, label, end) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${label} is invalid`);
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(v)) d.setHours(23, 59, 59, 999);
  return d;
};

function paymentView(t) {
  const g = t.gateway || {};
  return {
    _id: t._id, method: t.method, amount: t.amount, status: t.status, txnRef: t.txnRef, createdAt: t.createdAt, paidAt: t.paidAt,
    failureReason: t.failureReason, errorHandling: t.errorHandling || null, refund: t.refund?.refundedAt ? t.refund : null,
    gateway: { provider: g.provider, transactionNo: g.transactionNo, responseCode: g.responseCode },
    order: t.orderId && t.orderId._id ? t.orderId : null,
    customer: t.customerId && t.customerId._id ? t.customerId : null,
    processedBy: t.processedBy && t.processedBy._id ? t.processedBy.fullName : null,
    needsReview: !t.errorHandling?.handledAt && ((t.status === 'success' && !!t.failureReason) || t.status === 'failed' || t.status === 'pending'),
  };
}

async function listByStatus(req, res, forcedStatus) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const filter = {};
  if (forcedStatus) filter.status = forcedStatus;
  else if (req.query.status) {
    if (!['pending', 'success', 'failed', 'refunded'].includes(req.query.status)) throw new ApiError(400, "Invalid status");
    filter.status = req.query.status;
  }
  if (req.query.method) {
    if (!['cash', 'card', 'vnpay', 'wallet'].includes(req.query.method)) throw new ApiError(400, "Invalid method");
    filter.method = req.query.method;
  }
  const from = dateOf(req.query.from, "From date", false);
  const to = dateOf(req.query.to, "To date", true);
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) {
    const rx = new RegExp(escapeRx(q), 'i');
    const orders = await Order.find({ orderCode: rx }).select('_id').limit(500).lean();
    filter.$or = [{ txnRef: rx }, { 'gateway.transactionNo': rx }, { orderId: { $in: orders.map((o) => o._id) } }];
  }
  const [docs, total, agg] = await Promise.all([
    Transaction.find(filter).populate(POP).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: '$status', amount: { $sum: '$amount' } } }]),
  ]);
  // Tách tiền đã thu (success) và tiền đã hoàn vào ví (refunded); giao dịch lỗi/đang chờ không tính là tiền
  const sumOf = (s) => agg.find((g) => g._id === s)?.amount || 0;
  const collected = sumOf('success') + sumOf('refunded'), refunded = sumOf('refunded');
  res.json({ items: docs.map(paymentView), total, page, limit, summary: { totalAmount: collected, collectedAmount: collected, refundedAmount: refunded, netAmount: collected - refunded } });
}

exports.listPayments = asyncHandler((req, res) => listByStatus(req, res, null));          // UC-41.1
exports.listFailedPayments = asyncHandler((req, res) => listByStatus(req, res, 'failed'));    // UC-41.2
exports.listPendingPayments = asyncHandler((req, res) => listByStatus(req, res, 'pending'));  // UC-41.3

// UC-41.4 Handle Payment Error. PATCH /api/payments/admin/:id/resolve  body: { action: confirm_paid|mark_failed|dismiss, note }
exports.handlePaymentError = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Transaction not found");
  const action = req.body?.action;
  if (!['confirm_paid', 'mark_failed', 'dismiss'].includes(action)) throw new ApiError(400, "Invalid action");
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (note.length < 3 || note.length > 500) throw new ApiError(400, "Resolution notes must contain 3–500 characters");
  let txn = await Transaction.findById(id);
  if (!txn) throw new ApiError(404, "Transaction not found");
  if (txn.errorHandling?.handledAt) throw new ApiError(409, "This transaction has already been resolved", { code: 'ALREADY_HANDLED' });
  if (txn.status === 'refunded') throw new ApiError(409, "This payment was already refunded to the customer's wallet", { code: 'ALREADY_REFUNDED' });
  const now = new Date();

  if (action === 'confirm_paid') {
    if (txn.status === 'success') throw new ApiError(409, "This transaction is already successful");
    if (txn.txnRef && txn.method === 'vnpay') {
      await payment.applyGatewayResult({ txnRef: txn.txnRef, amount: txn.amount, outcome: 'success', gateway: { provider: txn.gateway?.provider || 'vnpay' } });
      txn = await Transaction.findById(id);
    } else {
    txn.status = 'success';
    txn.paidAt = now;
    txn.failureReason = undefined;
    const order = await Order.findOneAndUpdate(
      { _id: txn.orderId, status: 'pending_payment' },
      { $set: { status: 'confirmed', paymentStatus: 'paid', paidAt: now, paymentMethod: txn.method }, $push: { statusHistory: { status: 'confirmed', changedAt: now, changedBy: req.user.id, note: "Payment confirmed by admin" } } },
      { new: true },
    );
    if (!order) txn.failureReason = "Payment confirmed by admin, but the order is no longer awaiting payment and requires manual review";
    }
  } else if (action === 'mark_failed') {
    if (txn.status === 'success') throw new ApiError(409, "A successful transaction cannot be marked as failed");
    txn.status = 'failed';
    txn.failureReason = txn.failureReason || note;
  } else if (txn.status === 'pending') {
    throw new ApiError(400, "A pending transaction must be confirmed or marked as failed");
  }
  txn.errorHandling = { handledBy: req.user.id, handledAt: now, resolution: `${action}: ${note}` };
  await txn.save();
  if ((action === 'confirm_paid' || action === 'mark_failed') && !(action === 'confirm_paid' && txn.txnRef && txn.method === 'vnpay')) {
    const event = action === 'mark_failed' ? 'payment_failed' : txn.failureReason ? 'payment_late' : 'payment_success';
    void notifyOrder(txn.orderId, event, { amount: txn.amount, txnRef: txn.txnRef || String(txn._id) });
  }
  await logActivity(req, { action: 'PAYMENT_ERROR_HANDLE', targetType: 'Transaction', targetId: txn._id, detail: { action, note } });
  res.json(paymentView(await txn.populate(POP)));
});
