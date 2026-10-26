const router = require('express').Router();
const c = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-09.1 Create Order
router.post('/', authenticate, authorize('customer'), c.createOrder);
// UC-10.1, 10.4 View Orders / Order History
router.get('/my', authenticate, authorize('customer'), c.listMyOrders);
// UC-10.2, 10.3 View Order Details / Track Order Status
router.get('/my/:id', authenticate, authorize('customer'), c.getMyOrder);
// UC-21 Create Store Order (báo giá/kiểm tra từng dòng, rồi tạo đơn)
router.post('/store/quote', authenticate, authorize('staff'), c.quoteStoreOrder);
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
