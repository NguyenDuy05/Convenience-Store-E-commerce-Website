const router = require('express').Router();
const c = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('staff', 'admin'), c.listCustomers);
router.post('/members', authenticate, authorize('staff', 'admin'), c.registerMember);
router.get('/members/lookup', authenticate, authorize('staff', 'admin'), c.findMember);
router.get('/:id', authenticate, authorize('staff', 'admin'), c.getCustomer);
router.put('/:id', authenticate, authorize('admin'), c.updateCustomer);
router.patch('/:id/unlock', authenticate, authorize('admin'), c.unlockCustomer);
router.delete('/:id', authenticate, authorize('admin'), c.deleteCustomer);

module.exports = router;
