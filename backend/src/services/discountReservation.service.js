const mongoose = require('mongoose');
const { DiscountCode, Order } = require('../models');
const ApiError = require('../utils/ApiError');

// Giữ một lượt dùng mã giảm giá cho đơn (chặn vượt tổng lượt và lượt mỗi khách)
async function reserve(codeId, userId, orderId, { session } = {}) {
  const opts = session ? { session } : {};
  const customerId = new mongoose.Types.ObjectId(String(userId));
  const legacyCount = await Order.countDocuments({ customerId, 'discountCode.codeId': codeId,
    status: { $nin: ['cancelled', 'failed'] }, discountReservationVersion: { $ne: 1 },
  }).session(session || null);
  const now = new Date();
  const code = await DiscountCode.findOneAndUpdate({
    _id: codeId, status: 'active', startDate: { $lte: now }, endDate: { $gte: now },
    $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }, { assignedTo: customerId }],
    'allocations.orderId': { $ne: orderId },
    $expr: { $and: [
      { $lt: [{ $ifNull: ['$usedCount', 0] }, { $ifNull: ['$usageLimit', Number.MAX_SAFE_INTEGER] }] },
      { $lt: [{ $add: [legacyCount, { $size: { $filter: { input: { $ifNull: ['$allocations', []] }, as: 'claim', cond: { $eq: ['$$claim.userId', customerId] } } } }] }, { $ifNull: ['$perUserLimit', 1] }] },
    ] },
  }, { $inc: { usedCount: 1 }, $push: { allocations: { orderId, userId: customerId } } }, { new: true, ...opts });
  if (!code) throw new ApiError(409, 'This discount code reached its usage limit or is no longer available. Please review checkout.', { code: 'INVALID_DISCOUNT_CODE' });
}

// Trả lại lượt dùng mã giảm giá khi đơn bị hủy / hết hạn
async function release(order, { session } = {}) {
  if (!order.discountCode?.codeId) return;
  const opts = session ? { session } : {};
  if (order.discountReservationVersion === 1) {
    await DiscountCode.updateOne({ _id: order.discountCode.codeId, 'allocations.orderId': order._id }, {
      $pull: { allocations: { orderId: order._id } }, $inc: { usedCount: -1 },
    }, opts);
    return;
  }
  const claimed = await Order.findOneAndUpdate({ _id: order._id, discountReleasedAt: { $exists: false } }, { $set: { discountReleasedAt: new Date() } }, { new: true, ...opts });
  if (!claimed) return;
  try { await DiscountCode.updateOne({ _id: order.discountCode.codeId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, opts); }
  catch (error) { if (!session) await Order.updateOne({ _id: order._id }, { $unset: { discountReleasedAt: '' } }); throw error; }
}

module.exports = { reserve, release };
