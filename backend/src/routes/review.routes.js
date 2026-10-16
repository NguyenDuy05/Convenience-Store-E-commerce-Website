const router = require('express').Router();
const c = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-40.1 View Product Reviews (hiển thị cho khách)
router.get('/product/:productId', c.listProductReviews);
// UC-40.2 View Store Reviews (hiển thị cho khách)
router.get('/store', c.listStoreReviews);
// UC-11.1 Add Review
router.post('/', authenticate, authorize('customer'), c.addReview);
// UC-11.2 Update Review
router.put('/:id', authenticate, authorize('customer'), c.updateReview);
// UC-11.3 Delete Review
router.delete('/:id', authenticate, authorize('customer'), c.deleteReview);
// UC-40.1, 40.2 (gồm cả review bị ẩn)
router.get('/admin/all', authenticate, authorize('admin'), c.listReviewsAdmin);
// UC-40.3 Hide Review
router.patch('/:id/hide', authenticate, authorize('admin'), c.hideReview);
// UC-40.4 Handle Violating Review
router.patch('/:id/violation', authenticate, authorize('admin'), c.handleViolatingReview);

module.exports = router;
