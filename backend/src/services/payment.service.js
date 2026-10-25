// UC-08.2 Make Payment: tạo giao dịch online (VNPay/MoMo), xử lý kết quả cổng trả về, hết hạn đơn chưa thanh toán.
const { Order, Transaction } = require('../models');
const ApiError = require('../utils/ApiError');
const stock = require('./stock.service');
const vnpay = require('./vnpay.service');
const momo = require('./momo.service');
const mock = require('./mock.service');

const ttlMs = () => (parseInt(process.env.PAYMENT_TTL_MINUTES, 10) || 15) * 60 * 1000;
const expiresAtOf = (order) => new Date(new Date(order.createdAt).getTime() + ttlMs());
const ONLINE = ['vnpay', 'momo'];

// Đơn quá hạn thanh toán -> failed + hoàn kho + đóng các giao dịch đang chờ. Mỗi đơn chỉ xử lý một lần
// (ai chuyển được trạng thái pending_payment -> failed trước thì người đó hoàn kho).
async function expireStaleOrders({ customerId, now = new Date(), limit = 100 } = {}) {
  const filter = { status: 'pending_payment', createdAt: { $lt: new Date(now.getTime() - ttlMs()) } };
  if (customerId) filter.customerId = customerId;
  const stale = await Order.find(filter).select('_id').limit(limit).lean();
  let count = 0;
  for (const o of stale) {
    const claimed = await Order.findOneAndUpdate(
      { _id: o._id, status: 'pending_payment' },
      { $set: { status: 'failed', paymentStatus: 'failed' }, $push: { statusHistory: { status: 'failed', changedAt: now, note: 'Hết hạn thanh toán' } } },
      { new: true },
    );
    if (!claimed) continue;
    await Transaction.updateMany({ orderId: o._id, status: 'pending' }, { $set: { status: 'failed', failureReason: 'Hết hạn thanh toán' } });
    for (let i = 0; i < 3; i += 1) {
      try { await stock.releaseStock(o._id, { reason: 'Hoàn kho: đơn hết hạn thanh toán' }); break; }
      catch (e) { if (i === 2) console.error('Hoàn kho đơn hết hạn lỗi:', String(o._id), e); }
    }
    count += 1;
  }
  return count;
}

// Chạy nền mỗi phút (gọi từ server.js)
function startExpiryJob(intervalMs = 60 * 1000) {
  const timer = setInterval(() => {
    expireStaleOrders().catch((e) => console.error('Job hết hạn đơn lỗi:', e));
  }, intervalMs);
  timer.unref();
  return timer;
}

// Hệ thống tự mở sự cố trên đơn khi thanh toán bất thường để admin xử lý ở UC-34.4. Cùng nội dung chỉ tạo một lần.
async function raiseSystemIssue(orderId, description) {
  try {
    await Order.updateOne({ _id: orderId, 'issues.description': { $ne: description } }, { $push: { issues: { description, status: 'open' } } });
  } catch (e) {
    console.error('Tạo sự cố tự động lỗi:', e);
  }
}

const txnRefFor = (order, attempt) => `${order.orderCode.replace(/-/g, '')}T${attempt}`;

// Khách bấm thanh toán online cho một đơn pending_payment. Trả { paymentUrl, txnRef, expiresAt, method, reused }.
async function startOnlinePayment({ order, method, ipAddr }) {
  if (!ONLINE.includes(method)) throw new ApiError(400, 'Phương thức thanh toán online không hợp lệ (vnpay hoặc momo)');
  const useMock = mock.enabled();
  if (!useMock) {
    const svc = method === 'vnpay' ? vnpay : momo;
    if (!svc.isConfigured()) throw new ApiError(503, `Cổng thanh toán ${method === 'vnpay' ? 'VNPay' : 'MoMo'} chưa được cấu hình. Vui lòng chọn cách khác hoặc liên hệ cửa hàng.`);
  }

  await expireStaleOrders({ customerId: order.customerId });
  const fresh = await Order.findOne({ _id: order._id, customerId: order.customerId }).lean();
  if (!fresh) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  if (fresh.status === 'failed') throw new ApiError(409, 'Đơn hàng đã hết hạn thanh toán. Vui lòng đặt lại.', { code: 'ORDER_EXPIRED' });
  if (fresh.status !== 'pending_payment' || fresh.paymentStatus === 'paid') throw new ApiError(409, 'Đơn hàng này không cần thanh toán thêm', { code: 'NOT_PAYABLE' });

  const expiresAt = expiresAtOf(fresh);

  // E4: nếu còn giao dịch đang chờ kết quả thì KHÔNG tạo giao dịch thứ hai (tránh khách bị trừ tiền hai lần)
  const pending = await Transaction.findOne({ orderId: fresh._id, status: 'pending' }).lean();
  if (pending) {
    if (pending.method === method && pending.paymentUrl) {
      return { paymentUrl: pending.paymentUrl, txnRef: pending.txnRef, expiresAt, method, reused: true };
    }
    throw new ApiError(409,
      'Đơn này đang có một giao dịch chờ kết quả. Vui lòng hoàn tất giao dịch đó hoặc đợi đến khi hết hạn rồi thử lại.',
      { code: 'PAYMENT_PENDING', method: pending.method });
  }

  const attempt = (await Transaction.countDocuments({ orderId: fresh._id })) + 1;
  const txnRef = txnRefFor(fresh, attempt);
  const txn = await Transaction.create({
    orderId: fresh._id, customerId: fresh.customerId, method, amount: fresh.totalAmount, status: 'pending', txnRef,
    gateway: { provider: useMock ? 'mock' : method },
  });

  try {
    let paymentUrl;
    if (useMock) paymentUrl = mock.createPaymentUrl(txnRef);
    else if (method === 'vnpay') {
      paymentUrl = vnpay.createPaymentUrl({ txnRef, amount: fresh.totalAmount, ipAddr, orderInfo: `Thanh toan don hang ${fresh.orderCode}`, expireAt: expiresAt });
    } else {
      const minutes = (expiresAt.getTime() - Date.now()) / 60000;
      paymentUrl = (await momo.createPayment({ txnRef, amount: fresh.totalAmount, orderInfo: `Thanh toan don hang ${fresh.orderCode}`, expireMinutes: minutes })).payUrl;
    }
    await Transaction.updateOne({ _id: txn._id }, { $set: { paymentUrl } });
    return { paymentUrl, txnRef, expiresAt, method, reused: false };
  } catch (err) {
    // Chưa có link thì chưa thể có khoản tiền nào bị trừ: đóng giao dịch này để khách thử lại được ngay
    await Transaction.updateOne({ _id: txn._id, status: 'pending' }, { $set: { status: 'failed', failureReason: `Không tạo được link thanh toán: ${err.message}` } });
    if (err instanceof ApiError) throw err;
    console.error('Tạo link thanh toán lỗi:', err);
    throw new ApiError(502, 'Không kết nối được cổng thanh toán. Chưa có khoản tiền nào bị trừ, bạn có thể thử lại.', { code: 'GATEWAY_UNAVAILABLE' });
  }
}

