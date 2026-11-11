const router = require('express').Router();
const c = require('../controllers/promotion.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', c.listPromotions);
router.post('/apply', authenticate, authorize('staff'), c.applyPromotion);
router.get('/manage', authenticate, authorize('admin'), c.listAllPromotions);
router.post('/', authenticate, authorize('admin'), c.createPromotion);
router.put('/:id', authenticate, authorize('admin'), c.updatePromotion);
router.patch('/:id/activate', authenticate, authorize('admin'), c.activatePromotion);
router.patch('/:id/suspend', authenticate, authorize('admin'), c.suspendPromotion);
router.delete('/:id', authenticate, authorize('admin'), c.deletePromotion);

module.exports = router;
