// Cổng thanh toán GIẢ LẬP để test luồng thanh toán khi chưa có tài khoản sandbox VNPay/MoMo.
// Chỉ bật khi PAYMENT_MOCK=true và không chạy production. Kết quả vẫn đi qua đúng hàm xử lý như cổng thật.
const crypto = require('crypto');

exports.enabled = () => process.env.PAYMENT_MOCK === 'true' && process.env.NODE_ENV !== 'production';

const backendUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// Chữ ký để không ai tự gõ URL "thanh toán thành công" khi chưa qua trang giả lập
const sign = (txnRef, result) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(`${txnRef}|${result}`).digest('hex');
exports.sign = sign;
exports.verify = (txnRef, result, sig) => {
  const expected = sign(txnRef, result);
  return typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

exports.createPaymentUrl = (txnRef) => `${backendUrl()}/api/payments/mock/pay?txnRef=${encodeURIComponent(txnRef)}`;
exports.completeUrl = (txnRef, result) => `/api/payments/mock/complete?txnRef=${encodeURIComponent(txnRef)}&result=${result}&sig=${sign(txnRef, result)}`;
exports.RESULTS = ['success', 'failed', 'pending'];
