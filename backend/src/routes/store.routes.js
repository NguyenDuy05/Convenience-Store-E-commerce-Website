const router = require('express').Router();
const c = require('../controllers/store.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', c.listStores);
router.post('/', authenticate, authorize('admin'), c.addStore);
router.put('/:id', authenticate, authorize('admin'), c.updateStore);
router.patch('/:id/close', authenticate, authorize('admin'), c.closeStore);
router.patch('/:id/open', authenticate, authorize('admin'), c.openStore);
router.put('/:id/hours', authenticate, authorize('admin'), c.updateStoreHours);

module.exports = router;
