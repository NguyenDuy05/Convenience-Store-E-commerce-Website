const router = require('express').Router();
const c = require('../controllers/cart.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-08.1 View Cart
router.get('/', authenticate, authorize('customer'), c.getCart);
// UC-08.2 Add Product
router.post('/items', authenticate, authorize('customer'), c.addCartItem);
// UC-08.3 Update Cart Item
router.put('/items/:productId', authenticate, authorize('customer'), c.updateCartItem);
// UC-08.4 Remove Cart Item
router.delete('/items/:productId', authenticate, authorize('customer'), c.removeCartItem);
// Tính năng đặc biệt: 4 giỏ hàng gợi ý theo ngân sách (ngoài catalog UC)
router.get('/suggestions', authenticate, authorize('customer'), c.getCartSuggestions);

module.exports = router;
