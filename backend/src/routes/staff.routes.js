const router = require('express').Router();
const c = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('admin'), c.listStaff);
router.post('/', authenticate, authorize('admin'), c.addStaff);
router.put('/:id', authenticate, authorize('admin'), c.updateStaff);
router.patch('/:id/lock', authenticate, authorize('admin'), c.lockStaff);
router.patch('/:id/unlock', authenticate, authorize('admin'), c.unlockStaff);
router.get('/:id', authenticate, authorize('admin'), c.getStaff);
router.get('/:id/orders', authenticate, authorize('admin'), c.getStaffOrders);
router.get('/:id/activity', authenticate, authorize('admin'), c.getStaffActivity);

module.exports = router;
