const router = require('express').Router();
const c = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

router.get('/product/:productId', asyncHandler(c.listProductReviews));
router.get('/store', asyncHandler(c.listStoreReviews));
router.get('/mine/eligible', authenticate, authorize('customer'), asyncHandler(c.listEligibleReviews));
router.get('/mine', authenticate, authorize('customer'), asyncHandler(c.listMyReviews));
router.post('/', authenticate, authorize('customer'), asyncHandler(c.addReview));
router.put('/:id', authenticate, authorize('customer'), asyncHandler(c.updateReview));
router.delete('/:id', authenticate, authorize('customer'), asyncHandler(c.deleteReview));
router.get('/admin/all', authenticate, authorize('admin'), asyncHandler(c.listReviewsAdmin));
router.patch('/:id/hide', authenticate, authorize('admin'), asyncHandler(c.hideReview));
router.patch('/:id/violation', authenticate, authorize('admin'), asyncHandler(c.handleViolatingReview));

module.exports = router;
