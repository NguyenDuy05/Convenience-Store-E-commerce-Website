const router = require('express').Router();
const c = require('../controllers/discountCode.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Kiểm tra mã giảm giá khi checkout (ngoài catalog UC)
router.post('/validate', authenticate, authorize('customer'), c.validateDiscountCode);
// UC-38.1 View Discount Codes
router.get('/', authenticate, authorize('admin'), c.listDiscountCodes);
// UC-38.2 Create Discount Code
router.post('/', authenticate, authorize('admin'), c.createDiscountCode);
// UC-38.3 Update Discount Code
router.put('/:id', authenticate, authorize('admin'), c.updateDiscountCode);
// UC-38.4 Activate Discount Code
router.patch('/:id/activate', authenticate, authorize('admin'), c.activateDiscountCode);
// UC-38.5 Suspend Discount Code
router.patch('/:id/suspend', authenticate, authorize('admin'), c.suspendDiscountCode);
// UC-38.6 Delete Discount Code
router.delete('/:id', authenticate, authorize('admin'), c.deleteDiscountCode);

module.exports = router;
