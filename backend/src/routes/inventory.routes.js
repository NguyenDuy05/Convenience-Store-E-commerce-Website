const router = require('express').Router();
const c = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('staff', 'admin'), c.listInventory);
router.post('/receive', authenticate, authorize('staff'), c.receiveStock);
router.post('/adjust', authenticate, authorize('staff', 'admin'), c.adjustInventory);
router.get('/stocktakes', authenticate, authorize('staff', 'admin'), c.listStocktakes);
router.post('/stocktakes', authenticate, authorize('staff', 'admin'), c.createStocktake);
router.patch('/stocktakes/:id/complete', authenticate, authorize('staff', 'admin'), c.completeStocktake);
router.get('/product/:productId', authenticate, authorize('staff', 'admin'), c.getProductStock);
router.get('/low-stock', authenticate, authorize('staff', 'admin'), c.listLowStock);
router.get('/expired', authenticate, authorize('staff', 'admin'), c.listExpired);
router.get('/out-of-stock', authenticate, authorize('admin'), c.listOutOfStock);
router.get('/damaged', authenticate, authorize('staff', 'admin'), c.listDamaged);
router.post('/damaged', authenticate, authorize('staff', 'admin'), c.recordDamaged);
router.get('/history', authenticate, authorize('admin'), c.getInventoryHistory);

module.exports = router;
