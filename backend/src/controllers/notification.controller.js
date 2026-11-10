const mongoose = require('mongoose');
const { Notification, NotificationReceipt, NotificationSettings } = require('../models');
const service = require('../services/inAppNotification.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const TYPES = ['general', 'order', 'payment', 'event', 'voucher', 'promotion'];
const validId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const visible = (user, now = new Date()) => ({
  status: 'published', publishedAt: { $lte: now },
  $and: [
    { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
    { $or: [{ audience: 'all' }, { audience: user.role }, { audience: 'users', recipientIds: user.id }] },
  ],
});
const pageOf = (query) => {
  const page = Number(query.page || 1), limit = Number(query.limit || 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, "Invalid page or page size");
  return { page, limit };
};
const publicItem = (item, readAt) => ({
  _id: item._id, title: item.title, message: item.message, type: item.type,
  link: item.link, publishedAt: item.publishedAt, expiresAt: item.expiresAt, readAt: readAt || null,
});

exports.listMine = asyncHandler(async (req, res) => {
  const { page, limit } = pageOf(req.query);
  if (req.query.type && !TYPES.includes(req.query.type)) throw new ApiError(400, "Invalid notification type");
  if (req.query.unread !== undefined && !['true', 'false'].includes(req.query.unread)) throw new ApiError(400, "Invalid unread filter");
  const receipts = await NotificationReceipt.find({ userId: req.user.id }).select('notificationId readAt').lean();
  const read = new Map(receipts.map((r) => [String(r.notificationId), r.readAt]));
  const base = visible(req.user);
  const unreadFilter = { ...base, _id: { $nin: [...read.keys()] } };
  const filter = { ...base, ...(req.query.unread === 'true' ? { _id: unreadFilter._id } : {}), ...(req.query.type ? { type: req.query.type } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ publishedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter), Notification.countDocuments(unreadFilter),
  ]);
  res.json({ items: items.map((item) => publicItem(item, read.get(String(item._id)))), total, unreadCount, page, limit });
});

exports.readOne = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found");
  const item = await Notification.findOne({ ...visible(req.user), _id: req.params.id }).lean();
  if (!item) throw new ApiError(404, "Notification not found");
  const receipt = await NotificationReceipt.findOneAndUpdate(
    { userId: req.user.id, notificationId: item._id }, { $setOnInsert: { readAt: new Date() } }, { upsert: true, new: true },
  );
  res.json(publicItem(item, receipt.readAt));
});

exports.readAll = asyncHandler(async (req, res) => {
  const items = await Notification.find(visible(req.user)).select('_id').lean();
  if (items.length) await NotificationReceipt.bulkWrite(items.map((item) => ({ updateOne: {
    filter: { userId: new mongoose.Types.ObjectId(req.user.id), notificationId: item._id },
    update: { $setOnInsert: { readAt: new Date() } }, upsert: true,
  } })));
  res.json({ message: "All notifications marked as read" });
});

function fields(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!title || title.length > 160 || !message || message.length > 4000) throw new ApiError(400, "Enter a title (up to 160 characters) and message (up to 4000 characters)");
  if (!['all', 'customer', 'staff', 'admin'].includes(body.audience)) throw new ApiError(400, "Invalid recipient audience");
  if (!['general', 'event', 'voucher', 'promotion'].includes(body.type)) throw new ApiError(400, "Invalid notification type");
  const link = typeof body.link === 'string' ? body.link.trim() : '';
  if (link && (link.length > 500 || !/^\/(?!\/)[^\\\s]*$/.test(link) || /[\x00-\x1f]/.test(link))) throw new ApiError(400, "Use a relative website path, such as /promotions");
  const date = (value) => { const d = new Date(value); if (!Number.isFinite(+d)) throw new ApiError(400, "Invalid date or time"); return d; };
  const publishedAt = body.publishedAt ? date(body.publishedAt) : new Date();
  const expiresAt = body.expiresAt ? date(body.expiresAt) : null;
  if (expiresAt && expiresAt <= publishedAt) throw new ApiError(400, "Expiry must be after publication");
  return { title, message, audience: body.audience, type: body.type, link, publishedAt, expiresAt };
}

exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit } = pageOf(req.query);
  const filter = {};
  if (req.query.status) {
    if (!['draft', 'published', 'archived'].includes(req.query.status)) throw new ApiError(400, "Invalid status");
    filter.status = req.query.status;
  }
  if (req.query.audience) {
    if (!['all', 'customer', 'staff', 'admin', 'users'].includes(req.query.audience)) throw new ApiError(400, "Invalid audience");
    filter.audience = req.query.audience;
  }
  if (req.query.q) {
    if (typeof req.query.q !== 'string' || req.query.q.length > 100) throw new ApiError(400, "Invalid search query");
    const q = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: q }, { message: q }];
  }
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Notification.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});
exports.create = asyncHandler(async (req, res) => {
  const item = await Notification.create({ ...fields(req.body), status: 'draft', createdBy: req.user.id });
  res.status(201).json(item);
});
exports.update = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found");
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, status: 'draft' }, { $set: fields(req.body) }, { new: true, runValidators: true });
  if (!item) throw new ApiError(409, "Only draft notifications can be edited");
  res.json(item);
});
exports.publish = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found");
  const now = new Date();
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, status: 'draft', $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    [{ $set: { status: 'published', publishedAt: { $cond: [{ $gt: ['$publishedAt', now] }, '$publishedAt', now] } } }],
    { new: true },
  );
  if (!item) throw new ApiError(409, "This notification is already published, archived or expired");
  res.json(item);
});
exports.archive = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) throw new ApiError(404, "Notification not found");
  const item = await Notification.findByIdAndUpdate(req.params.id, { $set: { status: 'archived' } }, { new: true });
  if (!item) throw new ApiError(404, "Notification not found");
  res.json(item);
});
exports.getSettings = asyncHandler(async (req, res) => res.json(await service.getSettings()));
exports.saveSettings = asyncHandler(async (req, res) => {
  const changes = {};
  for (const key of Object.keys(service.DEFAULTS)) if (Object.hasOwn(req.body || {}, key)) {
    if (typeof req.body[key] !== 'boolean') throw new ApiError(400, "Settings must be true or false");
    changes[key] = req.body[key];
  }
  if (!Object.keys(changes).length) throw new ApiError(400, "No notification settings were provided");
  await NotificationSettings.findByIdAndUpdate('global', { $set: changes }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json(await service.getSettings());
});
