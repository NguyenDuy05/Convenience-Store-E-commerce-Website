const router = require('express').Router();
const c = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

// UC-40.1 View Product Reviews
router.get('/product/:productId', asyncHandler(c.listProductReviews));
// UC-40.2 View Store Reviews
router.get('/store', asyncHandler(c.listStoreReviews));
router.get('/mine/eligible', authenticate, authorize('customer'), asyncHandler(c.listEligibleReviews));
router.get('/mine', authenticate, authorize('customer'), asyncHandler(c.listMyReviews));
// UC-11.1 Add Review
router.post('/', authenticate, authorize('customer'), asyncHandler(c.addReview));
// UC-11.2 Update Review
router.put('/:id', authenticate, authorize('customer'), asyncHandler(c.updateReview));
// UC-11.3 Delete Review
router.delete('/:id', authenticate, authorize('customer'), asyncHandler(c.deleteReview));
// UC-40.1, 40.2 Admin review list, including hidden and deleted reviews
router.get('/admin/all', authenticate, authorize('admin'), asyncHandler(c.listReviewsAdmin));
// UC-40.3 Hide Review
router.patch('/:id/hide', authenticate, authorize('admin'), asyncHandler(c.hideReview));
// UC-40.4 Handle Violating Review
router.patch('/:id/violation', authenticate, authorize('admin'), asyncHandler(c.handleViolatingReview));

module.exports = router;
