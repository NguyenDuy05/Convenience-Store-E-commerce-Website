const router = require('express').Router();
const c = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-19.1 View Customers (staff, admin; staff chỉ thấy thông tin đã che bớt)
router.get('/', authenticate, authorize('staff', 'admin'), c.listCustomers);
// Đăng ký thành viên tại quầy + tìm thành viên khi bán hàng (đặt trước '/:id')
router.post('/members', authenticate, authorize('staff', 'admin'), c.registerMember);
router.get('/members/lookup', authenticate, authorize('staff', 'admin'), c.findMember);
// UC-19.2 View Customer Details
router.get('/:id', authenticate, authorize('staff', 'admin'), c.getCustomer);
// UC-29.4 Update Customer
router.put('/:id', authenticate, authorize('admin'), c.updateCustomer);
// UC-29.5 Unlock Customer Account
router.patch('/:id/unlock', authenticate, authorize('admin'), c.unlockCustomer);
// UC-29.6 Delete Customer Account
router.delete('/:id', authenticate, authorize('admin'), c.deleteCustomer);

module.exports = router;
