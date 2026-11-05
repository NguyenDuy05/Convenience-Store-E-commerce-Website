// Tích hợp VNPay (sandbox/production), API phiên bản 2.1.0, ký HMAC-SHA512.
// Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
const crypto = require('crypto');

const cfg = () => ({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secret: process.env.VNPAY_HASH_SECRET,
  url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: process.env.VNPAY_RETURN_URL || `http://localhost:${process.env.PORT || 5000}/api/payments/vnpay/return`,
});

exports.isConfigured = () => !!(cfg().tmnCode && cfg().secret);

// Giờ Việt Nam (GMT+7) dạng yyyyMMddHHmmss, không phụ thuộc múi giờ máy chủ
const vnTime = (date) => new Date(date.getTime() + 7 * 3600 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);

// Sắp xếp theo tên tham số + mã hóa giá trị (khoảng trắng -> '+'), đúng cách VNPay ký
const canonical = (params) => Object.keys(params).sort()
  .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`).join('&');

const sign = (params, secret) => crypto.createHmac('sha512', secret).update(Buffer.from(canonical(params), 'utf-8')).digest('hex');

// Bỏ dấu tiếng Việt: vnp_OrderInfo không nên chứa ký tự đặc biệt
const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9 ]/g, ' ');

// Tạo URL chuyển khách sang trang thanh toán VNPay
exports.createPaymentUrl = ({ txnRef, amount, ipAddr, orderInfo, createdAt = new Date(), expireAt }) => {
  const { tmnCode, secret, url, returnUrl } = cfg();
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(amount) * 100,           // VNPay yêu cầu nhân 100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: plain(orderInfo || `Thanh toan don hang ${txnRef}`),
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: vnTime(createdAt),
  };
  if (expireAt) params.vnp_ExpireDate = vnTime(expireAt);
  params.vnp_SecureHash = sign(params, secret);
  const { vnp_SecureHash, ...rest } = params;
  return `${url}?${canonical(rest)}&vnp_SecureHash=${vnp_SecureHash}`;
};

const OUTCOME_PENDING = ['07']; // "Trừ tiền thành công nhưng giao dịch bị nghi ngờ": chờ rà soát, chưa xác nhận đơn

// Kiểm tra chữ ký của dữ liệu VNPay gửi về (return hoặc IPN) TRƯỚC khi tin kết quả.
// Trả { valid, txnRef, amount, outcome: 'success'|'failed'|'pending', gateway }.
exports.verifyCallback = (query) => {
  const { secret } = cfg();
  const { vnp_SecureHash: received, vnp_SecureHashType, ...params } = query || {};
  if (!secret || !received) return { valid: false };
  const expected = sign(params, secret);
  const a = Buffer.from(String(received).toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) return { valid: false };

  const code = params.vnp_ResponseCode;
  let outcome = 'failed';
  if (code === '00' && (params.vnp_TransactionStatus === undefined || params.vnp_TransactionStatus === '00')) outcome = 'success';
  else if (OUTCOME_PENDING.includes(code)) outcome = 'pending';
  return {
    valid: true,
    txnRef: params.vnp_TxnRef,
    amount: Number(params.vnp_Amount) / 100,
    outcome,
    gateway: {
      provider: 'vnpay',
      transactionNo: params.vnp_TransactionNo,
      responseCode: code,
      bankCode: params.vnp_BankCode,
      payDate: /^\d{14}$/.test(params.vnp_PayDate || '') ? new Date(Date.UTC(
        +params.vnp_PayDate.slice(0, 4), +params.vnp_PayDate.slice(4, 6) - 1, +params.vnp_PayDate.slice(6, 8),
        +params.vnp_PayDate.slice(8, 10) - 7, +params.vnp_PayDate.slice(10, 12), +params.vnp_PayDate.slice(12, 14),
      )) : undefined,
      raw: params,
    },
    reason: outcome === 'success' ? undefined : `VNPay mã lỗi ${code}`,
  };
};

// Dùng cho test
exports._sign = (params, secret) => sign(params, secret);
