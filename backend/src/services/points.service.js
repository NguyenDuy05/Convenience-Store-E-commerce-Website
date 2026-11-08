// Tích điểm thành viên khi khách nhận hàng (đơn chuyển sang completed). Quy ước: 1 điểm cho mỗi 10.000đ của đơn.
// An toàn khi gọi lặp: chỉ đơn có pointsEarned = 0 mới được cộng (điều kiện cập nhật), nên một đơn không bao giờ cộng hai lần.
const { Order, User, MembershipTier, PointHistory } = require('../models');

const POINT_UNIT = 10000;

exports.pointsFor = (amount) => Math.floor((Number(amount) || 0) / POINT_UNIT);

exports.awardPointsForOrder = async (orderId) => {
  const order = await Order.findById(orderId).lean();
  if (!order || order.status !== 'completed' || !order.customerId) return 0;
  const points = exports.pointsFor(order.totalAmount);
  if (points <= 0) return 0;
  const claimed = await Order.findOneAndUpdate({ _id: order._id, pointsEarned: { $in: [0, null] } }, { $set: { pointsEarned: points } });
  if (!claimed) return 0;
  try {
    const user = await User.findOneAndUpdate(
      { _id: order.customerId, role: 'customer' },
      { $inc: { 'membership.points': points, 'membership.lifetimePoints': points } },
      { new: true },
    );
    if (!user) throw new Error('Customer not found');
    const tier = await MembershipTier.findOne({ minPoints: { $lte: user.membership.lifetimePoints } }).sort({ minPoints: -1 }).lean();
    if (tier && String(user.membership.tierId) !== String(tier._id)) await User.updateOne({ _id: user._id }, { $set: { 'membership.tierId': tier._id } });
    await PointHistory.create({ userId: user._id, type: 'earn', points, balanceAfter: user.membership.points, orderId: order._id, reason: `Order ${order.orderCode}` });
    return points;
  } catch (err) {
    await Order.updateOne({ _id: order._id }, { $set: { pointsEarned: 0 } });   // hoàn tác để lần sau thử lại
    console.error('Tích điểm lỗi:', String(order._id), err);
    return 0;
  }
};
