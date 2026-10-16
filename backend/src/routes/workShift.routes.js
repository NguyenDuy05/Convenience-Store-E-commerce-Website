const router = require('express').Router();
const c = require('../controllers/workShift.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-25 Manage Work Shift (catalog chưa mô tả chi tiết)
router.get('/my', authenticate, authorize('staff'), c.listMyShifts);
// UC-25 Manage Work Shift (vào ca)
router.post('/clock-in', authenticate, authorize('staff'), c.clockIn);
// UC-25 Manage Work Shift (ra ca)
router.post('/clock-out', authenticate, authorize('staff'), c.clockOut);

module.exports = router;
