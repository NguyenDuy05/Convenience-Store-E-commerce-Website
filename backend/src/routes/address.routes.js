const router = require('express').Router();
const c = require('../controllers/address.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('customer'), c.listAddresses);
router.post('/', authenticate, authorize('customer'), c.addAddress);
router.put('/:id', authenticate, authorize('customer'), c.updateAddress);
router.delete('/:id', authenticate, authorize('customer'), c.deleteAddress);

module.exports = router;
