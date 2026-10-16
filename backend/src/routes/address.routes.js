const router = require('express').Router();
const c = require('../controllers/address.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-07.1 View Addresses
router.get('/', authenticate, authorize('customer'), c.listAddresses);
// UC-07.2 Add Address
router.post('/', authenticate, authorize('customer'), c.addAddress);
// UC-07.3 Update Address
router.put('/:id', authenticate, authorize('customer'), c.updateAddress);
// UC-07.4 Delete Address
router.delete('/:id', authenticate, authorize('customer'), c.deleteAddress);

module.exports = router;
