const router = require('express').Router();
const c = require('../controllers/membership.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/me', authenticate, authorize('customer'), c.getMyMembership);
router.get('/me/history', authenticate, authorize('customer'), c.getMyPointHistory);
router.get('/lookup', authenticate, authorize('staff', 'admin'), c.lookupMemberCode);
router.get('/members', authenticate, authorize('admin'), c.listMembers);
router.get('/members/:id', authenticate, authorize('admin'), c.getMember);
router.post('/members/:id/points', authenticate, authorize('admin'), c.adjustPoints);
router.get('/tiers', authenticate, authorize('admin'), c.listTiers);
router.post('/tiers', authenticate, authorize('admin'), c.createTier);
router.put('/tiers/:id', authenticate, authorize('admin'), c.updateTier);
router.delete('/tiers/:id', authenticate, authorize('admin'), c.deleteTier);
router.get('/history', authenticate, authorize('admin'), c.listPointHistory);
router.get('/redemptions', authenticate, authorize('admin'), c.listRedemptions);

module.exports = router;
