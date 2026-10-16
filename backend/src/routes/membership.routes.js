const router = require('express').Router();
const c = require('../controllers/membership.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-12.1 View Membership Points
router.get('/me', authenticate, authorize('customer'), c.getMyMembership);
// UC-12.2 View Point History
router.get('/me/history', authenticate, authorize('customer'), c.getMyPointHistory);
// UC-39.1, 39.2 View / Search Members
router.get('/members', authenticate, authorize('admin'), c.listMembers);
// UC-39.3 View Member Details
router.get('/members/:id', authenticate, authorize('admin'), c.getMember);
// UC-39.5 Adjust Membership Points
router.post('/members/:id/points', authenticate, authorize('admin'), c.adjustPoints);
// UC-39.4 Manage Membership Tiers (xem)
router.get('/tiers', authenticate, authorize('admin'), c.listTiers);
// UC-39.4 Manage Membership Tiers (thêm)
router.post('/tiers', authenticate, authorize('admin'), c.createTier);
// UC-39.4 Manage Membership Tiers (sửa)
router.put('/tiers/:id', authenticate, authorize('admin'), c.updateTier);
// UC-39.4 Manage Membership Tiers (xóa)
router.delete('/tiers/:id', authenticate, authorize('admin'), c.deleteTier);
// UC-39.6 View Point History
router.get('/history', authenticate, authorize('admin'), c.listPointHistory);
// UC-39.7 View Redemption History
router.get('/redemptions', authenticate, authorize('admin'), c.listRedemptions);

module.exports = router;
