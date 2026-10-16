const router = require('express').Router();
const c = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-30.1 View Staff
router.get('/', authenticate, authorize('admin'), c.listStaff);
// UC-30.2 Add Staff
router.post('/', authenticate, authorize('admin'), c.addStaff);
// UC-30.3 Update Staff
router.put('/:id', authenticate, authorize('admin'), c.updateStaff);
// UC-30.4 Lock Staff Account
router.patch('/:id/lock', authenticate, authorize('admin'), c.lockStaff);
// UC-30.5 Unlock Staff Account
router.patch('/:id/unlock', authenticate, authorize('admin'), c.unlockStaff);
// UC-30.6 View Staff Activity History
router.get('/:id/activity', authenticate, authorize('admin'), c.getStaffActivity);

module.exports = router;
