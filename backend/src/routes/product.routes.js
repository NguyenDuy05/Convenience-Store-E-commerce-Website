const router = require('express').Router();
const c = require('../controllers/product.controller');
const { optionalAuth, authenticate, authorize } = require('../middlewares/auth.middleware');

const images = require('../services/productImages.service');
router.get('/image-library', authenticate, authorize('staff', 'admin'), (req, res) => res.json({ items: images.list() }));
router.use('/images/file', require('express').static(images.directory, { dotfiles: 'deny', setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff') }));
router.get('/', optionalAuth, c.listProducts);
router.get('/:id', optionalAuth, c.getProduct);
router.post('/', authenticate, authorize('staff', 'admin'), c.createProduct);
router.put('/:id', authenticate, authorize('staff', 'admin'), c.updateProduct);
router.patch('/:id/price', authenticate, authorize('admin'), c.updateProductPrice);
router.patch('/:id/activate', authenticate, authorize('admin'), c.activateProduct);
router.patch('/:id/deactivate', authenticate, authorize('admin'), c.deactivateProduct);
router.delete('/:id', authenticate, authorize('staff', 'admin'), c.deleteProduct);

module.exports = router;
