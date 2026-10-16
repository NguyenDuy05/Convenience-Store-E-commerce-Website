const { notImplemented } = require('../utils/notImplemented');
const { Store } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// UC-31.1 View Stores
exports.listStores = asyncHandler(async (req, res) => {
  const stores = await Store.find();
  res.json(stores);
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.addStore = notImplemented('UC-31.2 Add Store');
exports.updateStore = notImplemented('UC-31.3 Update Store');
exports.closeStore = notImplemented('UC-31.4 Close Store');
exports.openStore = notImplemented('UC-31.5 Open Store');
exports.updateStoreHours = notImplemented('UC-31.6 Update Store Hours');
