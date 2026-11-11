const router = require('express').Router();
const c = require('../controllers/workShift.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/my', authenticate, authorize('staff'), c.listMyShifts);
router.post('/clock-in', authenticate, authorize('staff'), c.clockIn);
router.post('/clock-out', authenticate, authorize('staff'), c.clockOut);

router.get('/open', authenticate, authorize('staff'), c.listOpenSlots);
router.post('/slots/:id/claim', authenticate, authorize('staff'), c.claimSlot);
router.post('/:id/release', authenticate, authorize('staff'), c.releaseShift);

router.get('/slots', authenticate, authorize('admin'), c.listSlots);
router.post('/slots', authenticate, authorize('admin'), c.createSlots);
router.put('/slots/:id', authenticate, authorize('admin'), c.updateSlot);
router.delete('/slots/:id', authenticate, authorize('admin'), c.deleteSlot);
router.get('/', authenticate, authorize('admin'), c.listShifts);
router.delete('/:id', authenticate, authorize('admin'), c.deleteShift);
router.patch('/:id/close', authenticate, authorize('admin'), c.closeShift);

module.exports = router;
