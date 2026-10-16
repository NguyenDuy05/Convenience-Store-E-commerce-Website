const router = require('express').Router();
const c = require('../controllers/transaction.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-24.1, 24.2, 36.1 View / Search Transactions
router.get('/', authenticate, authorize('staff', 'admin'), c.listTransactions);
// UC-24.3, 36.2 View Transaction Details
router.get('/:id', authenticate, authorize('staff', 'admin'), c.getTransaction);

module.exports = router;