// Áp kết quả cổng thanh toán (return hoặc IPN, đã kiểm tra chữ ký). AN TOÀN KHI GỌI LẠI NHIỀU LẦN:
// chỉ lần đầu chuyển giao dịch pending -> success/failed mới đổi đơn. Trả { result, order? }.
// result: success | failed | pending | duplicate | unknown_txn | amount_mismatch | late_success
async function applyGatewayResult({ txnRef, outcome, amount, gateway, reason }) {
  const txn = await Transaction.findOne({ txnRef }).lean();
  if (!txn) return { result: 'unknown_txn' };
  if (Number(amount) !== Number(txn.amount)) {                                            // số tiền không khớp -> không tin
    await raiseSystemIssue(txn.orderId, `Cổng thanh toán báo số tiền ${amount}đ khác số tiền giao dịch ${txn.amount}đ (mã ${txnRef}). Cần đối soát với cổng thanh toán.`);
    return { result: 'amount_mismatch', txn };
  }
  if (txn.status !== 'pending') return { result: 'duplicate', txn };                       // callback gửi lặp

  const gw = { ...(txn.gateway || {}), ...(gateway || {}) };
  const toSet = Object.fromEntries(Object.entries(gw).filter(([, v]) => v !== undefined).map(([k, v]) => [`gateway.${k}`, v]));

  if (outcome === 'pending') {
    await Transaction.updateOne({ _id: txn._id, status: 'pending' }, { $set: toSet });
    return { result: 'pending', txn };
  }

  const now = new Date();
  if (outcome === 'success') {
    const claimed = await Transaction.findOneAndUpdate(
      { _id: txn._id, status: 'pending' }, { $set: { ...toSet, status: 'success', paidAt: now } }, { new: true },
    );
    if (!claimed) return { result: 'duplicate', txn };
    const order = await Order.findOneAndUpdate(
      { _id: txn.orderId, status: 'pending_payment' },
      { $set: { status: 'confirmed', paymentStatus: 'paid', paidAt: now, paymentMethod: txn.method }, $push: { statusHistory: { status: 'confirmed', changedAt: now, note: 'Đã thanh toán online' } } },
      { new: true },
    );
    if (!order) {
      // Tiền đã về nhưng đơn không còn chờ thanh toán (đã hết hạn/hoàn kho hoặc đã được trả bởi giao dịch khác): cần admin xử lý (UC-41.4)
      await Transaction.updateOne({ _id: txn._id }, { $set: { failureReason: 'Thanh toán thành công nhưng đơn không còn ở trạng thái chờ thanh toán, cần quản trị viên xử lý/hoàn tiền' } });
      const now2 = await Order.findById(txn.orderId).select('status').lean();
      await raiseSystemIssue(txn.orderId, `Đã nhận thanh toán ${txn.amount}đ (mã ${txnRef}) nhưng đơn đang ở trạng thái "${now2 ? now2.status : 'không xác định'}", không còn chờ thanh toán. Cần liên hệ khách và hoàn tiền hoặc xác nhận đơn.`);
      return { result: 'late_success', txn: claimed };
    }
    return { result: 'success', txn: claimed, order };
  }

  // failed: đóng giao dịch; đơn vẫn chờ thanh toán (giữ hàng) để khách thử lại hoặc đổi cổng cho đến khi hết hạn
  const claimed = await Transaction.findOneAndUpdate(
    { _id: txn._id, status: 'pending' }, { $set: { ...toSet, status: 'failed', failureReason: reason || 'Thanh toán không thành công' } }, { new: true },
  );
  if (!claimed) return { result: 'duplicate', txn };
  const order = await Order.findOneAndUpdate({ _id: txn.orderId, status: 'pending_payment' }, { $set: { paymentStatus: 'failed' } }, { new: true });
  return { result: 'failed', txn: claimed, order };
}

module.exports = { startOnlinePayment, applyGatewayResult, expireStaleOrders, startExpiryJob, expiresAtOf, ttlMs };
