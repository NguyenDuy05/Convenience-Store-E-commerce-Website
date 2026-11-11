const router = require('express').Router();
const c = require('../controllers/cart.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('customer'), c.getCart);
router.post('/items', authenticate, authorize('customer'), c.addCartItem);
router.put('/items/:productId', authenticate, authorize('customer'), c.updateCartItem);
router.delete('/items/:productId', authenticate, authorize('customer'), c.removeCartItem);
router.get('/suggestions', authenticate, authorize('customer'), c.getCartSuggestions);

module.exports = router;
