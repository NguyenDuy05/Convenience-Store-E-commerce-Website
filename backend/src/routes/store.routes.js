const router = require('express').Router();
const c = require('../controllers/store.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-31.1 View Stores
router.get('/', c.listStores);
// UC-31.2 Add Store
router.post('/', authenticate, authorize('admin'), c.addStore);
// UC-31.3 Update Store
router.put('/:id', authenticate, authorize('admin'), c.updateStore);
// UC-31.4 Close Store
router.patch('/:id/close', authenticate, authorize('admin'), c.closeStore);
// UC-31.5 Open Store
router.patch('/:id/open', authenticate, authorize('admin'), c.openStore);
// UC-31.6 Update Store Hours
router.put('/:id/hours', authenticate, authorize('admin'), c.updateStoreHours);

module.exports = router;
