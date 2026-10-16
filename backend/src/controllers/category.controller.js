const { notImplemented } = require('../utils/notImplemented');
const { Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// UC-33.1 View Categories
exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: 'active' }).sort({ sortOrder: 1 });
  res.json(categories);
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.createCategory = notImplemented('UC-33.2 Add Category');
exports.updateCategory = notImplemented('UC-33.3 Update Category');
exports.deleteCategory = notImplemented('UC-33.4 Delete Category');
