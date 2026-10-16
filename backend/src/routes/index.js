const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/profile', require('./profile.routes'));
router.use('/addresses', require('./address.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/transactions', require('./transaction.routes'));
router.use('/promotions', require('./promotion.routes'));
router.use('/discount-codes', require('./discountCode.routes'));
router.use('/membership', require('./membership.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/support', require('./support.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/stores', require('./store.routes'));
router.use('/work-shifts', require('./workShift.routes'));

module.exports = router;
