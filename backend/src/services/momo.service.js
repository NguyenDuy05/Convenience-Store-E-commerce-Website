// Tích hợp MoMo (test/production), phương thức captureWallet, ký HMAC-SHA256.
// Tài liệu: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
const crypto = require('crypto');

const cfg = () => ({
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL || `http://localhost:${process.env.PORT || 5000}/api/payments/momo/return`,
  ipnUrl: process.env.MOMO_IPN_URL || `http://localhost:${process.env.PORT || 5000}/api/payments/momo/ipn`,
});

exports.isConfigured = () => !!(cfg().partnerCode && cfg().accessKey && cfg().secretKey);

const hmac = (raw, secret) => crypto.createHmac('sha256', secret).update(raw).digest('hex');

// MoMo: 0 thành công; các mã dưới là "đang xử lý / chờ xác nhận"; còn lại là thất bại
const PENDING_CODES = [1000, 7000, 7002, 9000];

// Tạo yêu cầu thanh toán, trả { payUrl }. Ném lỗi nếu MoMo từ chối / không phản hồi (chưa có khoản tiền nào bị trừ).
exports.createPayment = async ({ txnRef, amount, orderInfo, expireMinutes }) => {
  const { partnerCode, accessKey, secretKey, endpoint, redirectUrl, ipnUrl } = cfg();
  const body = {
    partnerCode,
    requestId: txnRef,
    amount: Math.round(amount),
    orderId: txnRef,
    orderInfo: orderInfo || `Thanh toan don hang ${txnRef}`,
    redirectUrl,
    ipnUrl,
    requestType: 'captureWallet',
    extraData: '',
    lang: 'vi',
    autoCapture: true,
    ...(expireMinutes ? { orderExpireTime: Math.max(1, Math.ceil(expireMinutes)) } : {}),
  };
  const raw = `accessKey=${accessKey}&amount=${body.amount}&extraData=${body.extraData}&ipnUrl=${ipnUrl}&orderId=${body.orderId}`
    + `&orderInfo=${body.orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${body.requestId}&requestType=${body.requestType}`;
  body.signature = hmac(raw, secretKey);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    const data = await res.json();
    if (data.resultCode !== 0 || !data.payUrl) throw new Error(`MoMo từ chối (mã ${data.resultCode}): ${data.message || ''}`);
    return { payUrl: data.payUrl };
  } finally {
    clearTimeout(timer);
  }
};

// Kiểm tra chữ ký của IPN (body JSON) hoặc return (query) do MoMo gửi, TRƯỚC khi tin kết quả.
exports.verifyCallback = (data) => {
  const { accessKey, secretKey } = cfg();
  const d = data || {};
  if (!secretKey || !d.signature) return { valid: false };
  const raw = `accessKey=${accessKey}&amount=${d.amount}&extraData=${d.extraData ?? ''}&message=${d.message ?? ''}&orderId=${d.orderId}`
    + `&orderInfo=${d.orderInfo ?? ''}&orderType=${d.orderType ?? ''}&partnerCode=${d.partnerCode}&payType=${d.payType ?? ''}`
    + `&requestId=${d.requestId}&responseTime=${d.responseTime}&resultCode=${d.resultCode}&transId=${d.transId ?? ''}`;
  const expected = hmac(raw, secretKey);
  const a = Buffer.from(String(d.signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };

  const code = Number(d.resultCode);
  const outcome = code === 0 ? 'success' : PENDING_CODES.includes(code) ? 'pending' : 'failed';
  return {
    valid: true,
    txnRef: d.orderId,
    amount: Number(d.amount),
    outcome,
    gateway: {
      provider: 'momo',
      transactionNo: d.transId !== undefined ? String(d.transId) : undefined,
      responseCode: String(d.resultCode),
      payDate: d.responseTime ? new Date(Number(d.responseTime)) : undefined,
      raw: d,
    },
    reason: outcome === 'success' ? undefined : `MoMo mã lỗi ${d.resultCode}: ${d.message || ''}`,
  };
};

exports._hmac = hmac;
