const router = require('express').Router();
const c = require('../controllers/category.controller');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

// UC-33.1 View Categories (dùng chung cho menu Guest/Customer)
router.get('/', optionalAuth, c.listCategories);
// UC-33.2 Add Category
router.post('/', authenticate, authorize('admin'), c.createCategory);
// UC-33.3 Update Category
router.put('/:id', authenticate, authorize('admin'), c.updateCategory);
// UC-33.4 Delete Category
router.delete('/:id', authenticate, authorize('admin'), c.deleteCategory);

module.exports = router;
