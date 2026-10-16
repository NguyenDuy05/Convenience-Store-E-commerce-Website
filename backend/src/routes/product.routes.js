const router = require('express').Router();
const c = require('../controllers/product.controller');
const { optionalAuth, authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-02.1/02.3, 18.1/18.2, 32.1/32.2 View / Search Products
router.get('/', optionalAuth, c.listProducts);
// UC-02.2, 18.3, 32.3 View Product Details
router.get('/:id', optionalAuth, c.getProduct);
// UC-18.4, 32.4 Add Product
router.post('/', authenticate, authorize('staff', 'admin'), c.createProduct);
// UC-18.5, 32.5 Update Product
router.put('/:id', authenticate, authorize('staff', 'admin'), c.updateProduct);
// UC-32.6 Update Product Price
router.patch('/:id/price', authenticate, authorize('admin'), c.updateProductPrice);
// UC-32.8 Activate Product
router.patch('/:id/activate', authenticate, authorize('admin'), c.activateProduct);
// UC-32.9 Deactivate Product
router.patch('/:id/deactivate', authenticate, authorize('admin'), c.deactivateProduct);
// UC-18.6, 32.7 Delete Product
router.delete('/:id', authenticate, authorize('staff', 'admin'), c.deleteProduct);

module.exports = router;
