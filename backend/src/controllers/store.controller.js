const mongoose = require('mongoose');
const { Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../services/activity.service');

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const defaultHours = () => Array.from({ length: 7 }, (_, day) => ({ day, openTime: '07:00', closeTime: '22:00', isClosed: false }));

async function loadStore(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Store not found');
  const s = await Store.findById(id);
  if (!s) throw new ApiError(404, 'Store not found');
  return s;
}

function parseBasics(body = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(body.name);
  const address = str(body.address);
  const phone = str(body.phone).replace(/[\s.-]/g, '');
  if (!name) throw new ApiError(400, 'Store name is required');
  if (name.length > 120) throw new ApiError(400, 'Store name must be 120 characters or fewer');
  if (!address) throw new ApiError(400, 'Address is required');
  if (address.length > 255) throw new ApiError(400, 'Address must be 255 characters or fewer');
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Phone number is invalid');
  return { name, address, phone: phone || undefined };
}

function parseHours(hours) {
  if (!Array.isArray(hours) || hours.length !== 7) throw new ApiError(400, 'Opening hours must include all 7 days');
  const seen = new Set();
  return hours.map((h) => {
    const day = Number(h?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) throw new ApiError(400, 'Opening hours contain an invalid or duplicate day');
    seen.add(day);
    if (h.isClosed === true) return { day, isClosed: true };
    if (!TIME_RE.test(h.openTime || '') || !TIME_RE.test(h.closeTime || '')) throw new ApiError(400, 'Opening and closing times must be in HH:MM format');
    if (h.openTime >= h.closeTime) throw new ApiError(400, 'Closing time must be later than opening time');
    return { day, openTime: h.openTime, closeTime: h.closeTime, isClosed: false };
  }).sort((a, b) => a.day - b.day);
}

// UC-31.1 View Stores
exports.listStores = asyncHandler(async (req, res) => {
  const stores = await Store.find().sort({ createdAt: 1 });
  res.json(stores);
});

// UC-31.2 Add Store
exports.addStore = asyncHandler(async (req, res) => {
  const data = parseBasics(req.body);
  const hours = req.body?.openingHours ? parseHours(req.body.openingHours) : defaultHours();
  const store = await Store.create({ ...data, openingHours: hours });
  await logActivity(req, { action: 'STORE_ADD', targetType: 'Store', targetId: store._id, detail: { name: store.name } });
  res.status(201).json(store);
});

// UC-31.3 Update Store
exports.updateStore = asyncHandler(async (req, res) => {
  const store = await loadStore(req.params.id);
  Object.assign(store, parseBasics(req.body));
  await store.save();
  await logActivity(req, { action: 'STORE_UPDATE', targetType: 'Store', targetId: store._id });
  res.json(store);
});

// UC-31.4 Close Store
exports.closeStore = asyncHandler(async (req, res) => {
  const store = await loadStore(req.params.id);
  if (store.status === 'closed') throw new ApiError(409, 'This store is already closed');
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
  store.status = 'closed';
  store.closedReason = reason || undefined;
  await store.save();
  await logActivity(req, { action: 'STORE_CLOSE', targetType: 'Store', targetId: store._id, detail: { reason } });
  res.json(store);
});

// UC-31.5 Open Store
exports.openStore = asyncHandler(async (req, res) => {
  const store = await loadStore(req.params.id);
  if (store.status === 'open') throw new ApiError(409, 'This store is already open');
  store.status = 'open';
  store.closedReason = undefined;
  await store.save();
  await logActivity(req, { action: 'STORE_OPEN', targetType: 'Store', targetId: store._id });
  res.json(store);
});

// UC-31.6 Update Store Hours. body: { openingHours: [{ day, openTime, closeTime, isClosed }] x 7 }
exports.updateStoreHours = asyncHandler(async (req, res) => {
  const store = await loadStore(req.params.id);
  store.openingHours = parseHours(req.body?.openingHours);
  await store.save();
  await logActivity(req, { action: 'STORE_HOURS_UPDATE', targetType: 'Store', targetId: store._id });
  res.json(store);
});
