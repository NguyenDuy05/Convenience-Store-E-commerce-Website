const mongoose = require('mongoose');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const MAX_ADDRESSES = 10;
const PHONE_RE = /^(\+?84|0)\d{9,10}$/;

const sortAddresses = (addresses) =>
  [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

async function loadCustomer(userId) {
  const user = await User.findById(userId);
  if (!user || user.status === 'deleted') throw new ApiError(404, 'Account not found');
  return user;
}

// Validate + normalize body. partial=true is not used: PUT replaces all editable fields.
function parseBody(body = {}) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const label = str(body.label);
  const receiverName = str(body.receiverName);
  const phone = str(body.phone).replace(/[\s.-]/g, '');
  const addressLine = str(body.addressLine);

  if (!receiverName) throw new ApiError(400, 'Receiver name is required');
  if (receiverName.length > 100) throw new ApiError(400, 'Receiver name must be 100 characters or fewer');
  if (!phone) throw new ApiError(400, 'Phone number is required');
  if (!PHONE_RE.test(phone)) throw new ApiError(400, 'Phone number is invalid');
  if (!addressLine) throw new ApiError(400, 'Address is required');
  if (addressLine.length > 255) throw new ApiError(400, 'Address must be 255 characters or fewer');
  if (label.length > 50) throw new ApiError(400, 'Label must be 50 characters or fewer');

  return { label, receiverName, phone, addressLine, isDefault: body.isDefault === true };
}

function findAddress(user, id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid address ID');
  const address = user.addresses.id(id);
  if (!address) throw new ApiError(404, 'Address not found');
  return address;
}

// UC-07.1 View Addresses
exports.listAddresses = asyncHandler(async (req, res) => {
  const user = await loadCustomer(req.user.id);
  res.json(sortAddresses(user.addresses.map((a) => a.toObject())));
});

// UC-07.2 Add Address
exports.addAddress = asyncHandler(async (req, res) => {
  const data = parseBody(req.body);
  const user = await loadCustomer(req.user.id);
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new ApiError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  }
  // The first address is always the default one.
  const makeDefault = data.isDefault || user.addresses.length === 0;
  if (makeDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  user.addresses.push({ ...data, isDefault: makeDefault });
  await user.save();
  res.status(201).json(user.addresses[user.addresses.length - 1]);
});

// UC-07.3 Update Address
exports.updateAddress = asyncHandler(async (req, res) => {
  const data = parseBody(req.body);
  const user = await loadCustomer(req.user.id);
  const address = findAddress(user, req.params.id);

  // Can't un-default the current default directly: set another address as default instead.
  const makeDefault = data.isDefault || address.isDefault;
  if (makeDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  address.set({ ...data, isDefault: makeDefault });
  await user.save();
  res.json(address);
});

// UC-07.4 Delete Address
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await loadCustomer(req.user.id);
  const address = findAddress(user, req.params.id);
  const wasDefault = address.isDefault;
  address.deleteOne();
  // Promote the first remaining address when the default one is removed.
  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
  await user.save();
  res.json({ message: 'Address deleted' });
});
