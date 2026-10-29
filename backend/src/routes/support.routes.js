const router = require('express').Router();
const c = require('../controllers/support.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-12.1 Submit Support Request
router.post('/', authenticate, authorize('customer'), c.submitSupportRequest);
// UC-12.2 View Support Request
router.get('/my', authenticate, authorize('customer'), c.listMySupportRequests);
// UC-19.3 Handle Customer Complaint: danh sách, xem chi tiết (đặt sau '/my' để 'my' không bị hiểu là id), xử lý
router.get('/', authenticate, authorize('staff', 'admin'), c.listSupportRequests);
router.get('/:id', authenticate, authorize('customer', 'staff', 'admin'), c.getSupportRequest);
router.patch('/:id/handle', authenticate, authorize('staff', 'admin'), c.handleComplaint);

module.exports = router;
