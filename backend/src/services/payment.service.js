const { Order, Transaction } = require('../models');
const ApiError = require('../utils/ApiError');
const stock = require('./stock.service');
const vnpay = require('./vnpay.service');
const wallet = require('./wallet.service');
const mock = require('./mock.service');
const { notifyOrder } = require('./notification.service');

// Thời gian giữ hàng chờ thanh toán (mặc định 15 phút)
const ttlMs = () => (parseInt(process.env.PAYMENT_TTL_MINUTES, 10) || 15) * 60 * 1000;
// Hạn thanh toán của một đơn
const expiresAtOf = (order) => new Date(new Date(order.createdAt).getTime() + ttlMs());
const ONLINE = ['vnpay'];

// Đơn quá hạn thanh toán: chuyển failed, trả kho, đóng giao dịch đang chờ, hoàn ví
async function expireStaleOrders({ customerId, now = new Date(), limit = 100 } = {}) {
  const filter = { status: 'pending_payment', createdAt: { $lt: new Date(now.getTime() - ttlMs()) } };
  if (customerId) filter.customerId = customerId;
  const stale = await Order.find(filter).select('_id').limit(limit).lean();
  let count = 0;
  for (const o of stale) {
    const captured = await Transaction.findOne({ orderId: o._id, status: 'success', method: 'vnpay' }).lean();
    if (captured) { await confirmReceivedPayment(captured, true); continue; }
    const claimed = await Order.findOneAndUpdate(
      { _id: o._id, status: 'pending_payment' },
      { $set: { status: 'failed', paymentStatus: 'failed', walletPolicy: true }, $push: { statusHistory: { status: 'failed', changedAt: now, note: "Payment deadline expired" } } },
      { new: true },
    );
    if (!claimed) continue;
    await Transaction.updateMany({ orderId: o._id, status: 'pending' }, { $set: { status: 'failed', failureReason: "Payment deadline expired" } });
    for (let i = 0; i < 3; i += 1) {
      try { await stock.releaseStock(o._id, { reason: "Stock returned: order payment expired" }); break; }
      catch (e) { if (i === 2) console.error("Stock return failed for expired order:", String(o._id), e); }
    }
    await require('./discountReservation.service').release(claimed);
    await wallet.settleClosedOrder(o._id);
    void notifyOrder(claimed, 'order_expired');
    count += 1;
  }
  return count;
}

// Chạy nền mỗi phút: hủy đơn quá hạn, đối soát ví, cộng điểm còn sót
function startExpiryJob(intervalMs = 60 * 1000) {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    expireStaleOrders().then(() => wallet.reconcile()).then(async () => {
      const pending = await Order.find({ status: 'completed', paymentStatus: 'paid', customerId: { $exists: true }, pointsEarned: 0, totalAmount: { $gte: 10000 } }).select('_id').limit(100).lean();
      for (const order of pending) await require('./points.service').awardPointsForOrder(order._id);
    }).catch((e) => console.error("Order expiry job failed:", e)).finally(() => { running = false; });
  }, intervalMs);
  timer.unref();
  return timer;
}

// Tự mở sự cố trên đơn khi thanh toán bất thường để admin xử lý
async function raiseSystemIssue(orderId, description) {
  try {
    await Order.updateOne({ _id: orderId, 'issues.description': { $ne: description } }, { $push: { issues: { description, status: 'open' } } });
  } catch (e) {
    console.error("Automatic issue creation failed:", e);
  }
}

// Sinh mã tham chiếu giao dịch gửi sang cổng (mã đơn + số lần thử)
const txnRefFor = (order, attempt) => `${order.orderCode.replace(/-/g, '')}T${attempt}`;

