const mongoose = require('mongoose');
const { runAtomic } = require('../utils/atomic');
const { User, MembershipTier, PointHistory } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

async function findCustomer(id) {
  const user = await User.findOne({ _id: id, role: 'customer', status: 'active' })
    .select('fullName membership').populate('membership.tierId').lean();
  if (!user) throw new ApiError(404, 'Active member not found');
  return user;
}

// UC-12.1: Read points and tier for the authenticated customer.
exports.getMyMembership = asyncHandler(async (req, res) => {
  const user = await findCustomer(req.user.id);
  const points = user.membership?.points ?? 0;
  const lifetimePoints = user.membership?.lifetimePoints ?? 0;
  const tiers = await MembershipTier.find().sort({ minPoints: 1, sortOrder: 1, _id: 1 }).lean();
  const tier = user.membership?.tierId || null;
  const nextTier = tiers.find((item) => item.minPoints > Math.max(lifetimePoints, tier?.minPoints ?? 0)) || null;
  res.json({ fullName: user.fullName, points, lifetimePoints, tier, nextTier,
    pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - lifetimePoints) : 0 });
});

// UC-12.2: Customer point history, newest first.
exports.getMyPointHistory = asyncHandler(async (req, res) => {
  await findCustomer(req.user.id);
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new ApiError(400, 'Invalid pagination (page must be at least 1 and limit must be between 1 and 50)');
  }
  const filter = { userId: req.user.id };
  if (req.query.type !== undefined && req.query.type !== '') {
    if (!['earn', 'redeem', 'adjust'].includes(req.query.type)) throw new ApiError(400, 'Invalid point transaction type');
    filter.type = req.query.type;
  }
  const [items, total] = await Promise.all([
    PointHistory.find(filter).select('type points balanceAfter orderId reason createdAt')
      .populate('orderId', 'orderCode').sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    PointHistory.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
});

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid ID');
  return id;
}
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) throw new ApiError(400, 'Invalid pagination');
  return { page, limit };
}
function memberFilter(query) {
  const filter = { role: 'customer', status: { $ne: 'deleted' } };
  if (query.q) {
    if (typeof query.q !== 'string' || query.q.length > 100) throw new ApiError(400, 'Search must be at most 100 characters');
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['fullName', 'email', 'phone'].map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
  }
  return filter;
}
exports.listMembers = asyncHandler(async (req, res) => {
  const { page, limit } = pagination(req.query);
  const filter = memberFilter(req.query);
  const [items, total] = await Promise.all([
    User.find(filter).select('fullName email phone status membership').populate('membership.tierId')
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
});
exports.getMember = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: validId(req.params.id), role: 'customer', status: { $ne: 'deleted' } })
    .select('fullName email phone status membership createdAt').populate('membership.tierId').lean();
  if (!user) throw new ApiError(404, 'Member not found');
  res.json(user);
});
exports.listTiers = asyncHandler(async (req, res) => {
  const [tiers, counts] = await Promise.all([
    MembershipTier.find().sort({ minPoints: 1, sortOrder: 1 }).lean(),
    User.aggregate([{ $match: { role: 'customer', status: { $ne: 'deleted' } } }, { $group: { _id: '$membership.tierId', count: { $sum: 1 } } }]),
  ]);
  res.json(tiers.map((tier) => ({ ...tier, memberCount: counts.find((row) => String(row._id) === String(tier._id))?.count || 0 })));
});
function tierBody(body) {
  const { name, minPoints, discountPercent = 0, description = '', sortOrder = 0 } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw new ApiError(400, 'Tier name is required (maximum 80 characters)');
  if (!Number.isSafeInteger(minPoints) || minPoints < 0) throw new ApiError(400, 'Minimum points must be a non-negative integer');
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) throw new ApiError(400, 'Discount must be between 0 and 100');
  if (typeof description !== 'string' || description.length > 1000 || !Number.isSafeInteger(sortOrder)) throw new ApiError(400, 'Invalid tier description or sort order');
  return { name: name.trim(), minPoints, discountPercent, description: description.trim(), sortOrder };
}
exports.createTier = asyncHandler(async (req, res) => {
  const tier = await MembershipTier.create(tierBody(req.body));
  res.status(201).json(tier);
});
exports.updateTier = asyncHandler(async (req, res) => {
  const tier = await MembershipTier.findByIdAndUpdate(validId(req.params.id), { $set: tierBody(req.body) }, { new: true, runValidators: true });
  if (!tier) throw new ApiError(404, 'Tier not found');
  res.json(tier);
});
exports.deleteTier = asyncHandler(async (req, res) => {
  const id = validId(req.params.id);
  if (await User.exists({ 'membership.tierId': id })) throw new ApiError(409, 'This tier is assigned to members and cannot be deleted');
  if (!await MembershipTier.findByIdAndDelete(id)) throw new ApiError(404, 'Tier not found');
  res.json({ message: 'Tier deleted' });
});
exports.adjustPoints = asyncHandler(async (req, res) => {
  const id = validId(req.params.id);
  const { points, reason } = req.body;
  if (!Number.isSafeInteger(points) || points === 0) throw new ApiError(400, 'Adjustment must be a non-zero integer');
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000) throw new ApiError(400, 'A reason is required (maximum 1,000 characters)');
  const result = await runAtomic(async ({ session, onRollback }) => {
    const user = await User.findOne({ _id: id, role: 'customer', status: 'active' }).session(session);
    if (!user) throw new ApiError(404, 'Active member not found');
    const balance = user.membership?.points ?? 0;
    const nextBalance = balance + points;
    if (!Number.isSafeInteger(nextBalance) || nextBalance < 0) throw new ApiError(400, 'Adjustment would result in an invalid or negative balance');
    const filter = { _id: id, role: 'customer', status: 'active' };
    filter['membership.points'] = user.membership?.points === undefined ? { $exists: false } : balance;
    const updated = await User.findOneAndUpdate(filter, { $inc: { 'membership.points': points } }, { new: true, session });
    if (!updated) throw new ApiError(409, 'Balance changed. Refresh the member and try again');
    onRollback(() => User.updateOne({ _id: id }, { $inc: { 'membership.points': -points } }));
    const [entry] = await PointHistory.create([{ userId: id, type: 'adjust', points, balanceAfter: nextBalance, reason: reason.trim(), adjustedBy: req.user.id }], { session });
    return { points: nextBalance, history: entry };
  });
  res.json(result);
});
async function adminHistory(req, res, redemptionOnly = false) {
  const { page, limit } = pagination(req.query);
  const filter = {};
  if (req.query.userId) filter.userId = validId(req.query.userId);
  if (redemptionOnly) filter.type = 'redeem';
  else if (req.query.type) {
    if (!['earn', 'redeem', 'adjust'].includes(req.query.type)) throw new ApiError(400, 'Invalid point transaction type');
    filter.type = req.query.type;
  }
  const [items, total] = await Promise.all([
    PointHistory.find(filter).populate('userId', 'fullName email').populate('orderId', 'orderCode').populate('adjustedBy', 'fullName')
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PointHistory.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
}
exports.listPointHistory = asyncHandler((req, res) => adminHistory(req, res));
exports.listRedemptions = asyncHandler((req, res) => adminHistory(req, res, true));
