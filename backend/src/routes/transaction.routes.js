const router = require('express').Router();
const c = require('../controllers/transaction.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/', authenticate, authorize('staff', 'admin'), c.listTransactions);
router.get('/:id', authenticate, authorize('staff', 'admin'), c.getTransaction);

module.exports = router;
