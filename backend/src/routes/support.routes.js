const router = require('express').Router();
const c = require('../controllers/support.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-13.1 Submit Support Request
router.post('/', authenticate, authorize('customer'), c.submitSupportRequest);
// UC-13.2 View Support Request
router.get('/my', authenticate, authorize('customer'), c.listMySupportRequests);
// UC-20.3 Handle Customer Complaint (danh sách)
router.get('/', authenticate, authorize('staff', 'admin'), c.listSupportRequests);
// UC-20.3 Handle Customer Complaint
router.patch('/:id/handle', authenticate, authorize('staff', 'admin'), c.handleComplaint);

module.exports = router;
