const router = require('express').Router();
const c = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-20.1, 29.1, 29.2 View / Search Customers
router.get('/', authenticate, authorize('staff', 'admin'), c.listCustomers);
// UC-20.2, 29.3 View Customer Details
router.get('/:id', authenticate, authorize('staff', 'admin'), c.getCustomer);
// UC-29.4 Update Customer
router.put('/:id', authenticate, authorize('admin'), c.updateCustomer);
// UC-29.5 Unlock Customer Account
router.patch('/:id/unlock', authenticate, authorize('admin'), c.unlockCustomer);
// UC-29.6 Delete Customer Account
router.delete('/:id', authenticate, authorize('admin'), c.deleteCustomer);

module.exports = router;
