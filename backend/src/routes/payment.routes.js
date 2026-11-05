const router = require('express').Router();
const c = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-08.2 Make Payment (tạo link VNPay/Momo)
router.post('/online', authenticate, authorize('customer'), c.createOnlinePayment);
// VNPay chuyển hướng trình duyệt về sau khi thanh toán
router.get('/vnpay/return', c.vnpayReturn);
// VNPay gọi server báo kết quả (IPN)
router.get('/vnpay/ipn', c.vnpayIpn);
// Momo gọi server báo kết quả (IPN)
router.post('/momo/ipn', c.momoIpn);
// Momo chuyển hướng trình duyệt về sau khi thanh toán
router.get('/momo/return', c.momoReturn);
// Cổng thanh toán giả lập để test (chỉ khi PAYMENT_MOCK=true, controller tự chặn nếu tắt)
router.get('/mock/pay', c.mockPay);
router.get('/mock/complete', c.mockComplete);
// UC-23.1 Process Cash Payment
router.post('/cash', authenticate, authorize('staff'), c.processCashPayment);
// UC-23.2 Process Card/E-wallet Payment
router.post('/card', authenticate, authorize('staff'), c.processCardPayment);
// UC-41.1 View Payment Transactions
router.get('/admin', authenticate, authorize('admin'), c.listPayments);
// UC-41.2 View Failed Payments
router.get('/admin/failed', authenticate, authorize('admin'), c.listFailedPayments);
// UC-41.3 View Pending Payments
router.get('/admin/pending', authenticate, authorize('admin'), c.listPendingPayments);
// UC-41.4 Handle Payment Error
router.patch('/admin/:id/resolve', authenticate, authorize('admin'), c.handlePaymentError);

module.exports = router;
