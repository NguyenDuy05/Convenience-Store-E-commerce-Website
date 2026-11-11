const { Order, User, MembershipTier, PointHistory } = require('../models');
const POINT_UNIT = 10000;
// Số điểm của một số tiền (10.000 ₫ = 1 điểm, làm tròn xuống)
exports.pointsFor = amount => Math.floor((Number(amount) || 0) / POINT_UNIT);
// Cộng điểm cho đơn đã hoàn tất và đã thanh toán (mỗi đơn một lần) và cập nhật hạng
exports.awardPointsForOrder = async orderId => {
  const order = await Order.findById(orderId).lean();
  if (!order || order.status !== 'completed' || order.paymentStatus !== 'paid' || !order.customerId || order.pointsEarned > 0) return 0;
  const points = exports.pointsFor(order.totalAmount);
  if (!points) return 0;
  try {
    const user = await User.findOneAndUpdate({ _id: order.customerId, role: 'customer', 'membership.earnedOrders.orderId': { $ne: order._id } }, [{ $set: {
      'membership.points': { $add: [{ $ifNull: ['$membership.points', 0] }, points] },
      'membership.lifetimePoints': { $add: [{ $ifNull: ['$membership.lifetimePoints', 0] }, points] },
      'membership.earnedOrders': { $concatArrays: [{ $ifNull: ['$membership.earnedOrders', []] }, [{ orderId: order._id, points, balanceAfter: { $add: [{ $ifNull: ['$membership.points', 0] }, points] } }]] },
    } }], { new: true, updatePipeline: true }).select('+membership.earnedOrders').lean()
      || await User.findById(order.customerId).select('+membership.earnedOrders').lean();
    const reward = user?.membership?.earnedOrders?.find(e => String(e.orderId) === String(order._id));
    if (!reward) return 0;
    await PointHistory.updateOne({ userId: user._id, orderId: order._id, type: 'earn' }, { $setOnInsert: {
      points: reward.points, balanceAfter: reward.balanceAfter, reason: 'Order ' + order.orderCode,
    } }, { upsert: true });
    const tier = await MembershipTier.findOne({ minPoints: { $lte: user.membership.lifetimePoints } }).sort({ minPoints: -1 }).lean();
    if (tier) await User.updateOne({ _id: user._id, 'membership.lifetimePoints': user.membership.lifetimePoints }, { $set: { 'membership.tierId': tier._id } });
    await Order.updateOne({ _id: order._id }, { $set: { pointsEarned: reward.points } });
    return reward.points;
  } catch (err) { console.error('Point accrual failed:', String(orderId), err); return 0; }
};
