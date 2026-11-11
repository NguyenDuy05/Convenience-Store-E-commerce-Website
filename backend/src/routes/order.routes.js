const router = require('express').Router();
const c = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const staff = require('../controllers/staffOrder.controller');

router.post('/preview', authenticate, authorize('customer'), c.previewCheckout);
router.post('/', authenticate, authorize('customer'), c.createOrder);
router.get('/my', authenticate, authorize('customer'), c.listMyOrders);
router.get('/my/history', authenticate, authorize('customer'), c.listMyOrderHistory);
router.get('/my/:id/tracking', authenticate, authorize('customer'), c.trackMyOrder);
router.post('/my/:id/cancel', authenticate, authorize('customer'), c.cancelOrder);
router.get('/my/:id', authenticate, authorize('customer'), c.getMyOrder);
router.post('/store/quote', authenticate, authorize('staff'), c.quoteStoreOrder);
router.post('/store', authenticate, authorize('staff'), c.createStoreOrder);
router.post('/store/checkout', authenticate, authorize('staff'), c.checkoutStoreSale);
router.get('/staff', authenticate, authorize('staff'), staff.list);
router.get('/staff/:id', authenticate, authorize('staff'), staff.get);
router.patch('/staff/:id/status', authenticate, authorize('staff'), c.updateOrderStatus);
router.post('/staff/:id/cancel', authenticate, authorize('staff'), c.cancelOrder);

router.get('/refunds', authenticate, authorize('admin'), c.listRefunds);
router.get('/', authenticate, authorize('admin'), c.listOrders);
router.get('/:id', authenticate, authorize('admin'), c.getOrder);
router.patch('/:id/status', authenticate, authorize('admin'), c.updateOrderStatus);
router.post('/:id/cancel', authenticate, authorize('admin'), c.cancelOrder);
router.post('/:id/issues', authenticate, authorize('admin'), c.handleOrderIssue);
router.patch('/:id/issues/:issueId', authenticate, authorize('admin'), c.resolveOrderIssue);

module.exports = router;
