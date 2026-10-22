const router = require('express').Router();
const c = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-09.1 Create Order
router.post('/', authenticate, authorize('customer'), c.createOrder);
// UC-09.1 View Orders
router.get('/my', authenticate, authorize('customer'), c.listMyOrders);
// UC-09.4 View Order History (đặt trước '/my/:id' để 'history' không bị hiểu là id)
router.get('/my/history', authenticate, authorize('customer'), c.listMyOrderHistory);
// UC-09.3 Track Order Status
router.get('/my/:id/tracking', authenticate, authorize('customer'), c.trackMyOrder);
// UC-09.2 View Order Details
router.get('/my/:id', authenticate, authorize('customer'), c.getMyOrder);
// UC-22 Create Store Order
router.post('/store', authenticate, authorize('staff'), c.createStoreOrder);
// UC-35.1, 35.2 View / Search Orders
router.get('/', authenticate, authorize('admin'), c.listOrders);
// UC-35.3 View Order Details
router.get('/:id', authenticate, authorize('admin'), c.getOrder);
// Chuyển trạng thái đơn: preparing, ready_for_pickup, completed
router.patch('/:id/status', authenticate, authorize('admin'), c.updateOrderStatus);
// UC-35.4 Handle Order Issue
router.post('/:id/issues', authenticate, authorize('admin'), c.handleOrderIssue);

module.exports = router;