// Bắt đầu thanh toán online: tạo giao dịch chờ và link VNPay (dùng lại link cũ nếu còn hạn)
async function startOnlinePayment({ order, method, ipAddr, returnTo = 'web', appBase = null }) {
  if (!ONLINE.includes(method)) throw new ApiError(400, "Website payments use VNPay only");
  const useMock = mock.enabled();
  if (!useMock) {
    if (!vnpay.isConfigured()) throw new ApiError(503, `Payment gateway VNPay is not configured. Choose another method or contact the store.`);
  }

  await expireStaleOrders({ customerId: order.customerId });
  const fresh = await Order.findOne({ _id: order._id, customerId: order.customerId }).lean();
  if (!fresh) throw new ApiError(404, "Order not found");
  if (fresh.status === 'failed') throw new ApiError(409, "This order has expired. Please place a new order.", { code: 'ORDER_EXPIRED' });
  if (fresh.checkoutReady === false) throw new ApiError(409, 'Checkout is still processing');
  if (fresh.status !== 'pending_payment' || fresh.paymentStatus === 'paid') throw new ApiError(409, "This order does not need another payment", { code: 'NOT_PAYABLE' });

  const expiresAt = expiresAtOf(fresh);

  const pending = await Transaction.findOne({ orderId: fresh._id, status: 'pending' }).lean();
  if (pending) {
    if (pending.method === method && pending.paymentUrl) {
      return { paymentUrl: pending.paymentUrl, txnRef: pending.txnRef, expiresAt, method, reused: true };
    }
    throw new ApiError(409,
      "This order already has a pending transaction. Complete it or wait for it to expire before trying again.",
      { code: 'PAYMENT_PENDING', method: pending.method });
  }

  const attempt = (await Transaction.countDocuments({ orderId: fresh._id })) + 1;
  const txnRef = txnRefFor(fresh, attempt);
  let txn;
  try { txn = await Transaction.create({
    orderId: fresh._id, customerId: fresh.customerId, method, amount: fresh.payableAmount ?? fresh.totalAmount, status: 'pending', txnRef,
    gateway: { provider: useMock ? 'mock' : method }, onlineAttempt: true,
  }); } catch (error) {
    if (error.code !== 11000) throw error;
    const active = await Transaction.findOne({ orderId: fresh._id, status: 'pending' }).lean();
    if (active?.paymentUrl) return { paymentUrl: active.paymentUrl, txnRef: active.txnRef, expiresAt, method: active.method, reused: true };
    throw new ApiError(409, 'A payment link is being prepared. Please retry shortly.', { code: 'PAYMENT_PENDING', method });
  }

  try {
    let paymentUrl;
    if (useMock) paymentUrl = mock.createPaymentUrl(txnRef, { base: appBase, app: returnTo === 'mobile' });
    else if (method === 'vnpay') {
      paymentUrl = vnpay.createPaymentUrl({ txnRef, amount: fresh.payableAmount ?? fresh.totalAmount, ipAddr, orderInfo: `Thanh toan don hang ${fresh.orderCode}`, expireAt: expiresAt, returnTo, appBase });
    }
    await Transaction.updateOne({ _id: txn._id }, { $set: { paymentUrl } });
    return { paymentUrl, txnRef, expiresAt, method, reused: false };
  } catch (err) {
    await Transaction.updateOne({ _id: txn._id, status: 'pending' }, { $set: { status: 'failed', failureReason: `Could not create payment link: ${err.message}` } });
    if (err instanceof ApiError) throw err;
    console.error("Payment link creation failed:", err);
    throw new ApiError(502, "Could not connect to the payment gateway. No payment was charged; you can try again.", { code: 'GATEWAY_UNAVAILABLE' });
  }
}

