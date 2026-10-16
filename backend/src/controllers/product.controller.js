const { notImplemented } = require('../utils/notImplemented');
const { Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const canManage = (req) => !!req.user && ['staff', 'admin'].includes(req.user.role);

// UC-02.1/02.3, 18.1/18.2, 32.1/32.2 View / Search Products
// Khách: chỉ thấy sản phẩm active. Staff/Admin: thấy mọi sản phẩm chưa xóa (lọc thêm bằng ?status=)
exports.listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
  const { q, categoryId, status } = req.query;

  const filter = {};
  if (canManage(req)) filter.status = status || { $ne: 'deleted' };
  else filter.status = 'active';
  if (categoryId) filter.categoryId = categoryId;
  if (q) filter.$text = { $search: q };          // dùng text index trên Product.name

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

// UC-02.2, 18.3, 32.3 View Product Details
exports.getProduct = asyncHandler(async (req, res) => {
  const status = canManage(req) ? { $ne: 'deleted' } : 'active';
  const product = await Product.findOne({ _id: req.params.id, status }).populate('categoryId', 'name');
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm');
  res.json(product);
});

// ---- Chưa triển khai: thay từng dòng bằng code thật ----
exports.createProduct = notImplemented('UC-18.4, 32.4 Add Product');
exports.updateProduct = notImplemented('UC-18.5, 32.5 Update Product');
exports.updateProductPrice = notImplemented('UC-32.6 Update Product Price');
exports.activateProduct = notImplemented('UC-32.8 Activate Product');
exports.deactivateProduct = notImplemented('UC-32.9 Deactivate Product');
exports.deleteProduct = notImplemented('UC-18.6, 32.7 Delete Product');
