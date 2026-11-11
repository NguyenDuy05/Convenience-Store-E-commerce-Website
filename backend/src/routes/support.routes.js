const router = require('express').Router();
const c = require('../controllers/support.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/', authenticate, authorize('customer'), c.submitSupportRequest);
router.get('/my', authenticate, authorize('customer'), c.listMySupportRequests);
router.get('/', authenticate, authorize('staff', 'admin'), c.listSupportRequests);
router.get('/:id', authenticate, authorize('customer', 'staff', 'admin'), c.getSupportRequest);
router.patch('/:id/handle', authenticate, authorize('staff', 'admin'), c.handleComplaint);

module.exports = router;
