const { notImplemented } = require('../utils/notImplemented');
const { Order, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const payment = require('../services/payment.service');
const vnpay = require('../services/vnpay.service');
const momo = require('../services/momo.service');
const mock = require('../services/mock.service');

const frontend = () => process.env.FRONTEND_URL || 'http://localhost:5173';
// Trang kết quả KHÔNG tin tham số trên URL: nó đọc lại trạng thái đơn từ server
const resultUrl = (orderId) => `${frontend()}/payment/result${orderId ? `?orderId=${orderId}` : '?error=unknown'}`;

const clientIp = (req) => {
  const raw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
  const ip = raw.replace(/^::ffff:/, '');
  return ip === '::1' ? '127.0.0.1' : ip;
};

// UC-08.2 Make Payment (catalog tài liệu; code cũ ghi UC-09.2): tạo link thanh toán VNPay/MoMo cho đơn đang chờ thanh toán.
// Body: { orderId, method: 'vnpay' | 'momo' }. Gọi lại khi còn giao dịch đang chờ cùng cổng -> trả lại đúng link cũ (không tạo giao dịch mới).
exports.createOnlinePayment = asyncHandler(async (req, res) => {
  const { orderId, method } = req.body;
  if (!orderId || !mongoose.isValidObjectId(orderId)) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  const order = await Order.findOne({ _id: orderId, customerId: req.user.id }).lean();
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  const out = await payment.startOnlinePayment({ order, method, ipAddr: clientIp(req) });
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

// MoMo gọi SERVER báo kết quả (IPN). Phản hồi HTTP 204 theo quy định MoMo.
exports.momoIpn = asyncHandler(async (req, res) => {
  const v = momo.verifyCallback(req.body);
  if (!v.valid) return res.status(400).json({ message: 'Invalid signature' });
  await applyVerified(v);
  res.status(204).end();
});

// MoMo chuyển TRÌNH DUYỆT của khách về đây (query có đủ tham số + chữ ký giống IPN)
exports.momoReturn = asyncHandler(async (req, res) => {
  const v = momo.verifyCallback(req.query);
  if (!v.valid) return res.redirect(`${frontend()}/payment/result?error=invalid_signature`);
  const r = await applyVerified(v);
  res.redirect(resultUrl(r.orderId));
});

// ---- Cổng giả lập (chỉ khi PAYMENT_MOCK=true) ----
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.mockPay = asyncHandler(async (req, res) => {
  if (!mock.enabled()) return res.status(404).json({ message: 'Không tìm thấy đường dẫn' });
  const txn = await Transaction.findOne({ txnRef: String(req.query.txnRef || '') }).lean();
  if (!txn) return res.status(404).send('Không tìm thấy giao dịch');
  const order = await Order.findById(txn.orderId).select('orderCode').lean();
  const btn = (result, label, color) => `<a href="${esc(mock.completeUrl(txn.txnRef, result))}" style="display:block;margin:10px 0;padding:14px;border-radius:10px;background:${color};color:#fff;text-decoration:none;font-weight:700;text-align:center">${label}</a>`;
  res.type('html').send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cổng thanh toán giả lập</title></head>
<body style="font-family:system-ui,sans-serif;background:#f3f2ff;margin:0;padding:24px">
<div style="max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 6px 18px rgba(25,36,78,.12)">
<p style="margin:0;font-size:12px;font-weight:700;color:#b45309;letter-spacing:.05em">CỔNG THANH TOÁN GIẢ LẬP (${esc(txn.method.toUpperCase())}) - CHỈ DÙNG ĐỂ TEST</p>
<h2 style="margin:12px 0 4px">Đơn ${esc(order ? order.orderCode : '')}</h2>
<p style="margin:0 0 4px;color:#555">Mã giao dịch: <b>${esc(txn.txnRef)}</b></p>
<p style="margin:0 0 20px;font-size:22px;font-weight:700">${new Intl.NumberFormat('vi-VN').format(txn.amount)} ₫</p>
${btn('success', 'Thanh toán thành công', '#356b0a')}${btn('failed', 'Thanh toán thất bại / hủy', '#ba1a1a')}${btn('pending', 'Đang chờ xác nhận (chưa có kết quả)', '#6f5d0e')}
</div></body></html>`);
});

exports.mockComplete = asyncHandler(async (req, res) => {
  if (!mock.enabled()) return res.status(404).json({ message: 'Không tìm thấy đường dẫn' });
  const { txnRef, result, sig } = req.query;
  if (!mock.RESULTS.includes(result) || !mock.verify(txnRef, result, sig)) return res.status(400).send('Yêu cầu không hợp lệ');
  const txn = await Transaction.findOne({ txnRef }).lean();
  if (!txn) return res.status(404).send('Không tìm thấy giao dịch');
  const r = await applyVerified({
    txnRef, amount: txn.amount, outcome: result,
    gateway: { provider: 'mock', transactionNo: `MOCK${Date.now()}`, responseCode: result === 'success' ? '00' : result === 'pending' ? '07' : '24' },
    reason: result === 'failed' ? 'Khách hủy / thanh toán thất bại (giả lập)' : undefined,
  });
  res.redirect(resultUrl(r.orderId || String(txn.orderId)));
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.processCashPayment = notImplemented('UC-23.1 Process Cash Payment');
exports.processCardPayment = notImplemented('UC-23.2 Process Card/E-wallet Payment');
exports.listPayments = notImplemented('UC-41.1 View Payment Transactions');
exports.listFailedPayments = notImplemented('UC-41.2 View Failed Payments');
exports.listPendingPayments = notImplemented('UC-41.3 View Pending Payments');
exports.handlePaymentError = notImplemented('UC-41.4 Handle Payment Error');
