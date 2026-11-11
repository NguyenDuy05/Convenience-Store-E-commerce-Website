const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const Wallet = require('../models/Wallet');
const { User } = require('../models');
router.get('/', authenticate, authorize('customer'), asyncHandler(async (req, res) => {
  const page = Math.min(1000000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const limit = 20;
  const userId = new (require('mongoose').Types.ObjectId)(req.user.id);
  const [rows, user] = await Promise.all([
    Wallet.aggregate([{ $match: { userId } }, { $project: {
      balance: 1, total: { $size: '$entries' },
      items: { $slice: [{ $reverseArray: '$entries' }, (page - 1) * limit, limit] },
    } }]), User.findById(userId).select('membership').lean(),
  ]);
  res.json({ balance: rows[0]?.balance || 0, items: rows[0]?.items || [], total: rows[0]?.total || 0,
    page, limit, points: user?.membership?.points || 0, pointsPerVnd: 10000 });
}));
// Rút tiền từ ví về ngân hàng: khách gửi yêu cầu, admin chuyển khoản rồi xác nhận
const w = require('../controllers/withdrawal.controller');
router.post('/withdrawals', authenticate, authorize('customer'), w.requestWithdrawal);
router.get('/withdrawals', authenticate, authorize('customer'), w.listMyWithdrawals);
router.get('/admin/withdrawals', authenticate, authorize('admin'), w.listWithdrawals);
router.patch('/admin/withdrawals/:id', authenticate, authorize('admin'), w.processWithdrawal);
module.exports = router;
