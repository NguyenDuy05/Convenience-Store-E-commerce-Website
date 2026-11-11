const router = require('express').Router();
const c = require('../controllers/discountCode.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Khách xem kho voucher còn dùng được
router.get('/available', authenticate, authorize('customer'), c.listAvailableDiscountCodes);
router.post('/validate', authenticate, authorize('customer'), c.validateDiscountCode);
router.get('/', authenticate, authorize('admin'), c.listDiscountCodes);
router.post('/', authenticate, authorize('admin'), c.createDiscountCode);
router.put('/:id', authenticate, authorize('admin'), c.updateDiscountCode);
router.patch('/:id/activate', authenticate, authorize('admin'), c.activateDiscountCode);
router.patch('/:id/suspend', authenticate, authorize('admin'), c.suspendDiscountCode);
router.delete('/:id', authenticate, authorize('admin'), c.deleteDiscountCode);

module.exports = router;
