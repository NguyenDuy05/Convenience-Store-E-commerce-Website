const router = require('express').Router();
const c = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const staff = require('../controllers/staffOrder.controller');

// UC-08.1 Create Order (xem trước đơn rồi đặt hàng)
router.post('/preview', authenticate, authorize('customer'), c.previewCheckout);
router.post('/', authenticate, authorize('customer'), c.createOrder);
// UC-09.1 View Orders
router.get('/my', authenticate, authorize('customer'), c.listMyOrders);
// UC-09.4 View Order History (đặt trước '/my/:id' để 'history' không bị hiểu là id)
router.get('/my/history', authenticate, authorize('customer'), c.listMyOrderHistory);
// UC-09.3 Track Order Status
router.get('/my/:id/tracking', authenticate, authorize('customer'), c.trackMyOrder);
// UC-09.2 View Order Details
router.post('/my/:id/cancel', authenticate, authorize('customer'), c.cancelOrder);
router.get('/my/:id', authenticate, authorize('customer'), c.getMyOrder);
// UC-22 Create Store Order
router.post('/store/quote', authenticate, authorize('staff'), c.quoteStoreOrder);
router.post('/store', authenticate, authorize('staff'), c.createStoreOrder);
router.post('/store/checkout', authenticate, authorize('staff'), c.checkoutStoreSale);
router.get('/staff', authenticate, authorize('staff'), staff.list);
router.get('/staff/:id', authenticate, authorize('staff'), staff.get);
router.patch('/staff/:id/status', authenticate, authorize('staff'), c.updateOrderStatus);
// Staff hủy đơn đang xử lý (kể cả sau khi đã nhận/chuẩn bị). Khách chỉ hủy được trước khi staff bắt đầu chuẩn bị.
router.post('/staff/:id/cancel', authenticate, authorize('staff'), c.cancelOrder);

router.get('/refunds', authenticate, authorize('admin'), c.listRefunds);
// UC-34.1 View Orders, UC-34.2 Search Orders (query: q, status, source, paymentStatus, paymentMethod, from, to, hasIssue, sort, page, limit)
router.get('/', authenticate, authorize('admin'), c.listOrders);
// UC-34.3 View Order Details
router.get('/:id', authenticate, authorize('admin'), c.getOrder);
// Chuyển trạng thái đơn: preparing, ready_for_pickup, completed
router.patch('/:id/status', authenticate, authorize('admin'), c.updateOrderStatus);
// UC-34.4 Handle Order Issue: báo sự cố (POST) rồi xử lý xong (PATCH)
router.post('/:id/cancel', authenticate, authorize('admin'), c.cancelOrder);
router.post('/:id/issues', authenticate, authorize('admin'), c.handleOrderIssue);
router.patch('/:id/issues/:issueId', authenticate, authorize('admin'), c.resolveOrderIssue);

module.exports = router;
