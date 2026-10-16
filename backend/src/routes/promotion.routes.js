const router = require('express').Router();
const c = require('../controllers/promotion.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-02.4, 21.1 View Promotions (đang hoạt động)
router.get('/', c.listPromotions);
// UC-21.2 Apply Promotion
router.post('/apply', authenticate, authorize('staff'), c.applyPromotion);
// UC-37.1 View Promotions (tất cả trạng thái)
router.get('/manage', authenticate, authorize('admin'), c.listAllPromotions);
// UC-37.2 Create Promotion
router.post('/', authenticate, authorize('admin'), c.createPromotion);
// UC-37.3 Update Promotion
router.put('/:id', authenticate, authorize('admin'), c.updatePromotion);
// UC-37.4 Activate Promotion
router.patch('/:id/activate', authenticate, authorize('admin'), c.activatePromotion);
// UC-37.5 Suspend Promotion
router.patch('/:id/suspend', authenticate, authorize('admin'), c.suspendPromotion);
// UC-37.6 Delete Promotion
router.delete('/:id', authenticate, authorize('admin'), c.deletePromotion);

module.exports = router;
