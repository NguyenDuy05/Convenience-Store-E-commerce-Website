const Wallet = require('../models/Wallet');
const { Order, Transaction } = require('../models');
const ApiError = require('../utils/ApiError');

// Tạo ví cho khách nếu chưa có
async function ensure(userId) {
  try { await Wallet.updateOne({ userId }, { $setOnInsert: { userId, balance: 0, entries: [] } }, { upsert: true }); }
  catch (err) { if (err.code !== 11000) throw err; }
}

// Số dư ví của khách
async function balance(userId) {
  return (await Wallet.findOne({ userId }).lean())?.balance || 0;
}

// Cộng / trừ ví một lần duy nhất theo khóa (không cho âm, không ghi trùng)
async function move(userId, { key, amount, orderId, orderCode, description }, { session } = {}) {
  if (!Number.isSafeInteger(amount) || !amount || !key) throw new Error('Invalid wallet movement');
  if (!session) await ensure(userId);
  const opts = session ? { session } : {};
  const updated = await Wallet.findOneAndUpdate({
    userId, 'entries.key': { $ne: key }, ...(amount < 0 ? { balance: { $gte: -amount } } : {}),
  }, [{ $set: {
    balance: { $add: ['$balance', amount] },
    entries: { $concatArrays: ['$entries', [{
      key: { $literal: key }, amount, balanceAfter: { $add: ['$balance', amount] },
      orderId: { $literal: orderId || null }, orderCode: { $literal: orderCode || '' },
      description: { $literal: description || '' }, createdAt: new Date(),
    }]] }, updatedAt: new Date(),
  } }], { new: true, updatePipeline: true, ...opts }).lean();
  if (updated) return { applied: true, balance: updated.balance };
  const prior = await Wallet.findOne({ userId, 'entries.key': key }, null, opts).select({ balance: 1, entries: { $elemMatch: { key } } }).lean();
  if (prior) {
    if (prior.entries.find(e => e.key === key).amount !== amount) throw new Error('Wallet journal key conflict');
    return { applied: false, balance: prior.balance };
  }
  throw new ApiError(409, 'Your wallet balance changed. Review checkout and try again.', { code: 'WALLET_BALANCE_CHANGED' });
}

// Đơn bị hủy / hết hạn: hoàn tiền ví và tiền đã trả vào ví, đổi giao dịch sang Refunded
async function settleClosedOrder(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order?.customerId || !['cancelled', 'failed'].includes(order.status)) return 0;
  let refunded = 0;
  const debit = await Wallet.findOne({ userId: order.customerId, 'entries.key': `pay:${order._id}` }).select({ entries: { $elemMatch: { key: `pay:${order._id}` } } }).lean();
  const used = -(debit?.entries.find(e => e.key === `pay:${order._id}`)?.amount || 0);
  const reason = order.cancelReason || 'Payment deadline expired / late payment';
  const markRefunded = (filter, amount) => Transaction.updateMany({ ...filter, orderId, status: 'success' }, {
    $set: { status: 'refunded', refund: { amount, method: 'wallet', reason, refundedAt: new Date() } },
  });
  if (used > 0) {
    await move(order.customerId, { key: `return:${order._id}`, amount: used, orderId: order._id, orderCode: order.orderCode, description: 'Wallet payment returned' });
    await markRefunded({ method: 'wallet' }, used);
    refunded += used;
  }
  const txns = await Transaction.find({ orderId, status: 'success', method: { $ne: 'wallet' } }).lean();
  for (const txn of txns) {
    await move(order.customerId, { key: `refund:${txn._id}`, amount: txn.amount, orderId: order._id, orderCode: order.orderCode, description: 'Order refund to wallet' });
    await markRefunded({ _id: txn._id }, txn.amount);
    refunded += txn.amount;
  }
  if (refunded) await Order.updateOne({ _id: orderId, status: { $in: ['cancelled', 'failed'] } }, { $set: {
    paymentStatus: 'refunded', 'refund.method': 'wallet',
    'refund.reason': order.cancelReason || 'Payment deadline expired / late payment',
    'refund.refundedAt': order.refund?.refundedAt || new Date(),
  }, $max: { 'refund.amount': refunded } });
  return refunded;
}

// Đối soát các đơn đã đóng: trả kho, trả mã giảm giá, hoàn ví (chạy khi khởi động)
async function reconcile() {
  const orders = await Order.find({ customerId: { $exists: true }, status: { $in: ['cancelled', 'failed'] }, walletPolicy: true,
  }).lean();
  for (const order of orders) {
    await require('./stock.service').releaseStock(order._id);
    if (order.discountReservationVersion === 1) await require('./discountReservation.service').release(order);
    await settleClosedOrder(order._id);
  }
}

module.exports = { ensure, balance, move, settleClosedOrder, reconcile };
