const router = require('express').Router();
const c = require('../controllers/category.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/', optionalAuth, c.listCategories);
router.post('/', authenticate, authorize('admin'), c.createCategory);
router.put('/:id', authenticate, authorize('admin'), c.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), c.deleteCategory);

module.exports = router;
