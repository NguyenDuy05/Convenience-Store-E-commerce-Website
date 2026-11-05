const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/admin', authenticate, authorize('admin'), c.adminDashboard);
router.get('/staff', authenticate, authorize('staff', 'admin'), c.staffDashboard);

module.exports = router;