const crypto = require('crypto');

// Cổng thanh toán giả lập có đang bật không (PAYMENT_MOCK=true, không phải production)
exports.enabled = () => process.env.PAYMENT_MOCK === 'true' && process.env.NODE_ENV !== 'production';

// Địa chỉ backend dùng trong link thanh toán giả lập
const backendUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// Ký kết quả giả lập để không ai tự gõ URL "thanh toán thành công"
const sign = (txnRef, result) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(`${txnRef}|${result}`).digest('hex');
exports.sign = sign;
// Kiểm tra chữ ký kết quả giả lập
exports.verify = (txnRef, result, sig) => {
  const expected = sign(txnRef, result);
  return typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

// Tạo link tới trang thanh toán giả lập
exports.createPaymentUrl = (txnRef) => `${backendUrl()}/api/payments/mock/pay?txnRef=${encodeURIComponent(txnRef)}`;
// Tạo link hoàn tất có chữ ký cho trang giả lập
exports.completeUrl = (txnRef, result) => `/api/payments/mock/complete?txnRef=${encodeURIComponent(txnRef)}&result=${result}&sig=${sign(txnRef, result)}`;
exports.RESULTS = ['success', 'failed', 'pending'];
