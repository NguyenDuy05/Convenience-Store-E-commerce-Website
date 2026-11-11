const router = require('express').Router();
const c = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/online', authenticate, authorize('customer'), c.createOnlinePayment);
router.get('/vnpay/return', c.vnpayReturn);
router.get('/vnpay/mobile-return', c.vnpayMobileReturn);
router.get('/vnpay/ipn', c.vnpayIpn);
router.get('/mock/pay', c.mockPay);
router.get('/mock/complete', c.mockComplete);
router.get('/orders', authenticate, authorize('staff'), c.listStoreOrdersToPay);

router.get('/receipt/:orderId', authenticate, authorize('staff', 'admin'), c.getReceipt);

router.post('/cash', authenticate, authorize('staff'), c.processCashPayment);
router.post('/card', authenticate, authorize('staff'), c.processCardPayment);
router.get('/admin', authenticate, authorize('admin'), c.listPayments);
router.get('/admin/failed', authenticate, authorize('admin'), c.listFailedPayments);
router.get('/admin/pending', authenticate, authorize('admin'), c.listPendingPayments);
router.patch('/admin/:id/resolve', authenticate, authorize('admin'), c.handlePaymentError);

module.exports = router;