// Xác nhận đơn đã nhận tiền: chuyển confirmed, gửi thông báo (gọi lại nhiều lần vẫn an toàn)
async function confirmReceivedPayment(txn, duplicate = false) {
  const now = txn.paidAt || new Date();
  const order = await Order.findOneAndUpdate({ _id: txn.orderId, status: 'pending_payment', checkoutReady: { $ne: false } }, {
    $set: { status: 'confirmed', paymentStatus: 'paid', paidAt: now, paymentMethod: txn.method, paidTransactionId: txn._id },
    $push: { statusHistory: { status: 'confirmed', changedAt: now, note: 'Paid through VNPay' } },
  }, { new: true });
  if (order) {
    void notifyOrder(order, 'payment_success', { amount: txn.amount, txnRef: txn.txnRef });
    return { result: 'success', txn, order };
  }
  const closed = await Order.findById(txn.orderId).lean();
  if (closed?.paidTransactionId && String(closed.paidTransactionId) === String(txn._id) && !['cancelled', 'failed'].includes(closed.status)) return { result: 'duplicate', txn };
  let credited = false;
  if (closed && ['cancelled', 'failed'].includes(closed.status)) {
    await wallet.settleClosedOrder(txn.orderId); credited = true;
  } else if (txn.customerId && (closed?.paidTransactionId || closed?.paymentMethod === 'wallet')) {
    await wallet.move(txn.customerId, { key: 'refund:' + txn._id, amount: txn.amount, orderId: txn.orderId, orderCode: closed?.orderCode, description: 'Additional payment returned to wallet' });
    credited = true;
  } else if (duplicate) return { result: 'duplicate', txn };
  const detail = credited ? 'Payment received after the order closed or was already paid; credited to the customer wallet. Do not refund again.' : 'Payment received for an order that cannot be confirmed. Reconciliation is required.';
  await Transaction.updateOne({ _id: txn._id }, { $set: { failureReason: detail } });
  await raiseSystemIssue(txn.orderId, detail + ' Reference: ' + txn.txnRef);
  if (credited) void notifyOrder(txn.orderId, 'payment_late', { amount: txn.amount, txnRef: txn.txnRef });
  return { result: duplicate ? 'duplicate' : 'late_success', txn };
}

// Áp kết quả từ cổng thanh toán: thành công / thất bại / chờ; tiền về muộn thì mở sự cố
async function applyGatewayResult({ txnRef, outcome, amount, gateway, reason }) {
  const txn = await Transaction.findOne({ txnRef }).lean();
  if (!txn) return { result: 'unknown_txn' };
  if (Number(amount) !== Number(txn.amount)) {
    await raiseSystemIssue(txn.orderId, `The gateway reported ${amount}đ instead of the transaction amount ${txn.amount}đ (reference ${txnRef}). Payment reconciliation is required.`);
    return { result: 'amount_mismatch', txn };
  }
  const lateSuccess = txn.status === 'failed' && outcome === 'success';
  if (txn.status !== 'pending' && !lateSuccess) {
    if (txn.status === 'success' && outcome === 'success') return confirmReceivedPayment(txn, true);
    return { result: 'duplicate', txn };
  }

  const gw = { ...(txn.gateway || {}), ...(gateway || {}) };
  const toSet = Object.fromEntries(Object.entries(gw).filter(([, v]) => v !== undefined).map(([k, v]) => [`gateway.${k}`, v]));

  if (outcome === 'pending') {
    await Transaction.updateOne({ _id: txn._id, status: 'pending' }, { $set: toSet });
    return { result: 'pending', txn };
  }

  const now = new Date();
  if (outcome === 'success') {
    const claimed = await Transaction.findOneAndUpdate(
      { _id: txn._id, status: txn.status }, { $set: { ...toSet, status: 'success', paidAt: now }, ...(lateSuccess ? { $unset: { failureReason: '' } } : {}) }, { new: true },
    );
    if (!claimed) return applyGatewayResult({ txnRef, outcome, amount, gateway, reason });
    return confirmReceivedPayment(claimed);
  }

  const claimed = await Transaction.findOneAndUpdate(
    { _id: txn._id, status: 'pending' }, { $set: { ...toSet, status: 'failed', failureReason: reason || "Payment unsuccessful" } }, { new: true },
  );
  if (!claimed) return { result: 'duplicate', txn };
  const order = await Order.findOneAndUpdate({ _id: txn.orderId, status: 'pending_payment' }, { $set: { paymentStatus: 'failed' } }, { new: true });
  if (order) void notifyOrder(order, 'payment_failed', { amount: txn.amount, txnRef });
  return { result: 'failed', txn: claimed, order };
}

module.exports = { startOnlinePayment, applyGatewayResult, expireStaleOrders, startExpiryJob, expiresAtOf, ttlMs };
